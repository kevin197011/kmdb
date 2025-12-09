package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type AssetCredentialRepository interface {
	Create(credential *model.AssetCredential) error
	GetByID(id uuid.UUID) (*model.AssetCredential, error)
	GetByAssetID(assetID uuid.UUID) ([]*model.AssetCredential, error)
	GetAll() ([]*model.AssetCredential, error)
	GetDefaultByAssetID(assetID uuid.UUID) (*model.AssetCredential, error)
	Update(credential *model.AssetCredential) error
	Delete(id uuid.UUID) error
	SetDefault(assetID uuid.UUID, credentialID uuid.UUID) error
}

type assetCredentialRepository struct {
	db *gorm.DB
}

func NewAssetCredentialRepository(db *gorm.DB) AssetCredentialRepository {
	return &assetCredentialRepository{db: db}
}

func (r *assetCredentialRepository) Create(credential *model.AssetCredential) error {
	return r.db.Create(credential).Error
}

func (r *assetCredentialRepository) GetByID(id uuid.UUID) (*model.AssetCredential, error) {
	var credential model.AssetCredential
	err := r.db.Preload("Asset").Where("id = ?", id).First(&credential).Error
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (r *assetCredentialRepository) GetByAssetID(assetID uuid.UUID) ([]*model.AssetCredential, error) {
	var credentials []*model.AssetCredential
	err := r.db.Preload("Asset").Where("asset_id = ?", assetID).Order("is_default DESC, created_at DESC").Find(&credentials).Error
	return credentials, err
}

func (r *assetCredentialRepository) GetAll() ([]*model.AssetCredential, error) {
	var credentials []*model.AssetCredential
	err := r.db.Preload("Asset").Order("is_default DESC, created_at DESC").Find(&credentials).Error
	return credentials, err
}

func (r *assetCredentialRepository) GetDefaultByAssetID(assetID uuid.UUID) (*model.AssetCredential, error) {
	var credential model.AssetCredential
	err := r.db.Preload("Asset").Where("asset_id = ? AND is_default = ?", assetID, true).First(&credential).Error
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (r *assetCredentialRepository) Update(credential *model.AssetCredential) error {
	return r.db.Save(credential).Error
}

func (r *assetCredentialRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.AssetCredential{}, id).Error
}

func (r *assetCredentialRepository) SetDefault(assetID uuid.UUID, credentialID uuid.UUID) error {
	// 先取消该资产的所有默认凭证
	err := r.db.Model(&model.AssetCredential{}).
		Where("asset_id = ?", assetID).
		Update("is_default", false).Error
	if err != nil {
		return err
	}

	// 设置新的默认凭证
	return r.db.Model(&model.AssetCredential{}).
		Where("id = ?", credentialID).
		Update("is_default", true).Error
}
