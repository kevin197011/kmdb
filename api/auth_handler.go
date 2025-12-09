package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kmdb/kmdb/service"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Login 用户登录
// @Summary 用户登录
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body LoginRequest true "登录凭证"
// @Success 200 {object} service.LoginResponse
// @Failure 401 {object} map[string]string
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	response, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// RefreshToken 刷新访问令牌
// @Summary 刷新访问令牌
// @Tags auth
// @Accept json
// @Produce json
// @Param token body RefreshTokenRequest true "刷新令牌"
// @Success 200 {object} service.LoginResponse
// @Failure 401 {object} map[string]string
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	response, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout 用户登出
// @Summary 用户登出
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// 客户端删除 token 即可，服务端无需特殊处理
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GetMe 获取当前登录用户信息
// @Summary 获取当前登录用户信息
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.User
// @Failure 401 {object} map[string]string
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetMe(c *gin.Context) {
	// 从上下文获取用户信息（由 AuthMiddleware 设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	// 将 user_id 转换为字符串（中间件设置的是 uuid.UUID 类型）
	var userIDStr string
	switch v := userID.(type) {
	case string:
		userIDStr = v
	default:
		// 尝试使用 Stringer 接口或直接格式化
		userIDStr = fmt.Sprintf("%v", v)
	}

	user, err := h.authService.GetUserByID(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息失败"})
		return
	}

	// 返回用户信息（不包含密码）
	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"status":     user.Status,
		"created_at": user.CreatedAt,
	})
}

