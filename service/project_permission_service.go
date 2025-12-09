package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type ProjectPermissionService interface {
	AssignPermissionToRole(projectID, roleID uuid.UUID, action string) error
	AssignPermissionToUser(projectID, userID uuid.UUID, action string) error
	RevokePermission(permissionID uuid.UUID) error
	GetProjectPermissions(projectID uuid.UUID) ([]*model.ProjectPermission, error)
	GetRoleProjectPermissions(roleID uuid.UUID) ([]*model.ProjectPermission, error)
	GetUserProjectPermissions(userID uuid.UUID) ([]*model.ProjectPermission, error)
	CheckUserProjectPermission(userID, projectID uuid.UUID, action string) (bool, error)
}

type projectPermissionService struct {
	permissionRepo      repository.ProjectPermissionRepository
	projectRepo         repository.ProjectRepository
	userRoleRepo        repository.UserRoleRepository
	groupRoleRepo       repository.GroupRoleRepository
	userGroupMemberRepo repository.UserGroupMemberRepository
}

func NewProjectPermissionService(
	permissionRepo repository.ProjectPermissionRepository,
	projectRepo repository.ProjectRepository,
	userRoleRepo repository.UserRoleRepository,
	groupRoleRepo repository.GroupRoleRepository,
	userGroupMemberRepo repository.UserGroupMemberRepository,
) ProjectPermissionService {
	return &projectPermissionService{
		permissionRepo:      permissionRepo,
		projectRepo:         projectRepo,
		userRoleRepo:        userRoleRepo,
		groupRoleRepo:       groupRoleRepo,
		userGroupMemberRepo: userGroupMemberRepo,
	}
}

func (s *projectPermissionService) AssignPermissionToRole(projectID, roleID uuid.UUID, action string) error {
	// 验证项目是否存在
	_, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return errors.New("项目不存在")
	}

	// 检查权限是否已存在
	has, err := s.permissionRepo.HasPermission(projectID, &roleID, nil, action)
	if err != nil {
		return err
	}
	if has {
		return errors.New("该角色已拥有此权限")
	}

	permission := &model.ProjectPermission{
		ProjectID: projectID,
		RoleID:    &roleID,
		UserID:    nil,
		Action:    action,
	}

	return s.permissionRepo.Create(permission)
}

func (s *projectPermissionService) AssignPermissionToUser(projectID, userID uuid.UUID, action string) error {
	// 验证项目是否存在
	_, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return errors.New("项目不存在")
	}

	// 检查权限是否已存在
	has, err := s.permissionRepo.HasPermission(projectID, nil, &userID, action)
	if err != nil {
		return err
	}
	if has {
		return errors.New("该用户已拥有此权限")
	}

	permission := &model.ProjectPermission{
		ProjectID: projectID,
		RoleID:    nil,
		UserID:    &userID,
		Action:    action,
	}

	return s.permissionRepo.Create(permission)
}

func (s *projectPermissionService) RevokePermission(permissionID uuid.UUID) error {
	return s.permissionRepo.Delete(permissionID)
}

func (s *projectPermissionService) GetProjectPermissions(projectID uuid.UUID) ([]*model.ProjectPermission, error) {
	return s.permissionRepo.GetByProjectID(projectID)
}

func (s *projectPermissionService) GetRoleProjectPermissions(roleID uuid.UUID) ([]*model.ProjectPermission, error) {
	return s.permissionRepo.GetByRoleID(roleID)
}

func (s *projectPermissionService) GetUserProjectPermissions(userID uuid.UUID) ([]*model.ProjectPermission, error) {
	return s.permissionRepo.GetByUserID(userID)
}

func (s *projectPermissionService) CheckUserProjectPermission(userID, projectID uuid.UUID, action string) (bool, error) {
	// 1. 检查用户直接分配的权限
	has, err := s.permissionRepo.HasPermission(projectID, nil, &userID, action)
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
		has, err := s.permissionRepo.HasPermission(projectID, &role.ID, nil, action)
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
			has, err := s.permissionRepo.HasPermission(projectID, &role.ID, nil, action)
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
