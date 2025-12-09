package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/service"
)

type ProjectPermissionHandler struct {
	permissionService service.ProjectPermissionService
}

func NewProjectPermissionHandler(permissionService service.ProjectPermissionService) *ProjectPermissionHandler {
	return &ProjectPermissionHandler{
		permissionService: permissionService,
	}
}

type AssignProjectPermissionToRoleRequest struct {
	RoleID string `json:"role_id" binding:"required"`
	Action string `json:"action" binding:"required"`
}

type AssignProjectPermissionToUserRequest struct {
	UserID string `json:"user_id" binding:"required"`
	Action string `json:"action" binding:"required"`
}

// AssignPermissionToRole 为角色分配项目权限
// @Summary 为角色分配项目权限
// @Tags project-permissions
// @Accept json
// @Produce json
// @Param project_id path string true "项目ID"
// @Param request body AssignProjectPermissionToRoleRequest true "权限信息"
// @Success 201 {object} model.ProjectPermission
// @Router /api/v1/projects/{project_id}/permissions/roles [post]
func (h *ProjectPermissionHandler) AssignPermissionToRole(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req AssignProjectPermissionToRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.permissionService.AssignPermissionToRole(projectID, roleID, req.Action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Permission assigned successfully"})
}

// AssignPermissionToUser 为用户分配项目权限
// @Summary 为用户分配项目权限
// @Tags project-permissions
// @Accept json
// @Produce json
// @Param project_id path string true "项目ID"
// @Param request body AssignProjectPermissionToUserRequest true "权限信息"
// @Success 201 {object} model.ProjectPermission
// @Router /api/v1/projects/{project_id}/permissions/users [post]
func (h *ProjectPermissionHandler) AssignPermissionToUser(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req AssignProjectPermissionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.permissionService.AssignPermissionToUser(projectID, userID, req.Action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Permission assigned successfully"})
}

// GetProjectPermissions 获取项目的所有权限
// @Summary 获取项目的所有权限
// @Tags project-permissions
// @Produce json
// @Param project_id path string true "项目ID"
// @Success 200 {array} model.ProjectPermission
// @Router /api/v1/projects/{project_id}/permissions [get]
func (h *ProjectPermissionHandler) GetProjectPermissions(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	permissions, err := h.permissionService.GetProjectPermissions(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

// RevokePermission 撤销项目权限
// @Summary 撤销项目权限
// @Tags project-permissions
// @Produce json
// @Param permission_id path string true "权限ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/project-permissions/{permission_id} [delete]
func (h *ProjectPermissionHandler) RevokePermission(c *gin.Context) {
	permissionID, err := uuid.Parse(c.Param("permission_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	if err := h.permissionService.RevokePermission(permissionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permission revoked successfully"})
}
