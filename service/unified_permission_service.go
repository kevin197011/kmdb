package service

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

// UnifiedPermissionService 统一权限服务
// 整合了所有权限检查逻辑，支持缓存
type UnifiedPermissionService interface {
	// ========== 权限授予 ==========
	GrantPermission(grant *model.PermissionGrant) error
	RevokePermission(permissionID uuid.UUID) error
	RevokeAllPermissions(subjectType string, subjectID uuid.UUID) error

	// ========== 权限检查 ==========
	// 检查用户是否有指定的功能权限
	CheckPermission(userID uuid.UUID, resourceType, action string) (bool, error)

	// 检查用户是否有指定资源的权限
	CheckResourcePermission(userID uuid.UUID, resourceType string, resourceID uuid.UUID, action string) (bool, error)

	// 检查用户是否是超级管理员
	IsSuperAdmin(userID uuid.UUID) (bool, error)

	// ========== 权限查询 ==========
	// 获取用户的权限摘要（用于前端展示）
	GetUserPermissionSummary(userID uuid.UUID) (*model.UserPermissionSummary, error)

	// 获取主体的所有权限
	GetSubjectPermissions(subjectType string, subjectID uuid.UUID) ([]*model.ScopedPermission, error)

	// 获取资源的所有权限
	GetResourcePermissions(resourceType string, resourceID *uuid.UUID) ([]*model.ScopedPermission, error)

	// 获取用户可访问的资源 ID 列表
	GetAccessibleResourceIDs(userID uuid.UUID, resourceType, action string) ([]uuid.UUID, error)

	// ========== 缓存管理 ==========
	InvalidateUserCache(userID uuid.UUID)
	InvalidateAllCache()
}

// permissionCache 权限缓存
type permissionCache struct {
	mu   sync.RWMutex
	data map[uuid.UUID]*cachedPermissions
	ttl  time.Duration
}

type cachedPermissions struct {
	permissions []*model.ScopedPermission
	roleIDs     []uuid.UUID
	teamIDs     []uuid.UUID
	expireAt    time.Time
}

type unifiedPermissionService struct {
	permissionRepo repository.ScopedPermissionRepository
	teamRepo       repository.TeamRepository
	userRoleRepo   repository.UserRoleRepository
	roleRepo       repository.RoleRepository
	cache          *permissionCache
}

func NewUnifiedPermissionService(
	permissionRepo repository.ScopedPermissionRepository,
	teamRepo repository.TeamRepository,
	userRoleRepo repository.UserRoleRepository,
	roleRepo repository.RoleRepository,
) UnifiedPermissionService {
	return &unifiedPermissionService{
		permissionRepo: permissionRepo,
		teamRepo:       teamRepo,
		userRoleRepo:   userRoleRepo,
		roleRepo:       roleRepo,
		cache: &permissionCache{
			data: make(map[uuid.UUID]*cachedPermissions),
			ttl:  5 * time.Minute, // 缓存 5 分钟
		},
	}
}

// ========== 权限授予 ==========

func (s *unifiedPermissionService) GrantPermission(grant *model.PermissionGrant) error {
	// 验证参数
	if grant.SubjectType == "" || grant.ResourceType == "" || grant.Action == "" {
		return errors.New("参数不完整")
	}

	// 检查是否已存在相同权限
	has, err := s.permissionRepo.HasPermission(
		grant.SubjectType,
		grant.SubjectID,
		grant.ResourceType,
		grant.ResourceID,
		grant.Action,
	)
	if err != nil {
		return err
	}
	if has {
		return errors.New("权限已存在")
	}

	// 创建权限记录
	permission := &model.ScopedPermission{
		SubjectType:  grant.SubjectType,
		SubjectID:    grant.SubjectID,
		ResourceType: grant.ResourceType,
		ResourceID:   grant.ResourceID,
		Action:       grant.Action,
	}

	if err := s.permissionRepo.Create(permission); err != nil {
		return err
	}

	// 清除相关缓存
	if grant.SubjectType == model.SubjectTypeUser {
		s.InvalidateUserCache(grant.SubjectID)
	} else {
		// 角色或团队权限变更，清除所有缓存
		s.InvalidateAllCache()
	}

	return nil
}

func (s *unifiedPermissionService) RevokePermission(permissionID uuid.UUID) error {
	// 获取权限信息以便清除缓存
	perm, err := s.permissionRepo.GetByID(permissionID)
	if err != nil {
		return err
	}

	if err := s.permissionRepo.Delete(permissionID); err != nil {
		return err
	}

	// 清除缓存
	if perm.SubjectType == model.SubjectTypeUser {
		s.InvalidateUserCache(perm.SubjectID)
	} else {
		s.InvalidateAllCache()
	}

	return nil
}

func (s *unifiedPermissionService) RevokeAllPermissions(subjectType string, subjectID uuid.UUID) error {
	if err := s.permissionRepo.DeleteBySubject(subjectType, subjectID); err != nil {
		return err
	}

	if subjectType == model.SubjectTypeUser {
		s.InvalidateUserCache(subjectID)
	} else {
		s.InvalidateAllCache()
	}

	return nil
}

// ========== 权限检查 ==========

func (s *unifiedPermissionService) CheckPermission(userID uuid.UUID, resourceType, action string) (bool, error) {
	return s.CheckResourcePermission(userID, resourceType, uuid.Nil, action)
}

func (s *unifiedPermissionService) CheckResourcePermission(userID uuid.UUID, resourceType string, resourceID uuid.UUID, action string) (bool, error) {
	// 获取用户的所有权限
	permissions, _, teamIDs, err := s.getUserPermissionsWithCache(userID)
	if err != nil {
		return false, err
	}

	// 检查是否匹配
	for _, perm := range permissions {
		// 超级管理员权限（resource=*, action=*）
		if perm.ResourceType == model.ResourceTypeAll && perm.Action == model.ActionAll {
			return true, nil
		}

		// 检查资源类型匹配
		if perm.ResourceType != model.ResourceTypeAll && perm.ResourceType != resourceType {
			continue
		}

		// 检查资源 ID 匹配
		if resourceID != uuid.Nil {
			if perm.ResourceID != nil && *perm.ResourceID != resourceID {
				continue
			}
		}

		// 检查操作匹配
		if perm.Action != model.ActionAll && perm.Action != action {
			continue
		}

		return true, nil
	}

	// 检查项目继承（如果检查的是资产权限，还要检查其所属项目的权限）
	if resourceType == model.ResourceTypeAsset && resourceID != uuid.Nil {
		// 这里可以添加项目继承逻辑
		// 需要查询资产所属的项目，然后检查用户是否有项目权限
		_ = teamIDs // 暂时忽略，后续可扩展
	}

	return false, nil
}

func (s *unifiedPermissionService) IsSuperAdmin(userID uuid.UUID) (bool, error) {
	permissions, _, _, err := s.getUserPermissionsWithCache(userID)
	if err != nil {
		return false, err
	}

	for _, perm := range permissions {
		if perm.ResourceType == model.ResourceTypeAll && perm.Action == model.ActionAll {
			return true, nil
		}
	}

	return false, nil
}

// ========== 权限查询 ==========

func (s *unifiedPermissionService) GetUserPermissionSummary(userID uuid.UUID) (*model.UserPermissionSummary, error) {
	permissions, roleIDs, teamIDs, err := s.getUserPermissionsWithCache(userID)
	if err != nil {
		return nil, err
	}

	summary := &model.UserPermissionSummary{
		IsSuperAdmin:        false,
		IsAdmin:             false,
		Roles:               make([]string, 0),
		Teams:               make([]string, 0),
		FunctionPermissions: make([]string, 0),
		AccessibleProjects:  make([]uuid.UUID, 0),
	}

	// 获取角色名称
	for _, roleID := range roleIDs {
		role, err := s.roleRepo.GetByID(roleID)
		if err == nil {
			summary.Roles = append(summary.Roles, role.Name)
			if role.Name == model.RoleSuperAdmin {
				summary.IsSuperAdmin = true
			}
			if role.Name == model.RoleAdmin {
				summary.IsAdmin = true
			}
		}
	}

	// 获取团队名称
	for _, teamID := range teamIDs {
		team, err := s.teamRepo.GetByID(teamID)
		if err == nil {
			summary.Teams = append(summary.Teams, team.Name)
		}
	}

	// 提取功能权限和可访问项目
	projectSet := make(map[uuid.UUID]bool)
	permSet := make(map[string]bool)

	for _, perm := range permissions {
		// 超级管理员
		if perm.ResourceType == model.ResourceTypeAll && perm.Action == model.ActionAll {
			summary.IsSuperAdmin = true
		}

		// 功能权限
		if perm.ResourceID == nil {
			key := perm.ResourceType + ":" + perm.Action
			if !permSet[key] {
				permSet[key] = true
				summary.FunctionPermissions = append(summary.FunctionPermissions, key)
			}
		}

		// 可访问的项目
		if perm.ResourceType == model.ResourceTypeProject && perm.ResourceID != nil {
			if !projectSet[*perm.ResourceID] {
				projectSet[*perm.ResourceID] = true
				summary.AccessibleProjects = append(summary.AccessibleProjects, *perm.ResourceID)
			}
		}
	}

	return summary, nil
}

func (s *unifiedPermissionService) GetSubjectPermissions(subjectType string, subjectID uuid.UUID) ([]*model.ScopedPermission, error) {
	return s.permissionRepo.GetBySubject(subjectType, subjectID)
}

func (s *unifiedPermissionService) GetResourcePermissions(resourceType string, resourceID *uuid.UUID) ([]*model.ScopedPermission, error) {
	return s.permissionRepo.GetByResource(resourceType, resourceID)
}

func (s *unifiedPermissionService) GetAccessibleResourceIDs(userID uuid.UUID, resourceType, action string) ([]uuid.UUID, error) {
	permissions, _, _, err := s.getUserPermissionsWithCache(userID)
	if err != nil {
		return nil, err
	}

	resourceIDs := make([]uuid.UUID, 0)
	hasAllAccess := false

	for _, perm := range permissions {
		// 全局权限
		if perm.ResourceType == model.ResourceTypeAll && perm.Action == model.ActionAll {
			hasAllAccess = true
			break
		}

		// 该资源类型的全局权限
		if perm.ResourceType == resourceType && perm.ResourceID == nil {
			if perm.Action == model.ActionAll || perm.Action == action {
				hasAllAccess = true
				break
			}
		}

		// 特定资源的权限
		if perm.ResourceType == resourceType && perm.ResourceID != nil {
			if perm.Action == model.ActionAll || perm.Action == action {
				resourceIDs = append(resourceIDs, *perm.ResourceID)
			}
		}
	}

	if hasAllAccess {
		// 返回空表示有所有资源的访问权限
		return nil, nil
	}

	return resourceIDs, nil
}

// ========== 缓存管理 ==========

func (s *unifiedPermissionService) InvalidateUserCache(userID uuid.UUID) {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	delete(s.cache.data, userID)
}

func (s *unifiedPermissionService) InvalidateAllCache() {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	s.cache.data = make(map[uuid.UUID]*cachedPermissions)
}

// getUserPermissionsWithCache 获取用户权限（带缓存）
func (s *unifiedPermissionService) getUserPermissionsWithCache(userID uuid.UUID) ([]*model.ScopedPermission, []uuid.UUID, []uuid.UUID, error) {
	// 检查缓存
	s.cache.mu.RLock()
	if cached, ok := s.cache.data[userID]; ok && time.Now().Before(cached.expireAt) {
		s.cache.mu.RUnlock()
		return cached.permissions, cached.roleIDs, cached.teamIDs, nil
	}
	s.cache.mu.RUnlock()

	// 获取用户的角色
	roleIDs := make([]uuid.UUID, 0)
	userRoles, err := s.userRoleRepo.GetUserRoles(userID)
	if err == nil {
		for _, role := range userRoles {
			roleIDs = append(roleIDs, role.ID)
		}
	}

	// 获取用户的团队
	teamIDs := make([]uuid.UUID, 0)
	teams, err := s.teamRepo.GetUserTeams(userID)
	if err == nil {
		for _, team := range teams {
			teamIDs = append(teamIDs, team.ID)
		}
	}

	// 获取所有权限
	permissions, err := s.permissionRepo.GetUserAllPermissions(userID, teamIDs, roleIDs)
	if err != nil {
		return nil, nil, nil, err
	}

	// 更新缓存
	s.cache.mu.Lock()
	s.cache.data[userID] = &cachedPermissions{
		permissions: permissions,
		roleIDs:     roleIDs,
		teamIDs:     teamIDs,
		expireAt:    time.Now().Add(s.cache.ttl),
	}
	s.cache.mu.Unlock()

	return permissions, roleIDs, teamIDs, nil
}
