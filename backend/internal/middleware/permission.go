package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/service"
)

// RequirePermission 权限检查中间件
func RequirePermission(permService service.UnifiedPermissionService, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
			c.Abort()
			return
		}

		userUUID, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的用户ID"})
			c.Abort()
			return
		}

		hasPermission, err := permService.CheckPermission(userUUID, resource, action)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "权限检查失败"})
			c.Abort()
			return
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
			c.Abort()
			return
		}

		c.Next()
	}
}
