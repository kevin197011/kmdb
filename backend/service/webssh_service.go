package service

import (
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/repository"
	"golang.org/x/crypto/ssh"
)

// contains 检查字符串是否包含子字符串（不区分大小写）
func contains(s, substr string) bool {
	return strings.Contains(strings.ToUpper(s), strings.ToUpper(substr))
}

type WebSSHService interface {
	CreateSession(assetID uuid.UUID, username, password, privateKey string, credentialID *uuid.UUID, authType string, userID uuid.UUID, cols, rows int) (string, error)
	GetSession(sessionID string) (*SSHSession, error)
	CloseSession(sessionID string) error
	WriteToSession(sessionID string, data []byte) error
	ReadFromSession(sessionID string) ([]byte, error)
	ResizeSession(sessionID string, height, width int) error
	CleanupInactiveSessions()
}

type SSHSession struct {
	ID         string
	AssetID    uuid.UUID
	UserID     uuid.UUID
	Client     *ssh.Client
	Session    *ssh.Session
	StdinPipe  io.WriteCloser
	StdoutPipe io.Reader
	CreatedAt  time.Time
	LastActive time.Time
}

type websshService struct {
	sessions         map[string]*SSHSession
	sessionsMux      sync.RWMutex
	assetRepo        repository.AssetRepository
	websshHistoryRepo repository.WebSSHHistoryRepository
	auditHook        AuditHook
}

func NewWebSSHService(
	assetRepo repository.AssetRepository,
	websshHistoryRepo repository.WebSSHHistoryRepository,
	auditHook AuditHook,
) WebSSHService {
	service := &websshService{
		sessions:         make(map[string]*SSHSession),
		assetRepo:        assetRepo,
		websshHistoryRepo: websshHistoryRepo,
		auditHook:        auditHook,
	}

	// 启动清理协程
	go service.startCleanupRoutine()

	return service
}

func (s *websshService) CreateSession(assetID uuid.UUID, username, password, privateKey string, credentialID *uuid.UUID, authType string, userID uuid.UUID, cols, rows int) (string, error) {
	// 验证资产存在
	asset, err := s.assetRepo.GetByID(assetID)
	if err != nil {
		return "", fmt.Errorf("资产不存在: %w", err)
	}

	// 从资产元数据获取连接信息（简化处理，实际应该从 metadata JSON 解析）
	// 这里假设 metadata 包含 host 和 port 信息
	// 实际实现中需要解析 JSON

	// 创建 SSH 客户端配置
	var authMethods []ssh.AuthMethod

	if authType == "key" && privateKey != "" {
		// 密钥认证
		// 验证私钥格式
		if len(privateKey) < 100 {
			return "", fmt.Errorf("私钥长度不足，可能已损坏")
		}

		// 确保私钥包含必要的标记
		if !contains(privateKey, "BEGIN") || !contains(privateKey, "END") {
			return "", fmt.Errorf("私钥格式不正确，缺少 BEGIN/END 标记")
		}

		var signer ssh.Signer
		var err error

		// 如果提供了 passphrase（存储在 password 参数中），使用带密码的解析
		if password != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(privateKey), []byte(password))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(privateKey))
		}

		if err != nil {
			// 提供更详细的错误信息
			return "", fmt.Errorf("解析私钥失败: %w (私钥长度: %d 字符)", err, len(privateKey))
		}
		authMethods = []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		}
	} else {
		// 密码认证
		if password == "" {
			return "", fmt.Errorf("密码不能为空")
		}
		authMethods = []ssh.AuthMethod{
			ssh.Password(password),
		}
	}

	config := &ssh.ClientConfig{
		User:            username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 生产环境应验证主机密钥
		Timeout:         10 * time.Second,
	}

	// 从资产 IP 字段获取连接地址
	host := "localhost" // 默认值
	if asset.IP != "" {
		host = asset.IP
	}

	port := asset.SSHPort
	if port == 0 {
		port = 22 // 默认端口
	}

	client, err := ssh.Dial("tcp", fmt.Sprintf("%s:%d", host, port), config)
	if err != nil {
		// 记录登录失败审计
		if s.auditHook != nil {
			_ = s.auditHook.LogCreate("webssh", assetID, userID, map[string]interface{}{
				"action": "connect_failed",
				"error":  err.Error(),
			})
		}
		return "", fmt.Errorf("SSH 连接失败: %w", err)
	}

	// 创建 SSH 会话
	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return "", fmt.Errorf("创建 SSH 会话失败: %w", err)
	}

	// 设置终端模式（标准 xterm 终端模式）
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,     // 启用回显
		ssh.TTY_OP_ISPEED: 14400, // 输入速度
		ssh.TTY_OP_OSPEED: 14400, // 输出速度
	}

	// 使用前端传来的终端尺寸，确保输出正确对齐
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	// RequestPty 参数顺序: term, height, width, modes
	if err := session.RequestPty("xterm-256color", rows, cols, modes); err != nil {
		session.Close()
		client.Close()
		return "", fmt.Errorf("请求 PTY 失败: %w", err)
	}

	// 设置环境变量以支持交互式命令（必须在 RequestPty 之后，Shell 之前）
	session.Setenv("TERM", "xterm-256color")
	session.Setenv("COLORTERM", "truecolor")
	session.Setenv("LANG", "en_US.UTF-8")
	session.Setenv("LC_ALL", "en_US.UTF-8")

	// 获取标准输入输出管道
	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return "", err
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		stdin.Close()
		session.Close()
		client.Close()
		return "", err
	}

	// 启动 shell
	if err := session.Shell(); err != nil {
		stdin.Close()
		session.Close()
		client.Close()
		return "", err
	}

	// 创建会话记录
	sessionID := uuid.New().String()
	sshSession := &SSHSession{
		ID:         sessionID,
		AssetID:    assetID,
		UserID:     userID,
		Client:     client,
		Session:    session,
		StdinPipe:  stdin,
		StdoutPipe: stdout,
		CreatedAt:  time.Now(),
		LastActive: time.Now(),
	}

	s.sessionsMux.Lock()
	s.sessions[sessionID] = sshSession
	s.sessionsMux.Unlock()

	// 记录连接历史
	if s.websshHistoryRepo != nil {
		_ = s.websshHistoryRepo.RecordConnection(userID, assetID)
	}

	// 记录登录审计
	if s.auditHook != nil {
		_ = s.auditHook.LogCreate("webssh", assetID, userID, map[string]interface{}{
			"action":     "connect",
			"session_id": sessionID,
			"asset_name": asset.Name,
		})
	}

	return sessionID, nil
}

func (s *websshService) GetSession(sessionID string) (*SSHSession, error) {
	s.sessionsMux.RLock()
	defer s.sessionsMux.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, errors.New("会话不存在")
	}

	return session, nil
}

func (s *websshService) CloseSession(sessionID string) error {
	s.sessionsMux.Lock()
	defer s.sessionsMux.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return errors.New("会话不存在")
	}

	// 关闭连接
	if session.StdinPipe != nil {
		session.StdinPipe.Close()
	}
	if session.Session != nil {
		session.Session.Close()
	}
	if session.Client != nil {
		session.Client.Close()
	}

	// 记录会话结束审计
	if s.auditHook != nil {
		duration := time.Since(session.CreatedAt)
		_ = s.auditHook.LogCreate("webssh", session.AssetID, session.UserID, map[string]interface{}{
			"action":   "disconnect",
			"session_id": sessionID,
			"duration": duration.Seconds(),
		})
	}

	delete(s.sessions, sessionID)
	return nil
}

func (s *websshService) WriteToSession(sessionID string, data []byte) error {
	session, err := s.GetSession(sessionID)
	if err != nil {
		return err
	}

	session.LastActive = time.Now()
	_, err = session.StdinPipe.Write(data)
	return err
}

func (s *websshService) ReadFromSession(sessionID string) ([]byte, error) {
	session, err := s.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	buffer := make([]byte, 1024)
	n, err := session.StdoutPipe.Read(buffer)
	if err != nil {
		return nil, err
	}

	session.LastActive = time.Now()
	return buffer[:n], nil
}

func (s *websshService) ResizeSession(sessionID string, height, width int) error {
	session, err := s.GetSession(sessionID)
	if err != nil {
		return err
	}

	return session.Session.WindowChange(height, width)
}

func (s *websshService) CleanupInactiveSessions() {
	s.sessionsMux.Lock()
	defer s.sessionsMux.Unlock()

	now := time.Now()
	for id, session := range s.sessions {
		// 清理空闲超过30分钟的会话
		if now.Sub(session.LastActive) > 30*time.Minute {
			if session.StdinPipe != nil {
				session.StdinPipe.Close()
			}
			if session.Session != nil {
				session.Session.Close()
			}
			if session.Client != nil {
				session.Client.Close()
			}
			delete(s.sessions, id)
		}
		// 清理运行超过2小时的会话
		if now.Sub(session.CreatedAt) > 2*time.Hour {
			if session.StdinPipe != nil {
				session.StdinPipe.Close()
			}
			if session.Session != nil {
				session.Session.Close()
			}
			if session.Client != nil {
				session.Client.Close()
			}
			delete(s.sessions, id)
		}
	}
}

func (s *websshService) startCleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.CleanupInactiveSessions()
	}
}

