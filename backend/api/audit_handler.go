package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
	"gorm.io/gorm"
)

type AuditHandler struct {
	auditService service.AuditService
	db           *gorm.DB
}

func NewAuditHandler(auditService service.AuditService, db *gorm.DB) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
		db:           db,
	}
}

// AuditLogResponse 审计日志响应结构
type AuditLogResponse struct {
	ID           uuid.UUID              `json:"id"`
	Module       string                 `json:"module"`
	ResourceType string                 `json:"resource_type"`
	Action       string                 `json:"action"`
	ResourceID   uuid.UUID              `json:"resource_id"`
	ResourceName string                 `json:"resource_name"`
	UserID       uuid.UUID              `json:"user_id"`
	Username     string                 `json:"username"`
	Details      map[string]interface{} `json:"details"`
	CreatedAt    time.Time              `json:"created_at"`
}

// GetAuditLogs 查询审计日志
// @Summary 查询审计日志
// @Tags audit
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Param module query string false "模块"
// @Param resource_type query string false "资源类型"
// @Param action query string false "操作"
// @Param resource_id query string false "资源ID"
// @Param user_id query string false "用户ID"
// @Param username query string false "用户名"
// @Param start_time query string false "开始时间 (RFC3339)"
// @Param end_time query string false "结束时间 (RFC3339)"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/audit-logs [get]
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	filters := make(map[string]interface{})

	if module := c.Query("module"); module != "" {
		filters["module"] = module
	}
	// 兼容新旧参数名
	if resourceType := c.Query("resource_type"); resourceType != "" {
		filters["module"] = resourceType
	}
	if action := c.Query("action"); action != "" {
		filters["action"] = action
	}
	if resourceIDStr := c.Query("resource_id"); resourceIDStr != "" {
		if resourceID, err := uuid.Parse(resourceIDStr); err == nil {
			filters["resource_id"] = resourceID
		}
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			filters["user_id"] = userID
		}
	}
	// 支持用户名搜索
	if username := c.Query("username"); username != "" {
		// 先通过用户名查找用户ID
		var user model.User
		if err := h.db.Where("username ILIKE ?", "%"+username+"%").First(&user).Error; err == nil {
			filters["user_id"] = user.ID
		} else {
			// 如果找不到用户，返回空结果
			c.JSON(http.StatusOK, gin.H{
				"data":  []AuditLogResponse{},
				"total": 0,
				"page":  page,
				"limit": limit,
			})
			return
		}
	}
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			filters["start_time"] = startTime
		}
	}
	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			filters["end_time"] = endTime
		}
	}

	logs, total, err := h.auditService.Query(filters, offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为响应格式，包含用户名和资源名
	responses := make([]AuditLogResponse, 0, len(logs))
	for _, log := range logs {
		response := AuditLogResponse{
			ID:           log.ID,
			Module:       log.Module,
			ResourceType: log.Module,
			Action:       log.Action,
			ResourceID:   log.ResourceID,
			UserID:       log.UserID,
			CreatedAt:    log.CreatedAt,
		}

		// 解析 Details
		if log.Details != "" {
			var details map[string]interface{}
			if err := json.Unmarshal([]byte(log.Details), &details); err == nil {
				response.Details = details
			}
		}

		// 获取用户名
		response.Username = h.getUserName(log.UserID)

		// 获取资源名
		response.ResourceName = h.getResourceName(log.Module, log.ResourceID)

		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  responses,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// getUserName 根据用户ID获取用户名
func (h *AuditHandler) getUserName(userID uuid.UUID) string {
	if userID == uuid.Nil {
		return "-"
	}
	var user model.User
	if err := h.db.Select("username").Where("id = ?", userID).First(&user).Error; err != nil {
		return userID.String()[:8] + "..."
	}
	return user.Username
}

// getResourceName 根据资源类型和资源ID获取资源名
func (h *AuditHandler) getResourceName(resourceType string, resourceID uuid.UUID) string {
	if resourceID == uuid.Nil {
		return "-"
	}

	switch resourceType {
	case "asset", "webssh":
		// webssh 的 resource_id 实际上是 asset_id
		var asset model.Asset
		if err := h.db.Select("name").Where("id = ?", resourceID).First(&asset).Error; err == nil {
			return asset.Name
		}
	case "project":
		var project model.Project
		if err := h.db.Select("name").Where("id = ?", resourceID).First(&project).Error; err == nil {
			return project.Name
		}
	case "user":
		var user model.User
		if err := h.db.Select("username").Where("id = ?", resourceID).First(&user).Error; err == nil {
			return user.Username
		}
	case "team":
		var team model.Team
		if err := h.db.Select("name").Where("id = ?", resourceID).First(&team).Error; err == nil {
			return team.Name
		}
	case "credential":
		var credential model.AssetCredential
		if err := h.db.Select("name").Where("id = ?", resourceID).First(&credential).Error; err == nil {
			return credential.Name
		}
	case "token":
		var token model.APIToken
		if err := h.db.Select("name").Where("id = ?", resourceID).First(&token).Error; err == nil {
			return token.Name
		}
	}

	// 默认返回截断的UUID
	return resourceID.String()[:8] + "..."
}

// GetUsers 获取用户列表（用于审计日志筛选）
// @Summary 获取用户列表
// @Tags audit
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/audit-logs/users [get]
func (h *AuditHandler) GetUsers(c *gin.Context) {
	var users []struct {
		ID       uuid.UUID `json:"id"`
		Username string    `json:"username"`
	}

	if err := h.db.Model(&model.User{}).Select("id, username").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}
