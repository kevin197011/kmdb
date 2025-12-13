package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/service"
)

type PasswordHandler struct {
	userService service.UserService
}

func NewPasswordHandler(userService service.UserService) *PasswordHandler {
	return &PasswordHandler{
		userService: userService,
	}
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"` // 可选，管理员修改其他用户密码时不需要
	NewPassword string `json:"new_password" binding:"required"`
}

// ChangePassword 修改用户密码
// @Summary 修改用户密码
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "用户ID"
// @Param request body ChangePasswordRequest true "密码信息"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/users/{id}/change-password [post]
func (h *PasswordHandler) ChangePassword(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	// 获取当前用户ID（从认证中间件）
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 判断是否是修改自己的密码
	isSelfChange := currentUserID.(uuid.UUID) == userID

	// 如果是修改自己的密码，必须提供旧密码
	if isSelfChange && req.OldPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "修改自己的密码需要提供旧密码"})
		return
	}

	// 如果是管理员修改其他用户的密码，不需要旧密码
	if err := h.userService.ChangePassword(userID, req.OldPassword, req.NewPassword, isSelfChange); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
