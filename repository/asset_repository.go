package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type AssetRepository interface {
	Create(asset *model.Asset) error
	GetByID(id uuid.UUID) (*model.Asset, error)
	List(offset, limit int, filters map[string]interface{}) ([]*model.Asset, int64, error)
	Update(asset *model.Asset) error
	Delete(id uuid.UUID) error
	GetByProjectID(projectID uuid.UUID) ([]*model.Asset, error)
	CountByProject() (map[uuid.UUID]int64, error)
}

type assetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) AssetRepository {
	return &assetRepository{db: db}
}

func (r *assetRepository) Create(asset *model.Asset) error {
	return r.db.Create(asset).Error
}

func (r *assetRepository) GetByID(id uuid.UUID) (*model.Asset, error) {
	var asset model.Asset
	err := r.db.Preload("Project").Where("id = ?", id).First(&asset).Error
	if err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *assetRepository) List(offset, limit int, filters map[string]interface{}) ([]*model.Asset, int64, error) {
	var assets []*model.Asset
	var total int64

	query := r.db.Model(&model.Asset{})

	// 应用过滤器
	if assetType, ok := filters["type"].(string); ok && assetType != "" {
		query = query.Where("type = ?", assetType)
	}
	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if projectID, ok := filters["project_id"].(string); ok && projectID != "" {
		projectUUID, err := uuid.Parse(projectID)
		if err == nil {
			query = query.Where("project_id = ?", projectUUID)
		}
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据，预加载项目信息
	err := query.Preload("Project").Offset(offset).Limit(limit).Order("created_at DESC").Find(&assets).Error
	return assets, total, err
}

func (r *assetRepository) Update(asset *model.Asset) error {
	return r.db.Save(asset).Error
}

func (r *assetRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Asset{}, id).Error
}

func (r *assetRepository) GetByProjectID(projectID uuid.UUID) ([]*model.Asset, error) {
	var assets []*model.Asset
	err := r.db.Preload("Project").Where("project_id = ?", projectID).Find(&assets).Error
	return assets, err
}

func (r *assetRepository) CountByProject() (map[uuid.UUID]int64, error) {
	var results []struct {
		ProjectID uuid.UUID
		Count     int64
	}
	err := r.db.Model(&model.Asset{}).
		Select("project_id, COUNT(*) as count").
		Where("project_id IS NOT NULL").
		Group("project_id").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	counts := make(map[uuid.UUID]int64)
	for _, result := range results {
		counts[result.ProjectID] = result.Count
	}
	return counts, nil
}

