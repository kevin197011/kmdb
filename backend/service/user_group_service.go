package service

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type UserGroupService interface {
	CreateGroup(group *model.UserGroup) error
	GetGroup(id uuid.UUID) (*model.UserGroup, error)
	ListGroups(offset, limit int) ([]*model.UserGroup, int64, error)
	UpdateGroup(id uuid.UUID, group *model.UserGroup) error
	DeleteGroup(id uuid.UUID) error
	AddMember(groupID, userID uuid.UUID) error
	RemoveMember(groupID, userID uuid.UUID) error
	GetMembers(groupID uuid.UUID) ([]*model.User, error)
	GetUserGroups(userID uuid.UUID) ([]*model.UserGroup, error)
}

type userGroupService struct {
	groupRepo  repository.UserGroupRepository
	memberRepo repository.UserGroupMemberRepository
	userRepo   repository.UserRepository
}

func NewUserGroupService(
	groupRepo repository.UserGroupRepository,
	memberRepo repository.UserGroupMemberRepository,
	userRepo repository.UserRepository,
) UserGroupService {
	return &userGroupService{
		groupRepo:  groupRepo,
		memberRepo: memberRepo,
		userRepo:   userRepo,
	}
}

func (s *userGroupService) CreateGroup(group *model.UserGroup) error {
	if group.Name == "" {
		return errors.New("群组名称不能为空")
	}

	// 检查名称是否已存在（简化处理，实际应该添加 GetByName 方法）
	return s.groupRepo.Create(group)
}

func (s *userGroupService) GetGroup(id uuid.UUID) (*model.UserGroup, error) {
	return s.groupRepo.GetByID(id)
}

func (s *userGroupService) ListGroups(offset, limit int) ([]*model.UserGroup, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.groupRepo.List(offset, limit)
}

func (s *userGroupService) UpdateGroup(id uuid.UUID, group *model.UserGroup) error {
	existing, err := s.groupRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("群组不存在: %w", err)
	}

	if group.Name != "" {
		existing.Name = group.Name
	}
	if group.Description != "" {
		existing.Description = group.Description
	}

	return s.groupRepo.Update(existing)
}

func (s *userGroupService) DeleteGroup(id uuid.UUID) error {
	_, err := s.groupRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("群组不存在: %w", err)
	}

	return s.groupRepo.Delete(id)
}

func (s *userGroupService) AddMember(groupID, userID uuid.UUID) error {
	// 验证群组存在
	_, err := s.groupRepo.GetByID(groupID)
	if err != nil {
		return fmt.Errorf("群组不存在: %w", err)
	}

	// 验证用户存在
	_, err = s.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}

	// 检查是否已是成员
	isMember, err := s.memberRepo.IsMember(userID, groupID)
	if err != nil {
		return err
	}
	if isMember {
		return errors.New("用户已在群组中")
	}

	return s.memberRepo.AddMember(userID, groupID)
}

func (s *userGroupService) RemoveMember(groupID, userID uuid.UUID) error {
	// 检查是否是成员
	isMember, err := s.memberRepo.IsMember(userID, groupID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("用户不在群组中")
	}

	return s.memberRepo.RemoveMember(userID, groupID)
}

func (s *userGroupService) GetMembers(groupID uuid.UUID) ([]*model.User, error) {
	_, err := s.groupRepo.GetByID(groupID)
	if err != nil {
		return nil, fmt.Errorf("群组不存在: %w", err)
	}

	return s.memberRepo.GetMembers(groupID)
}

func (s *userGroupService) GetUserGroups(userID uuid.UUID) ([]*model.UserGroup, error) {
	_, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("用户不存在: %w", err)
	}

	return s.memberRepo.GetUserGroups(userID)
}

