package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type UserGroupRepository interface {
	Create(group *model.UserGroup) error
	GetByID(id uuid.UUID) (*model.UserGroup, error)
	List(offset, limit int) ([]*model.UserGroup, int64, error)
	Update(group *model.UserGroup) error
	Delete(id uuid.UUID) error
}

type UserGroupMemberRepository interface {
	AddMember(userID, groupID uuid.UUID) error
	RemoveMember(userID, groupID uuid.UUID) error
	GetMembers(groupID uuid.UUID) ([]*model.User, error)
	GetUserGroups(userID uuid.UUID) ([]*model.UserGroup, error)
	IsMember(userID, groupID uuid.UUID) (bool, error)
}

type userGroupRepository struct {
	db *gorm.DB
}

func NewUserGroupRepository(db *gorm.DB) UserGroupRepository {
	return &userGroupRepository{db: db}
}

func (r *userGroupRepository) Create(group *model.UserGroup) error {
	return r.db.Create(group).Error
}

func (r *userGroupRepository) GetByID(id uuid.UUID) (*model.UserGroup, error) {
	var group model.UserGroup
	err := r.db.Where("id = ?", id).First(&group).Error
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func (r *userGroupRepository) List(offset, limit int) ([]*model.UserGroup, int64, error) {
	var groups []*model.UserGroup
	var total int64

	if err := r.db.Model(&model.UserGroup{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&groups).Error
	return groups, total, err
}

func (r *userGroupRepository) Update(group *model.UserGroup) error {
	return r.db.Save(group).Error
}

func (r *userGroupRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.UserGroup{}, id).Error
}

type userGroupMemberRepository struct {
	db *gorm.DB
}

func NewUserGroupMemberRepository(db *gorm.DB) UserGroupMemberRepository {
	return &userGroupMemberRepository{db: db}
}

func (r *userGroupMemberRepository) AddMember(userID, groupID uuid.UUID) error {
	member := &model.UserGroupMember{
		UserID:  userID,
		GroupID: groupID,
	}
	return r.db.Create(member).Error
}

func (r *userGroupMemberRepository) RemoveMember(userID, groupID uuid.UUID) error {
	return r.db.Where("user_id = ? AND group_id = ?", userID, groupID).
		Delete(&model.UserGroupMember{}).Error
}

func (r *userGroupMemberRepository) GetMembers(groupID uuid.UUID) ([]*model.User, error) {
	var users []*model.User
	err := r.db.Table("users").
		Joins("JOIN user_group_members ON users.id = user_group_members.user_id").
		Where("user_group_members.group_id = ?", groupID).
		Find(&users).Error
	return users, err
}

func (r *userGroupMemberRepository) GetUserGroups(userID uuid.UUID) ([]*model.UserGroup, error) {
	var groups []*model.UserGroup
	err := r.db.Table("user_groups").
		Joins("JOIN user_group_members ON user_groups.id = user_group_members.group_id").
		Where("user_group_members.user_id = ?", userID).
		Find(&groups).Error
	return groups, err
}

func (r *userGroupMemberRepository) IsMember(userID, groupID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.UserGroupMember{}).
		Where("user_id = ? AND group_id = ?", userID, groupID).
		Count(&count).Error
	return count > 0, err
}

