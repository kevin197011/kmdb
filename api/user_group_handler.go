package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type UserGroupHandler struct {
	groupService service.UserGroupService
}

func NewUserGroupHandler(groupService service.UserGroupService) *UserGroupHandler {
	return &UserGroupHandler{
		groupService: groupService,
	}
}

type CreateGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// CreateGroup 创建群组
// @Summary 创建用户群组
// @Tags user-groups
// @Accept json
// @Produce json
// @Param group body CreateGroupRequest true "群组信息"
// @Success 201 {object} model.UserGroup
// @Failure 400 {object} map[string]string
// @Router /api/v1/user-groups [post]
func (h *UserGroupHandler) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	group := &model.UserGroup{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.groupService.CreateGroup(group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, group)
}

// GetGroup 获取单个群组
// @Summary 获取群组详情
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Success 200 {object} model.UserGroup
// @Failure 404 {object} map[string]string
// @Router /api/v1/user-groups/{id} [get]
func (h *UserGroupHandler) GetGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	group, err := h.groupService.GetGroup(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(http.StatusOK, group)
}

// ListGroups 获取群组列表
// @Summary 获取群组列表
// @Tags user-groups
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/user-groups [get]
func (h *UserGroupHandler) ListGroups(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	groups, total, err := h.groupService.ListGroups(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  groups,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateGroup 更新群组
// @Summary 更新群组
// @Tags user-groups
// @Accept json
// @Produce json
// @Param id path string true "群组ID"
// @Param group body UpdateGroupRequest true "群组信息"
// @Success 200 {object} model.UserGroup
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/user-groups/{id} [put]
func (h *UserGroupHandler) UpdateGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var req UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	group := &model.UserGroup{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.groupService.UpdateGroup(id, group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedGroup, _ := h.groupService.GetGroup(id)
	c.JSON(http.StatusOK, updatedGroup)
}

// DeleteGroup 删除群组
// @Summary 删除群组
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/user-groups/{id} [delete]
func (h *UserGroupHandler) DeleteGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	if err := h.groupService.DeleteGroup(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group deleted successfully"})
}

// GetMembers 获取群组成员
// @Summary 获取群组成员列表
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Success 200 {array} model.User
// @Router /api/v1/user-groups/{id}/members [get]
func (h *UserGroupHandler) GetMembers(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	members, err := h.groupService.GetMembers(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 清除密码哈希
	for i := range members {
		members[i].PasswordHash = ""
	}

	c.JSON(http.StatusOK, members)
}

// AddMember 添加群组成员
// @Summary 添加群组成员
// @Tags user-groups
// @Accept json
// @Produce json
// @Param id path string true "群组ID"
// @Param user_id body map[string]string true "用户ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/user-groups/{id}/members [post]
func (h *UserGroupHandler) AddMember(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var req struct {
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.groupService.AddMember(groupID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member added successfully"})
}

// RemoveMember 移除群组成员
// @Summary 移除群组成员
// @Tags user-groups
// @Produce json
// @Param id path string true "群组ID"
// @Param user_id path string true "用户ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/user-groups/{id}/members/{user_id} [delete]
func (h *UserGroupHandler) RemoveMember(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.groupService.RemoveMember(groupID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

// GetUserGroups 获取用户所属的群组
// @Summary 获取用户所属的群组列表
// @Tags user-groups
// @Produce json
// @Param id path string true "用户ID"
// @Success 200 {array} model.UserGroup
// @Router /api/v1/users/{id}/groups [get]
func (h *UserGroupHandler) GetUserGroups(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	groups, err := h.groupService.GetUserGroups(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}

