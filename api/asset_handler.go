package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type AssetHandler struct {
	assetService service.AssetService
}

func NewAssetHandler(assetService service.AssetService) *AssetHandler {
	return &AssetHandler{
		assetService: assetService,
	}
}

type CreateAssetRequest struct {
	Type          string  `json:"type" binding:"required"`
	Name          string  `json:"name" binding:"required"`
	Status        string  `json:"status" binding:"required"`
	ProjectID     *string `json:"project_id"`      // 项目ID，可选
	SSHPort       int     `json:"ssh_port"`        // SSH 端口
	IP            string  `json:"ip"`              // IP 地址
	OS            string  `json:"os"`              // 操作系统
	CPU           string  `json:"cpu"`             // CPU 信息
	Memory        string  `json:"memory"`          // 内存信息
	Disk          string  `json:"disk"`            // 磁盘信息
	Location      string  `json:"location"`        // 位置信息
	Department    string  `json:"department"`      // 所属部门
	CloudPlatform string  `json:"cloud_platform"`  // 云平台
	Remark        string  `json:"remark"`          // 备注
}

type UpdateAssetRequest struct {
	Type          string  `json:"type"`
	Name          string  `json:"name"`
	Status        string  `json:"status"`
	ProjectID     *string `json:"project_id"`      // 项目ID，可选
	SSHPort       int     `json:"ssh_port"`        // SSH 端口
	IP            string  `json:"ip"`              // IP 地址
	OS            string  `json:"os"`              // 操作系统
	CPU           string  `json:"cpu"`             // CPU 信息
	Memory        string  `json:"memory"`          // 内存信息
	Disk          string  `json:"disk"`            // 磁盘信息
	Location      string  `json:"location"`        // 位置信息
	Department    string  `json:"department"`      // 所属部门
	CloudPlatform string  `json:"cloud_platform"`  // 云平台
	Remark        string  `json:"remark"`          // 备注
}

// CreateAsset 创建资产
// @Summary 创建资产
// @Tags assets
// @Accept json
// @Produce json
// @Param asset body CreateAssetRequest true "资产信息"
// @Success 201 {object} model.Asset
// @Failure 400 {object} map[string]string
// @Router /api/v1/assets [post]
func (h *AssetHandler) CreateAsset(c *gin.Context) {
	var req CreateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	asset := &model.Asset{
		Type:          req.Type,
		Name:          req.Name,
		Status:        req.Status,
		SSHPort:       req.SSHPort,
		IP:            req.IP,
		OS:            req.OS,
		CPU:           req.CPU,
		Memory:        req.Memory,
		Disk:          req.Disk,
		Location:      req.Location,
		Department:    req.Department,
		CloudPlatform: req.CloudPlatform,
		Remark:        req.Remark,
	}

	// 设置默认 SSH 端口
	if asset.SSHPort == 0 {
		asset.SSHPort = 22
	}

	// 处理项目ID
	if req.ProjectID != nil && *req.ProjectID != "" {
		projectID, err := uuid.Parse(*req.ProjectID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		asset.ProjectID = &projectID
	}

	// 从上下文获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		userID = uuid.Nil
	}
	if err := h.assetService.CreateAsset(asset, userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, asset)
}

// GetAsset 获取单个资产
// @Summary 获取资产详情
// @Tags assets
// @Produce json
// @Param id path string true "资产ID"
// @Success 200 {object} model.Asset
// @Failure 404 {object} map[string]string
// @Router /api/v1/assets/{id} [get]
func (h *AssetHandler) GetAsset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	asset, err := h.assetService.GetAsset(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	c.JSON(http.StatusOK, asset)
}

// ListAssets 获取资产列表
// @Summary 获取资产列表
// @Tags assets
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Param type query string false "资产类型"
// @Param status query string false "状态"
// @Param project query string false "项目"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/assets [get]
func (h *AssetHandler) ListAssets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	filters := make(map[string]interface{})
	if assetType := c.Query("type"); assetType != "" {
		filters["type"] = assetType
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if projectID := c.Query("project_id"); projectID != "" {
		filters["project_id"] = projectID
	}

	assets, total, err := h.assetService.ListAssets(offset, limit, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  assets,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateAsset 更新资产
// @Summary 更新资产
// @Tags assets
// @Accept json
// @Produce json
// @Param id path string true "资产ID"
// @Param asset body UpdateAssetRequest true "资产信息"
// @Success 200 {object} model.Asset
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/assets/{id} [put]
func (h *AssetHandler) UpdateAsset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var req UpdateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	existing, err := h.assetService.GetAsset(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	// 更新字段
	if req.Type != "" {
		existing.Type = req.Type
	}
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Status != "" {
		existing.Status = req.Status
	}
	// 更新 SSH 端口（如果提供了值）
	if req.SSHPort > 0 {
		existing.SSHPort = req.SSHPort
	}
	// 更新资产详细信息字段（允许清空，所以直接赋值）
	existing.IP = req.IP
	existing.OS = req.OS
	existing.CPU = req.CPU
	existing.Memory = req.Memory
	existing.Disk = req.Disk
	existing.Location = req.Location
	existing.Department = req.Department
	existing.CloudPlatform = req.CloudPlatform
	existing.Remark = req.Remark

	// 处理项目ID
	if req.ProjectID != nil {
		if *req.ProjectID == "" {
			existing.ProjectID = nil
		} else {
			projectID, err := uuid.Parse(*req.ProjectID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
				return
			}
			existing.ProjectID = &projectID
		}
	}

	// 从上下文获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		userID = uuid.Nil
	}
	if err := h.assetService.UpdateAsset(id, existing, userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedAsset, _ := h.assetService.GetAsset(id)
	c.JSON(http.StatusOK, updatedAsset)
}

// DeleteAsset 删除资产
// @Summary 删除资产
// @Tags assets
// @Produce json
// @Param id path string true "资产ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/assets/{id} [delete]
func (h *AssetHandler) DeleteAsset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	// 从上下文获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		userID = uuid.Nil
	}
	if err := h.assetService.DeleteAsset(id, userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}

// GetAssetCountByProject 按项目统计资产数量
// @Summary 按项目统计资产数量
// @Tags assets
// @Produce json
// @Success 200 {object} map[string]int64
// @Router /api/v1/assets/stats/project [get]
func (h *AssetHandler) GetAssetCountByProject(c *gin.Context) {
	counts, err := h.assetService.GetAssetCountByProject()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, counts)
}

