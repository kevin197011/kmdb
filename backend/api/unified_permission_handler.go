package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type UnifiedPermissionHandler struct {
	permissionService service.UnifiedPermissionService
}

func NewUnifiedPermissionHandler(permissionService service.UnifiedPermissionService) *UnifiedPermissionHandler {
	return &UnifiedPermissionHandler{permissionService: permissionService}
}

// GrantPermissionRequest 授予权限请求
type GrantPermissionRequest struct {
	SubjectType  string  `json:"subject_type" binding:"required"`  // user, role, team
	SubjectID    string  `json:"subject_id" binding:"required"`    // 主体 ID
	ResourceType string  `json:"resource_type" binding:"required"` // asset, project, *, user, team...
	ResourceID   *string `json:"resource_id"`                      // 资源 ID（可选）
	Action       string  `json:"action" binding:"required"`        // view, create, update, delete, connect, *, manage
}

// GrantPermission 授予权限
func (h *UnifiedPermissionHandler) GrantPermission(c *gin.Context) {
	var req GrantPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误", "details": err.Error()})
		return
	}

	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的主体 ID"})
		return
	}

	var resourceID *uuid.UUID
	if req.ResourceID != nil && *req.ResourceID != "" {
		id, err := uuid.Parse(*req.ResourceID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的资源 ID"})
			return
		}
		resourceID = &id
	}

	grant := &model.PermissionGrant{
		SubjectType:  req.SubjectType,
		SubjectID:    subjectID,
		ResourceType: req.ResourceType,
		ResourceID:   resourceID,
		Action:       req.Action,
	}

	if err := h.permissionService.GrantPermission(grant); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "权限已授予"})
}

// RevokePermission 撤销权限
func (h *UnifiedPermissionHandler) RevokePermission(c *gin.Context) {
	permissionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的权限 ID"})
		return
	}

	if err := h.permissionService.RevokePermission(permissionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "撤销权限失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "权限已撤销"})
}

// GetSubjectPermissions 获取主体的权限列表
func (h *UnifiedPermissionHandler) GetSubjectPermissions(c *gin.Context) {
	subjectType := c.Query("subject_type")
	subjectIDStr := c.Query("subject_id")

	if subjectType == "" || subjectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 subject_type 或 subject_id 参数"})
		return
	}

	subjectID, err := uuid.Parse(subjectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的主体 ID"})
		return
	}

	permissions, err := h.permissionService.GetSubjectPermissions(subjectType, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取权限列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}

// GetResourcePermissions 获取资源的权限列表
func (h *UnifiedPermissionHandler) GetResourcePermissions(c *gin.Context) {
	resourceType := c.Query("resource_type")
	resourceIDStr := c.Query("resource_id")

	if resourceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 resource_type 参数"})
		return
	}

	var resourceID *uuid.UUID
	if resourceIDStr != "" {
		id, err := uuid.Parse(resourceIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的资源 ID"})
			return
		}
		resourceID = &id
	}

	permissions, err := h.permissionService.GetResourcePermissions(resourceType, resourceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取权限列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}

// CheckPermissionRequest 检查权限请求
type CheckPermissionRequest struct {
	ResourceType string  `json:"resource_type" binding:"required"`
	ResourceID   *string `json:"resource_id"`
	Action       string  `json:"action" binding:"required"`
}

// CheckPermission 检查当前用户的权限
func (h *UnifiedPermissionHandler) CheckPermission(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	resourceType := c.Query("resource_type")
	resourceIDStr := c.Query("resource_id")
	action := c.Query("action")

	if resourceType == "" || action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 resource_type 或 action 参数"})
		return
	}

	var resourceID uuid.UUID
	if resourceIDStr != "" {
		id, err := uuid.Parse(resourceIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的资源 ID"})
			return
		}
		resourceID = id
	}

	var hasPermission bool
	var err error

	if resourceID == uuid.Nil {
		hasPermission, err = h.permissionService.CheckPermission(userID, resourceType, action)
	} else {
		hasPermission, err = h.permissionService.CheckResourcePermission(userID, resourceType, resourceID, action)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查权限失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"has_permission": hasPermission})
}

// GetMyPermissions 获取当前用户的权限摘要
func (h *UnifiedPermissionHandler) GetMyPermissions(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	summary, err := h.permissionService.GetUserPermissionSummary(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取权限摘要失败"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// BatchCheckPermissionRequest 批量检查权限请求
type BatchCheckPermissionRequest struct {
	Checks []CheckPermissionRequest `json:"checks" binding:"required"`
}

// BatchCheckPermission 批量检查权限
func (h *UnifiedPermissionHandler) BatchCheckPermission(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	var req BatchCheckPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	results := make(map[string]bool)

	for _, check := range req.Checks {
		var resourceID uuid.UUID
		if check.ResourceID != nil && *check.ResourceID != "" {
			id, err := uuid.Parse(*check.ResourceID)
			if err != nil {
				continue
			}
			resourceID = id
		}

		key := check.ResourceType + ":" + check.Action
		if resourceID != uuid.Nil {
			key = check.ResourceType + ":" + resourceID.String() + ":" + check.Action
		}

		var hasPermission bool
		if resourceID == uuid.Nil {
			hasPermission, _ = h.permissionService.CheckPermission(userID, check.ResourceType, check.Action)
		} else {
			hasPermission, _ = h.permissionService.CheckResourcePermission(userID, check.ResourceType, resourceID, check.Action)
		}

		results[key] = hasPermission
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// GetAccessibleResources 获取用户可访问的资源列表
func (h *UnifiedPermissionHandler) GetAccessibleResources(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	resourceType := c.Query("resource_type")
	action := c.DefaultQuery("action", model.ActionView)

	if resourceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 resource_type 参数"})
		return
	}

	resourceIDs, err := h.permissionService.GetAccessibleResourceIDs(userID, resourceType, action)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取可访问资源失败"})
		return
	}

	// 如果返回 nil，表示有所有资源的访问权限
	if resourceIDs == nil {
		c.JSON(http.StatusOK, gin.H{"has_all_access": true, "resource_ids": []uuid.UUID{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"has_all_access": false, "resource_ids": resourceIDs})
}

// ListPermissions 列出所有权限记录
func (h *UnifiedPermissionHandler) ListPermissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// 使用 Repository 的 List 方法
	// 注意：这里需要在 service 中添加 List 方法，暂时直接返回主体权限
	subjectType := c.Query("subject_type")
	subjectIDStr := c.Query("subject_id")

	if subjectType != "" && subjectIDStr != "" {
		subjectID, err := uuid.Parse(subjectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的主体 ID"})
			return
		}

		permissions, err := h.permissionService.GetSubjectPermissions(subjectType, subjectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取权限列表失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  permissions,
			"total": len(permissions),
			"page":  page,
			"limit": limit,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  []*model.ScopedPermission{},
		"total": 0,
		"page":  page,
		"limit": limit,
	})
}

