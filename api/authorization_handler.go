package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type AuthorizationHandler struct {
	authzService service.AuthorizationService
}

func NewAuthorizationHandler(authzService service.AuthorizationService) *AuthorizationHandler {
	return &AuthorizationHandler{
		authzService: authzService,
	}
}

type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateRoleRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreatePermissionRequest struct {
	Name     string `json:"name" binding:"required"`
	Resource string `json:"resource" binding:"required"`
	Action   string `json:"action" binding:"required"`
}

// CreateRole 创建角色
// @Summary 创建角色
// @Tags roles
// @Accept json
// @Produce json
// @Param role body CreateRoleRequest true "角色信息"
// @Success 201 {object} model.Role
// @Router /api/v1/roles [post]
func (h *AuthorizationHandler) CreateRole(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	role := &model.Role{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.authzService.CreateRole(role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, role)
}

// GetRole 获取单个角色
// @Summary 获取角色详情
// @Tags roles
// @Produce json
// @Param id path string true "角色ID"
// @Success 200 {object} model.Role
// @Router /api/v1/roles/{id} [get]
func (h *AuthorizationHandler) GetRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	role, err := h.authzService.GetRole(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

// ListRoles 获取角色列表
// @Summary 获取角色列表
// @Tags roles
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/roles [get]
func (h *AuthorizationHandler) ListRoles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	roles, total, err := h.authzService.ListRoles(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  roles,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateRole 更新角色
// @Summary 更新角色
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param role body UpdateRoleRequest true "角色信息"
// @Success 200 {object} model.Role
// @Router /api/v1/roles/{id} [put]
func (h *AuthorizationHandler) UpdateRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	role := &model.Role{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.authzService.UpdateRole(id, role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedRole, _ := h.authzService.GetRole(id)
	c.JSON(http.StatusOK, updatedRole)
}

// DeleteRole 删除角色
// @Summary 删除角色
// @Tags roles
// @Produce json
// @Param id path string true "角色ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/roles/{id} [delete]
func (h *AuthorizationHandler) DeleteRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.authzService.DeleteRole(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// CreatePermission 创建权限
// @Summary 创建权限
// @Tags permissions
// @Accept json
// @Produce json
// @Param permission body CreatePermissionRequest true "权限信息"
// @Success 201 {object} model.Permission
// @Router /api/v1/permissions [post]
func (h *AuthorizationHandler) CreatePermission(c *gin.Context) {
	var req CreatePermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	permission := &model.Permission{
		Name:     req.Name,
		Resource: req.Resource,
		Action:   req.Action,
	}

	if err := h.authzService.CreatePermission(permission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, permission)
}

// ListPermissions 获取权限列表
// @Summary 获取权限列表
// @Tags permissions
// @Produce json
// @Param resource query string false "资源"
// @Success 200 {array} model.Permission
// @Router /api/v1/permissions [get]
func (h *AuthorizationHandler) ListPermissions(c *gin.Context) {
	resource := c.Query("resource")
	var permissions []*model.Permission
	var err error

	if resource != "" {
		permissions, err = h.authzService.GetPermissionsByResource(resource)
	} else {
		permissions, err = h.authzService.ListPermissions()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

// GetPermission 获取单个权限
// @Summary 获取权限详情
// @Tags permissions
// @Produce json
// @Param id path string true "权限ID"
// @Success 200 {object} model.Permission
// @Router /api/v1/permissions/{id} [get]
func (h *AuthorizationHandler) GetPermission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	permission, err := h.authzService.GetPermission(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permission not found"})
		return
	}

	c.JSON(http.StatusOK, permission)
}

// AssignPermissionToRole 为角色分配权限
// @Summary 为角色分配权限
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "角色ID"
// @Param permission_id body map[string]string true "权限ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/roles/{id}/permissions [post]
func (h *AuthorizationHandler) AssignPermissionToRole(c *gin.Context) {
	roleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req struct {
		PermissionID string `json:"permission_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	permissionID, err := uuid.Parse(req.PermissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	if err := h.authzService.AssignPermissionToRole(roleID, permissionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permission assigned successfully"})
}

// RevokePermissionFromRole 撤销角色权限
// @Summary 撤销角色权限
// @Tags roles
// @Produce json
// @Param id path string true "角色ID"
// @Param permission_id path string true "权限ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/roles/{id}/permissions/{permission_id} [delete]
func (h *AuthorizationHandler) RevokePermissionFromRole(c *gin.Context) {
	roleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	permissionID, err := uuid.Parse(c.Param("permission_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	if err := h.authzService.RevokePermissionFromRole(roleID, permissionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permission revoked successfully"})
}

// GetRolePermissions 获取角色的权限列表
// @Summary 获取角色的权限列表
// @Tags roles
// @Produce json
// @Param id path string true "角色ID"
// @Success 200 {array} model.Permission
// @Router /api/v1/roles/{id}/permissions [get]
func (h *AuthorizationHandler) GetRolePermissions(c *gin.Context) {
	roleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	permissions, err := h.authzService.GetRolePermissions(roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

// AssignRoleToUser 为用户分配角色
// @Summary 为用户分配角色
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "用户ID"
// @Param role_id body map[string]string true "角色ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/users/{id}/roles [post]
func (h *AuthorizationHandler) AssignRoleToUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		RoleID string `json:"role_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.authzService.AssignRoleToUser(userID, roleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned successfully"})
}

// RevokeRoleFromUser 撤销用户角色
// @Summary 撤销用户角色
// @Tags users
// @Produce json
// @Param id path string true "用户ID"
// @Param role_id path string true "角色ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/users/{id}/roles/{role_id} [delete]
func (h *AuthorizationHandler) RevokeRoleFromUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	roleID, err := uuid.Parse(c.Param("role_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.authzService.RevokeRoleFromUser(userID, roleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role revoked successfully"})
}

// GetUserRoles 获取用户的角色列表
// @Summary 获取用户的角色列表
// @Tags users
// @Produce json
// @Param id path string true "用户ID"
// @Success 200 {array} model.Role
// @Router /api/v1/users/{id}/roles [get]
func (h *AuthorizationHandler) GetUserRoles(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	roles, err := h.authzService.GetUserRoles(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// AssignRoleToGroup 为群组分配角色
// @Summary 为群组分配角色
// @Tags user-groups
// @Accept json
// @Produce json
// @Param id path string true "群组ID"
// @Param role_id body map[string]string true "角色ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/user-groups/{id}/roles [post]
func (h *AuthorizationHandler) AssignRoleToGroup(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var req struct {
		RoleID string `json:"role_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.authzService.AssignRoleToGroup(groupID, roleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned successfully"})
}

// RevokeRoleFromGroup 撤销群组角色
// @Summary 撤销群组角色
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Param role_id path string true "角色ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/user-groups/{id}/roles/{role_id} [delete]
func (h *AuthorizationHandler) RevokeRoleFromGroup(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	roleID, err := uuid.Parse(c.Param("role_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.authzService.RevokeRoleFromGroup(groupID, roleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role revoked successfully"})
}

// GetGroupRoles 获取群组的角色列表
// @Summary 获取群组的角色列表
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Success 200 {array} model.Role
// @Router /api/v1/user-groups/{id}/roles [get]
func (h *AuthorizationHandler) GetGroupRoles(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	roles, err := h.authzService.GetGroupRoles(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// CheckPermission 检查用户权限
// @Summary 检查用户权限
// @Tags authorization
// @Produce json
// @Param resource query string true "资源"
// @Param action query string true "操作"
// @Success 200 {object} map[string]bool
// @Router /api/v1/authz/check [get]
func (h *AuthorizationHandler) CheckPermission(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	resource := c.Query("resource")
	action := c.Query("action")

	if resource == "" || action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource and action are required"})
		return
	}

	hasPermission, err := h.authzService.CheckPermission(userID.(uuid.UUID), resource, action)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"has_permission": hasPermission})
}

// GetUserPermissions 获取用户的所有权限
// @Summary 获取用户的所有权限
// @Tags authorization
// @Produce json
// @Success 200 {array} model.Permission
// @Router /api/v1/authz/permissions [get]
func (h *AuthorizationHandler) GetUserPermissions(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	permissions, err := h.authzService.GetUserAllPermissions(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

