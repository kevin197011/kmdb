package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/kmdb/kmdb/service"
)

// contains 检查字符串是否包含子字符串（不区分大小写）
func contains(s, substr string) bool {
	return strings.Contains(strings.ToUpper(s), strings.ToUpper(substr))
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 生产环境应验证来源
	},
}

type WebSSHHandler struct {
	websshService        service.WebSSHService
	credentialService    service.AssetCredentialService
}

func NewWebSSHHandler(websshService service.WebSSHService, credentialService service.AssetCredentialService) *WebSSHHandler {
	return &WebSSHHandler{
		websshService:     websshService,
		credentialService: credentialService,
	}
}

type ConnectRequest struct {
	AssetID      string  `json:"asset_id" binding:"required"`
	Username     string  `json:"username"`
	Password     string  `json:"password"`
	CredentialID *string `json:"credential_id,omitempty"`
	Cols         int     `json:"cols,omitempty"` // 终端列数
	Rows         int     `json:"rows,omitempty"` // 终端行数
}

// Connect 建立 WebSSH 连接
// @Summary 建立 WebSSH 连接
// @Tags webssh
// @Accept json
// @Produce json
// @Param request body ConnectRequest true "连接信息"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/webssh/connect [post]
func (h *WebSSHHandler) Connect(c *gin.Context) {
	var req ConnectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	assetID, err := uuid.Parse(req.AssetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var username, password, privateKey string
	var credentialID *uuid.UUID
	var authType string

	// 如果提供了凭证ID，从凭证获取信息
	if req.CredentialID != nil && *req.CredentialID != "" {
		credID, err := uuid.Parse(*req.CredentialID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential ID"})
			return
		}

		credential, err := h.credentialService.GetCredentialForConnection(credID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "凭证不存在或无法访问"})
			return
		}

		username = credential.Username
		authType = credential.AuthType
		credentialID = &credID

		// 根据认证类型处理
		if credential.AuthType == "password" {
			// 密码认证：使用凭证中的密码，或用户提供的密码（如果凭证密码为空）
			if credential.Password != nil && *credential.Password != "" {
				decrypted, err := h.credentialService.DecryptPassword(*credential.Password)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "解密密码失败"})
					return
				}
				password = decrypted
			} else if req.Password != "" {
				// 如果凭证没有密码，使用用户输入的密码
				password = req.Password
			}
		} else if credential.AuthType == "key" {
			// 密钥认证：解密私钥
			if credential.PrivateKey == nil || *credential.PrivateKey == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "凭证缺少私钥，请重新设置私钥"})
				return
			}

			// 检查加密后的私钥长度（加密后的私钥应该比较长）
			encryptedKeyLen := len(*credential.PrivateKey)
			if encryptedKeyLen < 50 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "私钥数据异常，可能已损坏（长度: " + fmt.Sprintf("%d", encryptedKeyLen) + "）"})
				return
			}

			decrypted, err := h.credentialService.DecryptPassword(*credential.PrivateKey)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "解密私钥失败: " + err.Error()})
				return
			}

			// 验证解密后的私钥格式
			if len(decrypted) == 0 {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "解密后的私钥为空"})
				return
			}

			// 检查解密后的私钥长度（RSA 私钥通常至少几百字符）
			if len(decrypted) < 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("私钥长度异常（%d 字符），可能已损坏", len(decrypted))})
				return
			}

			// 确保私钥包含必要的标记
			if !contains(decrypted, "BEGIN") || !contains(decrypted, "END") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "私钥格式不正确，缺少 BEGIN/END 标记，可能已损坏"})
				return
			}

			privateKey = decrypted
			password = "" // 密钥认证不需要密码

			// 如果有密钥密码，也解密
			if credential.Passphrase != nil && *credential.Passphrase != "" {
				decryptedPassphrase, err := h.credentialService.DecryptPassword(*credential.Passphrase)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "解密密钥密码失败"})
					return
				}
				// 将 passphrase 存储在 password 字段中，service 层会使用它
				password = decryptedPassphrase
			}
		}
	} else {
		// 手动输入模式
		if req.Username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
			return
		}
		username = req.Username
		password = req.Password
		privateKey = "" // 手动输入模式不使用密钥
		authType = "password" // 默认密码认证
	}

	// 获取终端尺寸，默认 80x24
	cols := req.Cols
	rows := req.Rows
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	sessionID, err := h.websshService.CreateSession(assetID, username, password, privateKey, credentialID, authType, userID.(uuid.UUID), cols, rows)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"ws_url":     "/api/v1/webssh/ws/" + sessionID,
	})
}

// WebSocket 处理 WebSSH WebSocket 连接
// @Summary WebSSH WebSocket 连接
// @Tags webssh
// @Param session_id path string true "会话ID"
// @Router /api/v1/webssh/ws/{session_id} [get]
func (h *WebSSHHandler) WebSocket(c *gin.Context) {
	sessionID := c.Param("session_id")

	// 升级到 WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// 获取会话
	session, err := h.websshService.GetSession(sessionID)
	if err != nil {
		conn.WriteJSON(gin.H{"error": err.Error()})
		return
	}

	// 启动 goroutine 读取 SSH 输出并发送到 WebSocket
	// 优化：对于交互式命令（如 top），需要立即发送数据以保持控制序列完整性
	go func() {
		buffer := make([]byte, 4096) // 增大缓冲区到 4KB
		var pendingData []byte
		var pendingMux sync.Mutex // 保护 pendingData
		flushTimer := time.NewTicker(8 * time.Millisecond) // 提高刷新率到约 120fps，减少延迟
		defer flushTimer.Stop()

		// 定期刷新缓冲区
		flushDone := make(chan bool)
		go func() {
			for {
				select {
				case <-flushTimer.C:
					pendingMux.Lock()
					if len(pendingData) > 0 {
						data := make([]byte, len(pendingData))
						copy(data, pendingData)
						pendingData = pendingData[:0] // 清空缓冲区
						pendingMux.Unlock()
						conn.WriteMessage(websocket.BinaryMessage, data)
					} else {
						pendingMux.Unlock()
					}
				case <-flushDone:
					return
				}
			}
		}()

		for {
			n, err := session.StdoutPipe.Read(buffer)
			if err != nil {
				// 发送剩余数据
				pendingMux.Lock()
				if len(pendingData) > 0 {
					data := make([]byte, len(pendingData))
					copy(data, pendingData)
					pendingData = pendingData[:0]
					pendingMux.Unlock()
					conn.WriteMessage(websocket.BinaryMessage, data)
				} else {
					pendingMux.Unlock()
				}
				close(flushDone)
				break
			}

			// 累积数据，批量发送以减少 WebSocket 消息数量
			// 对于包含控制字符的数据立即发送，避免破坏控制序列
			pendingMux.Lock()
			pendingData = append(pendingData, buffer[:n]...)
			dataLen := len(pendingData)

			// 检查是否包含控制字符（ANSI escape sequences, CR, LF等）
			hasControlChars := false
			for i := 0; i < dataLen && i < 100; i++ { // 只检查前100字节以提高性能
				b := pendingData[i]
				if b < 32 && b != 9 && b != 10 && b != 13 { // 控制字符（排除 TAB, LF, CR）
					hasControlChars = true
					break
				}
				if b == 27 { // ESC 字符，可能是 ANSI 序列的开始
					hasControlChars = true
					break
				}
			}

			// 小数据包或包含控制字符的数据立即发送，大数据包批量发送
			shouldFlush := hasControlChars || dataLen >= 256 || dataLen >= 2048
			var flushData []byte
			if shouldFlush {
				flushData = make([]byte, dataLen)
				copy(flushData, pendingData)
				pendingData = pendingData[:0] // 清空缓冲区
			}
			pendingMux.Unlock()

			// 立即发送包含控制字符的数据或达到阈值的大数据包
			if shouldFlush {
				if err := conn.WriteMessage(websocket.BinaryMessage, flushData); err != nil {
					close(flushDone)
					break
				}
			}
		}
	}()

	// 读取 WebSocket 消息并写入 SSH 输入
	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if messageType == websocket.TextMessage {
			// 尝试解析 JSON 消息（可能是 resize 命令）
			var msg map[string]interface{}
			if err := json.Unmarshal(data, &msg); err == nil {
				if msgType, ok := msg["type"].(string); ok && msgType == "resize" {
					// 处理终端大小调整（WindowChange 参数顺序：height, width）
					if cols, ok := msg["cols"].(float64); ok {
						if rows, ok := msg["rows"].(float64); ok {
							if err := h.websshService.ResizeSession(sessionID, int(rows), int(cols)); err != nil {
								break
							}
							continue
						}
					}
				}
			}
			// 处理终端输入（普通文本）
			if err := h.websshService.WriteToSession(sessionID, data); err != nil {
				break
			}
		} else if messageType == websocket.BinaryMessage {
			// 处理二进制消息（直接作为终端输入）
			if err := h.websshService.WriteToSession(sessionID, data); err != nil {
				break
			}
		}
	}

	// 关闭会话
	h.websshService.CloseSession(sessionID)
}

// Resize 调整终端大小
// @Summary 调整终端大小
// @Tags webssh
// @Produce json
// @Param session_id path string true "会话ID"
// @Param width query int true "宽度"
// @Param height query int true "高度"
// @Success 200 {object} map[string]string
// @Router /api/v1/webssh/{session_id}/resize [post]
func (h *WebSSHHandler) Resize(c *gin.Context) {
	sessionID := c.Param("session_id")

	width, _ := strconv.Atoi(c.Query("width"))
	height, _ := strconv.Atoi(c.Query("height"))

	if width <= 0 || height <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid width or height"})
		return
	}

	// ResizeSession 参数顺序: height, width
	if err := h.websshService.ResizeSession(sessionID, height, width); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Terminal resized"})
}

// Close 关闭会话
// @Summary 关闭 WebSSH 会话
// @Tags webssh
// @Produce json
// @Param session_id path string true "会话ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/webssh/{session_id} [delete]
func (h *WebSSHHandler) Close(c *gin.Context) {
	sessionID := c.Param("session_id")

	if err := h.websshService.CloseSession(sessionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session closed"})
}

