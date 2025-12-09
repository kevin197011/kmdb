package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type ProjectPermissionRepository interface {
	Create(permission *model.ProjectPermission) error
	GetByID(id uuid.UUID) (*model.ProjectPermission, error)
	GetByProjectID(projectID uuid.UUID) ([]*model.ProjectPermission, error)
	GetByRoleID(roleID uuid.UUID) ([]*model.ProjectPermission, error)
	GetByUserID(userID uuid.UUID) ([]*model.ProjectPermission, error)
	GetByProjectAndRole(projectID, roleID uuid.UUID) ([]*model.ProjectPermission, error)
	GetByProjectAndUser(projectID, userID uuid.UUID) ([]*model.ProjectPermission, error)
	Delete(id uuid.UUID) error
	DeleteByProjectID(projectID uuid.UUID) error
	HasPermission(projectID uuid.UUID, roleID, userID *uuid.UUID, action string) (bool, error)
}

type projectPermissionRepository struct {
	db *gorm.DB
}

func NewProjectPermissionRepository(db *gorm.DB) ProjectPermissionRepository {
	return &projectPermissionRepository{db: db}
}

func (r *projectPermissionRepository) Create(permission *model.ProjectPermission) error {
	return r.db.Create(permission).Error
}

func (r *projectPermissionRepository) GetByID(id uuid.UUID) (*model.ProjectPermission, error) {
	var permission model.ProjectPermission
	err := r.db.Where("id = ?", id).Preload("Project").Preload("Role").Preload("User").First(&permission).Error
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *projectPermissionRepository) GetByProjectID(projectID uuid.UUID) ([]*model.ProjectPermission, error) {
	var permissions []*model.ProjectPermission
	err := r.db.Where("project_id = ?", projectID).
		Preload("Project").Preload("Role").Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *projectPermissionRepository) GetByRoleID(roleID uuid.UUID) ([]*model.ProjectPermission, error) {
	var permissions []*model.ProjectPermission
	err := r.db.Where("role_id = ?", roleID).
		Preload("Role").
		Find(&permissions).Error
	return permissions, err
}

func (r *projectPermissionRepository) GetByUserID(userID uuid.UUID) ([]*model.ProjectPermission, error) {
	var permissions []*model.ProjectPermission
	err := r.db.Where("user_id = ?", userID).
		Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *projectPermissionRepository) GetByProjectAndRole(projectID, roleID uuid.UUID) ([]*model.ProjectPermission, error) {
	var permissions []*model.ProjectPermission
	err := r.db.Where("project_id = ? AND role_id = ?", projectID, roleID).
		Preload("Project").Preload("Role").
		Find(&permissions).Error
	return permissions, err
}

func (r *projectPermissionRepository) GetByProjectAndUser(projectID, userID uuid.UUID) ([]*model.ProjectPermission, error) {
	var permissions []*model.ProjectPermission
	err := r.db.Where("project_id = ? AND user_id = ?", projectID, userID).
		Preload("Project").Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *projectPermissionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ProjectPermission{}, id).Error
}

func (r *projectPermissionRepository) DeleteByProjectID(projectID uuid.UUID) error {
	return r.db.Where("project_id = ?", projectID).Delete(&model.ProjectPermission{}).Error
}

func (r *projectPermissionRepository) HasPermission(projectID uuid.UUID, roleID, userID *uuid.UUID, action string) (bool, error) {
	var count int64
	query := r.db.Model(&model.ProjectPermission{}).
		Where("project_id = ? AND action = ?", projectID, action)

	if roleID != nil {
		query = query.Where("role_id = ?", *roleID)
	}
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Count(&count).Error
	return count > 0, err
}
