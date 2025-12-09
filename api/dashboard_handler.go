package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kmdb/kmdb/repository"
)

type DashboardHandler struct {
	assetRepo     repository.AssetRepository
	userRepo      repository.UserRepository
	projectRepo   repository.ProjectRepository
	userGroupRepo repository.UserGroupRepository
	roleRepo      repository.RoleRepository
	auditRepo     repository.AuditRepository
}

func NewDashboardHandler(
	assetRepo repository.AssetRepository,
	userRepo repository.UserRepository,
	projectRepo repository.ProjectRepository,
	userGroupRepo repository.UserGroupRepository,
	roleRepo repository.RoleRepository,
	auditRepo repository.AuditRepository,
) *DashboardHandler {
	return &DashboardHandler{
		assetRepo:     assetRepo,
		userRepo:      userRepo,
		projectRepo:   projectRepo,
		userGroupRepo: userGroupRepo,
		roleRepo:      roleRepo,
		auditRepo:     auditRepo,
	}
}

// GetDashboardStats 获取仪表盘统计数据
// @Summary 获取仪表盘统计数据
// @Tags dashboard
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/dashboard/stats [get]
func (h *DashboardHandler) GetDashboardStats(c *gin.Context) {
	// 资产统计
	assetCounts, _ := h.assetRepo.CountByProject()
	totalAssets := int64(0)
	for _, count := range assetCounts {
		totalAssets += count
	}

	// 按状态统计资产
	assetsByStatus, _, _ := h.assetRepo.List(0, 10000, map[string]interface{}{})
	statusCounts := map[string]int{
		"active":      0,
		"inactive":    0,
		"maintenance": 0,
	}
	for _, asset := range assetsByStatus {
		if count, ok := statusCounts[asset.Status]; ok {
			statusCounts[asset.Status] = count + 1
		} else {
			statusCounts["inactive"]++
		}
	}

	// 按类型统计资产
	typeCounts := make(map[string]int)
	for _, asset := range assetsByStatus {
		typeCounts[asset.Type] = typeCounts[asset.Type] + 1
	}

	// 用户统计
	_, totalUsers, _ := h.userRepo.List(0, 1, map[string]interface{}{})

	// 项目统计
	_, totalProjects, _ := h.projectRepo.List(0, 1)

	// 用户群组统计
	_, totalGroups, _ := h.userGroupRepo.List(0, 1)

	// 角色统计
	_, totalRoles, _ := h.roleRepo.List(0, 1)

	// 项目资产分布
	projectAssetDistribution := make(map[string]int64)
	for projectID, count := range assetCounts {
		project, err := h.projectRepo.GetByID(projectID)
		if err == nil && project != nil {
			projectAssetDistribution[project.Name] = count
		}
	}

	// 最近活动（审计日志）
	recentActivities, _ := h.auditRepo.GetRecentLogs(10)

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"total_assets":   totalAssets,
			"total_users":    totalUsers,
			"total_projects": totalProjects,
			"total_groups":   totalGroups,
			"total_roles":    totalRoles,
		},
		"assets_by_status":     statusCounts,
		"assets_by_type":       typeCounts,
		"project_distribution": projectAssetDistribution,
		"recent_activities":    recentActivities,
	})
}
