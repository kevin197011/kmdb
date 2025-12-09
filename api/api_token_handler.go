package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type APITokenHandler struct {
	tokenService service.APITokenService
}

func NewAPITokenHandler(tokenService service.APITokenService) *APITokenHandler {
	return &APITokenHandler{tokenService: tokenService}
}

// CreateTokenRequest 创建 Token 请求
// @Description 创建 API Token 请求体
type CreateTokenRequest struct {
	Name      string             `json:"name" binding:"required" example:"CI/CD Token"`
	Scopes    []model.TokenScope `json:"scopes" example:"[{\"resource\":\"assets\",\"actions\":[\"read\"]}]"`
	ExpiresIn *int               `json:"expires_in" example:"30"` // 过期天数，null 表示永不过期
}

// CreateTokenResponse 创建 Token 响应
// @Description 创建 API Token 响应体
type CreateTokenResponse struct {
	Token      *model.APIToken `json:"token"`
	RawToken   string          `json:"raw_token"`   // 原始 Token 值（仅此一次显示）
	Message    string          `json:"message"`
}

// CreateToken godoc
// @Summary 创建 API Token
// @Description 创建新的 API Token 用于程序化访问 API
// @Tags API Tokens
// @Accept json
// @Produce json
// @Param request body CreateTokenRequest true "Token 信息"
// @Success 201 {object} CreateTokenResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens [post]
func (h *APITokenHandler) CreateToken(c *gin.Context) {
	var req CreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数", "details": err.Error()})
		return
	}

	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	token, rawToken, err := h.tokenService.CreateToken(userID.(uuid.UUID), req.Name, req.Scopes, req.ExpiresIn)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, CreateTokenResponse{
		Token:    token,
		RawToken: rawToken,
		Message:  "Token 创建成功，请立即保存 Token 值，此后将无法再次查看完整 Token",
	})
}

// ListTokens godoc
// @Summary 获取 Token 列表
// @Description 获取当前用户的所有 API Token（管理员可获取所有）
// @Tags API Tokens
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens [get]
func (h *APITokenHandler) ListTokens(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	tokens, total, err := h.tokenService.ListTokens(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Token 列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  tokens,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetMyTokens godoc
// @Summary 获取当前用户的 Token
// @Description 获取当前登录用户的所有 API Token
// @Tags API Tokens
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens/my [get]
func (h *APITokenHandler) GetMyTokens(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	tokens, err := h.tokenService.GetUserTokens(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Token 列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tokens})
}

// GetToken godoc
// @Summary 获取 Token 详情
// @Description 获取指定 API Token 的详细信息
// @Tags API Tokens
// @Accept json
// @Produce json
// @Param id path string true "Token ID"
// @Success 200 {object} model.APIToken
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens/{id} [get]
func (h *APITokenHandler) GetToken(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 Token ID"})
		return
	}

	token, err := h.tokenService.GetToken(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Token 不存在"})
		return
	}

	c.JSON(http.StatusOK, token)
}

// RevokeToken godoc
// @Summary 撤销 Token
// @Description 撤销指定的 API Token，撤销后 Token 将无法使用
// @Tags API Tokens
// @Accept json
// @Produce json
// @Param id path string true "Token ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens/{id}/revoke [post]
func (h *APITokenHandler) RevokeToken(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 Token ID"})
		return
	}

	if err := h.tokenService.RevokeToken(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Token 不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Token 已撤销"})
}

// DeleteToken godoc
// @Summary 删除 Token
// @Description 永久删除指定的 API Token
// @Tags API Tokens
// @Accept json
// @Produce json
// @Param id path string true "Token ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/api-tokens/{id} [delete]
func (h *APITokenHandler) DeleteToken(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 Token ID"})
		return
	}

	if err := h.tokenService.DeleteToken(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Token 不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Token 已删除"})
}

