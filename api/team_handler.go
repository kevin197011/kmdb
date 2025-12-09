package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type TeamHandler struct {
	teamRepo repository.TeamRepository
}

func NewTeamHandler(teamRepo repository.TeamRepository) *TeamHandler {
	return &TeamHandler{teamRepo: teamRepo}
}

// CreateTeamRequest 创建团队请求
type CreateTeamRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// CreateTeam 创建团队
func (h *TeamHandler) CreateTeam(c *gin.Context) {
	var req CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误", "details": err.Error()})
		return
	}

	// 创建团队
	team := &model.Team{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.teamRepo.Create(team); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建团队失败", "details": err.Error()})
		return
	}

	// 将创建者添加为团队 Owner
	userID := c.MustGet("user_id").(uuid.UUID)
	member := &model.TeamMember{
		TeamID: team.ID,
		UserID: userID,
		Role:   model.TeamRoleOwner,
	}
	h.teamRepo.AddMember(member)

	c.JSON(http.StatusCreated, team)
}

// GetTeam 获取团队详情
func (h *TeamHandler) GetTeam(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	team, err := h.teamRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "团队不存在"})
		return
	}

	c.JSON(http.StatusOK, team)
}

// ListTeams 获取团队列表
func (h *TeamHandler) ListTeams(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit
	teams, total, err := h.teamRepo.List(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取团队列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  teams,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateTeamRequest 更新团队请求
type UpdateTeamRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// UpdateTeam 更新团队
func (h *TeamHandler) UpdateTeam(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	var req UpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	team, err := h.teamRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "团队不存在"})
		return
	}

	if req.Name != "" {
		team.Name = req.Name
	}
	if req.Description != "" {
		team.Description = req.Description
	}

	if err := h.teamRepo.Update(team); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新团队失败"})
		return
	}

	c.JSON(http.StatusOK, team)
}

// DeleteTeam 删除团队
func (h *TeamHandler) DeleteTeam(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	if err := h.teamRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除团队失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "团队已删除"})
}

// AddMemberRequest 添加成员请求
type AddMemberRequest struct {
	UserID uuid.UUID `json:"user_id" binding:"required"`
	Role   string    `json:"role"` // owner, admin, member
}

// AddMember 添加团队成员
func (h *TeamHandler) AddMember(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	var req AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 检查是否已是成员
	isMember, _ := h.teamRepo.IsMember(teamID, req.UserID)
	if isMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户已是团队成员"})
		return
	}

	role := req.Role
	if role == "" {
		role = model.TeamRoleMember
	}

	member := &model.TeamMember{
		TeamID: teamID,
		UserID: req.UserID,
		Role:   role,
	}

	if err := h.teamRepo.AddMember(member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加成员失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成员已添加"})
}

// RemoveMember 移除团队成员
func (h *TeamHandler) RemoveMember(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户 ID"})
		return
	}

	if err := h.teamRepo.RemoveMember(teamID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "移除成员失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成员已移除"})
}

// GetMembers 获取团队成员
func (h *TeamHandler) GetMembers(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	members, err := h.teamRepo.GetMembers(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取成员列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": members})
}

// UpdateMemberRoleRequest 更新成员角色请求
type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateMemberRole 更新成员角色
func (h *TeamHandler) UpdateMemberRole(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的团队 ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户 ID"})
		return
	}

	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if err := h.teamRepo.UpdateMemberRole(teamID, userID, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新成员角色失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成员角色已更新"})
}

// GetMyTeams 获取当前用户的团队
func (h *TeamHandler) GetMyTeams(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	teams, err := h.teamRepo.GetUserTeams(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取团队列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": teams})
}

