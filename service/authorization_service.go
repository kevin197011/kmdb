package service

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AuthorizationService interface {
	CreateRole(role *model.Role) error
	GetRole(id uuid.UUID) (*model.Role, error)
	ListRoles(offset, limit int) ([]*model.Role, int64, error)
	UpdateRole(id uuid.UUID, role *model.Role) error
	DeleteRole(id uuid.UUID) error

	CreatePermission(permission *model.Permission) error
	GetPermission(id uuid.UUID) (*model.Permission, error)
	ListPermissions() ([]*model.Permission, error)
	GetPermissionsByResource(resource string) ([]*model.Permission, error)

	AssignPermissionToRole(roleID, permissionID uuid.UUID) error
	RevokePermissionFromRole(roleID, permissionID uuid.UUID) error
	GetRolePermissions(roleID uuid.UUID) ([]*model.Permission, error)

	AssignRoleToUser(userID, roleID uuid.UUID) error
	RevokeRoleFromUser(userID, roleID uuid.UUID) error
	GetUserRoles(userID uuid.UUID) ([]*model.Role, error)

	AssignRoleToGroup(groupID, roleID uuid.UUID) error
	RevokeRoleFromGroup(groupID, roleID uuid.UUID) error
	GetGroupRoles(groupID uuid.UUID) ([]*model.Role, error)

	CheckPermission(userID uuid.UUID, resource, action string) (bool, error)
	GetUserAllPermissions(userID uuid.UUID) ([]*model.Permission, error)
}

type authorizationService struct {
	roleRepo           repository.RoleRepository
	permissionRepo     repository.PermissionRepository
	rolePermissionRepo repository.RolePermissionRepository
	userRoleRepo       repository.UserRoleRepository
	groupRoleRepo      repository.GroupRoleRepository
	userGroupMemberRepo repository.UserGroupMemberRepository
}

func NewAuthorizationService(
	roleRepo repository.RoleRepository,
	permissionRepo repository.PermissionRepository,
	rolePermissionRepo repository.RolePermissionRepository,
	userRoleRepo repository.UserRoleRepository,
	groupRoleRepo repository.GroupRoleRepository,
	userGroupMemberRepo repository.UserGroupMemberRepository,
) AuthorizationService {
	return &authorizationService{
		roleRepo:           roleRepo,
		permissionRepo:     permissionRepo,
		rolePermissionRepo: rolePermissionRepo,
		userRoleRepo:       userRoleRepo,
		groupRoleRepo:      groupRoleRepo,
		userGroupMemberRepo: userGroupMemberRepo,
	}
}

func (s *authorizationService) CreateRole(role *model.Role) error {
	if role.Name == "" {
		return errors.New("角色名称不能为空")
	}
	return s.roleRepo.Create(role)
}

func (s *authorizationService) GetRole(id uuid.UUID) (*model.Role, error) {
	return s.roleRepo.GetByID(id)
}

func (s *authorizationService) ListRoles(offset, limit int) ([]*model.Role, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.roleRepo.List(offset, limit)
}

func (s *authorizationService) UpdateRole(id uuid.UUID, role *model.Role) error {
	existing, err := s.roleRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("角色不存在: %w", err)
	}

	if role.Name != "" {
		existing.Name = role.Name
	}
	if role.Description != "" {
		existing.Description = role.Description
	}

	return s.roleRepo.Update(existing)
}

func (s *authorizationService) DeleteRole(id uuid.UUID) error {
	_, err := s.roleRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("角色不存在: %w", err)
	}
	return s.roleRepo.Delete(id)
}

func (s *authorizationService) CreatePermission(permission *model.Permission) error {
	if permission.Name == "" {
		return errors.New("权限名称不能为空")
	}
	if permission.Resource == "" {
		return errors.New("资源不能为空")
	}
	if permission.Action == "" {
		return errors.New("操作不能为空")
	}
	return s.permissionRepo.Create(permission)
}

func (s *authorizationService) GetPermission(id uuid.UUID) (*model.Permission, error) {
	return s.permissionRepo.GetByID(id)
}

func (s *authorizationService) ListPermissions() ([]*model.Permission, error) {
	return s.permissionRepo.List()
}

func (s *authorizationService) GetPermissionsByResource(resource string) ([]*model.Permission, error) {
	return s.permissionRepo.GetByResource(resource)
}

func (s *authorizationService) AssignPermissionToRole(roleID, permissionID uuid.UUID) error {
	// 检查是否已分配
	has, err := s.rolePermissionRepo.HasPermission(roleID, permissionID)
	if err != nil {
		return err
	}
	if has {
		return errors.New("权限已分配给该角色")
	}
	return s.rolePermissionRepo.AssignPermission(roleID, permissionID)
}

func (s *authorizationService) RevokePermissionFromRole(roleID, permissionID uuid.UUID) error {
	return s.rolePermissionRepo.RevokePermission(roleID, permissionID)
}

func (s *authorizationService) GetRolePermissions(roleID uuid.UUID) ([]*model.Permission, error) {
	return s.rolePermissionRepo.GetRolePermissions(roleID)
}

func (s *authorizationService) AssignRoleToUser(userID, roleID uuid.UUID) error {
	has, err := s.userRoleRepo.HasRole(userID, roleID)
	if err != nil {
		return err
	}
	if has {
		return errors.New("用户已拥有该角色")
	}
	return s.userRoleRepo.AssignRole(userID, roleID)
}

func (s *authorizationService) RevokeRoleFromUser(userID, roleID uuid.UUID) error {
	return s.userRoleRepo.RevokeRole(userID, roleID)
}

func (s *authorizationService) GetUserRoles(userID uuid.UUID) ([]*model.Role, error) {
	return s.userRoleRepo.GetUserRoles(userID)
}

func (s *authorizationService) AssignRoleToGroup(groupID, roleID uuid.UUID) error {
	has, err := s.groupRoleRepo.HasRole(groupID, roleID)
	if err != nil {
		return err
	}
	if has {
		return errors.New("群组已拥有该角色")
	}
	return s.groupRoleRepo.AssignRole(groupID, roleID)
}

func (s *authorizationService) RevokeRoleFromGroup(groupID, roleID uuid.UUID) error {
	return s.groupRoleRepo.RevokeRole(groupID, roleID)
}

func (s *authorizationService) GetGroupRoles(groupID uuid.UUID) ([]*model.Role, error) {
	return s.groupRoleRepo.GetGroupRoles(groupID)
}

func (s *authorizationService) CheckPermission(userID uuid.UUID, resource, action string) (bool, error) {
	// 获取用户的所有权限
	permissions, err := s.GetUserAllPermissions(userID)
	if err != nil {
		return false, err
	}

	// 检查是否有匹配的权限
	for _, perm := range permissions {
		if perm.Resource == resource && perm.Action == action {
			return true, nil
		}
	}

	return false, nil
}

func (s *authorizationService) GetUserAllPermissions(userID uuid.UUID) ([]*model.Permission, error) {
	// 获取用户直接分配的角色
	userRoles, err := s.userRoleRepo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}

	// 获取用户所属的群组
	userGroups, err := s.userGroupMemberRepo.GetUserGroups(userID)
	if err != nil {
		return nil, err
	}

	// 获取群组的角色
	for _, group := range userGroups {
		groupRoles, err := s.groupRoleRepo.GetGroupRoles(group.ID)
		if err != nil {
			continue
		}
		userRoles = append(userRoles, groupRoles...)
	}

	// 收集所有角色的权限
	permissionMap := make(map[uuid.UUID]*model.Permission)
	for _, role := range userRoles {
		permissions, err := s.rolePermissionRepo.GetRolePermissions(role.ID)
		if err != nil {
			continue
		}
		for _, perm := range permissions {
			permissionMap[perm.ID] = perm
		}
	}

	// 转换为切片
	permissions := make([]*model.Permission, 0, len(permissionMap))
	for _, perm := range permissionMap {
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

