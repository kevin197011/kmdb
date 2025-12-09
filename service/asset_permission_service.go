package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AssetPermissionService interface {
	AssignPermissionToRole(assetID, roleID uuid.UUID, action string) error
	AssignPermissionToUser(assetID, userID uuid.UUID, action string) error
	RevokePermission(permissionID uuid.UUID) error
	GetAssetPermissions(assetID uuid.UUID) ([]*model.AssetPermission, error)
	GetRoleAssetPermissions(roleID uuid.UUID) ([]*model.AssetPermission, error)
	GetUserAssetPermissions(userID uuid.UUID) ([]*model.AssetPermission, error)
	CheckUserAssetPermission(userID, assetID uuid.UUID, action string) (bool, error)
}

type assetPermissionService struct {
	permissionRepo      repository.AssetPermissionRepository
	assetRepo           repository.AssetRepository
	userRoleRepo        repository.UserRoleRepository
	groupRoleRepo       repository.GroupRoleRepository
	userGroupMemberRepo repository.UserGroupMemberRepository
}

func NewAssetPermissionService(
	permissionRepo repository.AssetPermissionRepository,
	assetRepo repository.AssetRepository,
	userRoleRepo repository.UserRoleRepository,
	groupRoleRepo repository.GroupRoleRepository,
	userGroupMemberRepo repository.UserGroupMemberRepository,
) AssetPermissionService {
	return &assetPermissionService{
		permissionRepo:      permissionRepo,
		assetRepo:           assetRepo,
		userRoleRepo:        userRoleRepo,
		groupRoleRepo:       groupRoleRepo,
		userGroupMemberRepo: userGroupMemberRepo,
	}
}

func (s *assetPermissionService) AssignPermissionToRole(assetID, roleID uuid.UUID, action string) error {
	// 验证资产是否存在
	_, err := s.assetRepo.GetByID(assetID)
	if err != nil {
		return errors.New("资产不存在")
	}

	// 检查权限是否已存在
	has, err := s.permissionRepo.HasPermission(assetID, &roleID, nil, action)
	if err != nil {
		return err
	}
	if has {
		return errors.New("该角色已拥有此权限")
	}

	permission := &model.AssetPermission{
		AssetID: assetID,
		RoleID:  &roleID,
		UserID:  nil,
		Action:  action,
	}

	return s.permissionRepo.Create(permission)
}

func (s *assetPermissionService) AssignPermissionToUser(assetID, userID uuid.UUID, action string) error {
	// 验证资产是否存在
	_, err := s.assetRepo.GetByID(assetID)
	if err != nil {
		return errors.New("资产不存在")
	}

	// 检查权限是否已存在
	has, err := s.permissionRepo.HasPermission(assetID, nil, &userID, action)
	if err != nil {
		return err
	}
	if has {
		return errors.New("该用户已拥有此权限")
	}

	permission := &model.AssetPermission{
		AssetID: assetID,
		RoleID:  nil,
		UserID:  &userID,
		Action:  action,
	}

	return s.permissionRepo.Create(permission)
}

func (s *assetPermissionService) RevokePermission(permissionID uuid.UUID) error {
	return s.permissionRepo.Delete(permissionID)
}

func (s *assetPermissionService) GetAssetPermissions(assetID uuid.UUID) ([]*model.AssetPermission, error) {
	return s.permissionRepo.GetByAssetID(assetID)
}

func (s *assetPermissionService) GetRoleAssetPermissions(roleID uuid.UUID) ([]*model.AssetPermission, error) {
	return s.permissionRepo.GetByRoleID(roleID)
}

func (s *assetPermissionService) GetUserAssetPermissions(userID uuid.UUID) ([]*model.AssetPermission, error) {
	return s.permissionRepo.GetByUserID(userID)
}

func (s *assetPermissionService) CheckUserAssetPermission(userID, assetID uuid.UUID, action string) (bool, error) {
	// 1. 检查用户直接分配的权限
	has, err := s.permissionRepo.HasPermission(assetID, nil, &userID, action)
	if err != nil {
		return false, err
	}
	if has {
		return true, nil
	}

	// 2. 检查用户通过角色获得的权限
	userRoles, err := s.userRoleRepo.GetUserRoles(userID)
	if err != nil {
		return false, err
	}

	for _, role := range userRoles {
		has, err := s.permissionRepo.HasPermission(assetID, &role.ID, nil, action)
		if err != nil {
			continue
		}
		if has {
			return true, nil
		}
	}

	// 3. 检查用户通过群组角色获得的权限
	userGroups, err := s.userGroupMemberRepo.GetUserGroups(userID)
	if err != nil {
		return false, err
	}

	for _, group := range userGroups {
		// 获取群组的角色
		groupRoles, err := s.groupRoleRepo.GetGroupRoles(group.ID)
		if err != nil {
			continue
		}

		for _, role := range groupRoles {
			has, err := s.permissionRepo.HasPermission(assetID, &role.ID, nil, action)
			if err != nil {
				continue
			}
			if has {
				return true, nil
			}
		}
	}

	return false, nil
}
