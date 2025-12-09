package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/service"
)

type AssetPermissionHandler struct {
	permissionService service.AssetPermissionService
}

func NewAssetPermissionHandler(permissionService service.AssetPermissionService) *AssetPermissionHandler {
	return &AssetPermissionHandler{
		permissionService: permissionService,
	}
}

type AssignPermissionToRoleRequest struct {
	RoleID string `json:"role_id" binding:"required"`
	Action string `json:"action" binding:"required"`
}

type AssignPermissionToUserRequest struct {
	UserID string `json:"user_id" binding:"required"`
	Action string `json:"action" binding:"required"`
}

// AssignPermissionToRole 为角色分配资产权限
// @Summary 为角色分配资产权限
// @Tags asset-permissions
// @Accept json
// @Produce json
// @Param asset_id path string true "资产ID"
// @Param request body AssignPermissionToRoleRequest true "权限信息"
// @Success 201 {object} model.AssetPermission
// @Router /api/v1/assets/{asset_id}/permissions/roles [post]
func (h *AssetPermissionHandler) AssignPermissionToRole(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var req AssignPermissionToRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.permissionService.AssignPermissionToRole(assetID, roleID, req.Action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Permission assigned successfully"})
}

// AssignPermissionToUser 为用户分配资产权限
// @Summary 为用户分配资产权限
// @Tags asset-permissions
// @Accept json
// @Produce json
// @Param asset_id path string true "资产ID"
// @Param request body AssignPermissionToUserRequest true "权限信息"
// @Success 201 {object} model.AssetPermission
// @Router /api/v1/assets/{asset_id}/permissions/users [post]
func (h *AssetPermissionHandler) AssignPermissionToUser(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var req AssignPermissionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.permissionService.AssignPermissionToUser(assetID, userID, req.Action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Permission assigned successfully"})
}

// GetAssetPermissions 获取资产的所有权限
// @Summary 获取资产的所有权限
// @Tags asset-permissions
// @Produce json
// @Param asset_id path string true "资产ID"
// @Success 200 {array} model.AssetPermission
// @Router /api/v1/assets/{asset_id}/permissions [get]
func (h *AssetPermissionHandler) GetAssetPermissions(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	permissions, err := h.permissionService.GetAssetPermissions(assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

// RevokePermission 撤销资产权限
// @Summary 撤销资产权限
// @Tags asset-permissions
// @Produce json
// @Param permission_id path string true "权限ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/asset-permissions/{permission_id} [delete]
func (h *AssetPermissionHandler) RevokePermission(c *gin.Context) {
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
