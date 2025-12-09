package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type AssetPermissionRepository interface {
	Create(permission *model.AssetPermission) error
	GetByID(id uuid.UUID) (*model.AssetPermission, error)
	GetByAssetID(assetID uuid.UUID) ([]*model.AssetPermission, error)
	GetByRoleID(roleID uuid.UUID) ([]*model.AssetPermission, error)
	GetByUserID(userID uuid.UUID) ([]*model.AssetPermission, error)
	GetByAssetAndRole(assetID, roleID uuid.UUID) ([]*model.AssetPermission, error)
	GetByAssetAndUser(assetID, userID uuid.UUID) ([]*model.AssetPermission, error)
	Delete(id uuid.UUID) error
	DeleteByAssetID(assetID uuid.UUID) error
	HasPermission(assetID uuid.UUID, roleID, userID *uuid.UUID, action string) (bool, error)
}

type assetPermissionRepository struct {
	db *gorm.DB
}

func NewAssetPermissionRepository(db *gorm.DB) AssetPermissionRepository {
	return &assetPermissionRepository{db: db}
}

func (r *assetPermissionRepository) Create(permission *model.AssetPermission) error {
	return r.db.Create(permission).Error
}

func (r *assetPermissionRepository) GetByID(id uuid.UUID) (*model.AssetPermission, error) {
	var permission model.AssetPermission
	err := r.db.Where("id = ?", id).Preload("Asset").Preload("Role").Preload("User").First(&permission).Error
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *assetPermissionRepository) GetByAssetID(assetID uuid.UUID) ([]*model.AssetPermission, error) {
	var permissions []*model.AssetPermission
	err := r.db.Where("asset_id = ?", assetID).
		Preload("Role").Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *assetPermissionRepository) GetByRoleID(roleID uuid.UUID) ([]*model.AssetPermission, error) {
	var permissions []*model.AssetPermission
	err := r.db.Where("role_id = ?", roleID).
		Preload("Asset").Preload("Role").
		Find(&permissions).Error
	return permissions, err
}

func (r *assetPermissionRepository) GetByUserID(userID uuid.UUID) ([]*model.AssetPermission, error) {
	var permissions []*model.AssetPermission
	err := r.db.Where("user_id = ?", userID).
		Preload("Asset").Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *assetPermissionRepository) GetByAssetAndRole(assetID, roleID uuid.UUID) ([]*model.AssetPermission, error) {
	var permissions []*model.AssetPermission
	err := r.db.Where("asset_id = ? AND role_id = ?", assetID, roleID).
		Preload("Asset").Preload("Role").
		Find(&permissions).Error
	return permissions, err
}

func (r *assetPermissionRepository) GetByAssetAndUser(assetID, userID uuid.UUID) ([]*model.AssetPermission, error) {
	var permissions []*model.AssetPermission
	err := r.db.Where("asset_id = ? AND user_id = ?", assetID, userID).
		Preload("Asset").Preload("User").
		Find(&permissions).Error
	return permissions, err
}

func (r *assetPermissionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.AssetPermission{}, id).Error
}

func (r *assetPermissionRepository) DeleteByAssetID(assetID uuid.UUID) error {
	return r.db.Where("asset_id = ?", assetID).Delete(&model.AssetPermission{}).Error
}

func (r *assetPermissionRepository) HasPermission(assetID uuid.UUID, roleID, userID *uuid.UUID, action string) (bool, error) {
	var count int64
	query := r.db.Model(&model.AssetPermission{}).
		Where("asset_id = ? AND action = ?", assetID, action)

	if roleID != nil {
		query = query.Where("role_id = ?", *roleID)
	}
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Count(&count).Error
	return count > 0, err
}
