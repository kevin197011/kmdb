package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type ProjectHandler struct {
	projectService service.ProjectService
}

func NewProjectHandler(projectService service.ProjectService) *ProjectHandler {
	return &ProjectHandler{
		projectService: projectService,
	}
}

type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type UpdateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

// CreateProject 创建项目
// @Summary 创建项目
// @Tags projects
// @Accept json
// @Produce json
// @Param project body CreateProjectRequest true "项目信息"
// @Success 201 {object} model.Project
// @Router /api/v1/projects [post]
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	project := &model.Project{
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
	}

	if err := h.projectService.CreateProject(project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, project)
}

// GetProject 获取单个项目
// @Summary 获取项目详情
// @Tags projects
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {object} model.Project
// @Router /api/v1/projects/{id} [get]
func (h *ProjectHandler) GetProject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	project, err := h.projectService.GetProject(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// ListProjects 获取项目列表
// @Summary 获取项目列表
// @Tags projects
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/projects [get]
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	offset := (page - 1) * limit

	projects, total, err := h.projectService.ListProjects(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  projects,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateProject 更新项目
// @Summary 更新项目
// @Tags projects
// @Accept json
// @Produce json
// @Param id path string true "项目ID"
// @Param project body UpdateProjectRequest true "项目信息"
// @Success 200 {object} model.Project
// @Router /api/v1/projects/{id} [put]
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	project := &model.Project{
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
	}

	if err := h.projectService.UpdateProject(id, project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedProject, _ := h.projectService.GetProject(id)
	c.JSON(http.StatusOK, updatedProject)
}

// DeleteProject 删除项目
// @Summary 删除项目
// @Tags projects
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/projects/{id} [delete]
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	if err := h.projectService.DeleteProject(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// GetProjectAssets 获取项目的资产列表
// @Summary 获取项目的资产列表
// @Tags projects
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {array} model.Asset
// @Router /api/v1/projects/{id}/assets [get]
func (h *ProjectHandler) GetProjectAssets(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	assets, err := h.projectService.GetProjectAssets(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assets)
}
