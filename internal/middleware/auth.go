package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/service"
)

// AuthMiddlewareWithAPIToken 支持 JWT Token 和 API Token 两种认证方式
func AuthMiddlewareWithAPIToken(authService service.AuthService, apiTokenService service.APITokenService, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		var isAPIToken bool

		// 首先尝试从 Authorization header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// 提取 Bearer token
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// 如果 header 中没有 token，尝试从 X-API-Key header 获取 API Token
		if tokenString == "" {
			tokenString = c.GetHeader("X-API-Key")
			if tokenString != "" {
				isAPIToken = true
			}
		}

		// 如果还是没有 token，尝试从查询参数获取（用于 WebSocket 连接）
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 如果还是没有 token，尝试从查询参数获取 api_key
		if tokenString == "" {
			tokenString = c.Query("api_key")
			if tokenString != "" {
				isAPIToken = true
			}
		}

		// 如果还是没有 token，返回未授权错误
		if tokenString == "" {
			handleUnauthorized(c, "未提供认证令牌")
			return
		}

		// 检查是否是 API Token（以 kmdb_ 开头）
		if strings.HasPrefix(tokenString, "kmdb_") {
			isAPIToken = true
		}

		// 验证 API Token
		if isAPIToken {
			apiToken, err := apiTokenService.ValidateToken(tokenString)
			if err != nil {
				handleUnauthorized(c, "无效或过期的 API Token")
				return
			}

			// 更新最后使用时间（异步）
			go apiTokenService.UpdateLastUsed(apiToken.ID)

			// 将用户信息存储到上下文
			c.Set("user_id", apiToken.UserID)
			c.Set("api_token_id", apiToken.ID)
			c.Set("auth_type", "api_token")

			// 如果关联了用户，设置用户名
			if apiToken.User != nil {
				c.Set("username", apiToken.User.Username)
			}

			c.Next()
			return
		}

		// 验证 JWT Token
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			handleUnauthorized(c, "无效或过期的令牌")
			return
		}

		// 将用户信息存储到上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("auth_type", "jwt")

		c.Next()
	}
}

// AuthMiddleware 原有的 JWT 认证中间件（保持兼容）
func AuthMiddleware(authService service.AuthService, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 首先尝试从 Authorization header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// 提取 Bearer token
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// 如果 header 中没有 token，尝试从查询参数获取（用于 WebSocket 连接）
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 如果还是没有 token，返回未授权错误
		if tokenString == "" {
			handleUnauthorized(c, "未提供认证令牌")
			return
		}

		// 验证 token
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			handleUnauthorized(c, "无效或过期的令牌")
			return
		}

		// 将用户信息存储到上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}

// handleUnauthorized 统一处理未授权错误
func handleUnauthorized(c *gin.Context, message string) {
	// 对于 WebSocket 升级请求，返回更友好的错误
	if c.GetHeader("Upgrade") == "websocket" {
		c.Status(http.StatusUnauthorized)
		c.Writer.WriteString(message)
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": message})
	}
	c.Abort()
}
