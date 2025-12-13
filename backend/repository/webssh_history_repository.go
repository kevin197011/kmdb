package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type WebSSHHistoryRepository interface {
	RecordConnection(userID, assetID uuid.UUID) error
	GetUserHistory(userID uuid.UUID, limit int) ([]*model.Asset, error)
	GetConnectionCount(userID, assetID uuid.UUID) (int, error)
}

type websshHistoryRepository struct {
	db *gorm.DB
}

func NewWebSSHHistoryRepository(db *gorm.DB) WebSSHHistoryRepository {
	return &websshHistoryRepository{db: db}
}

func (r *websshHistoryRepository) RecordConnection(userID, assetID uuid.UUID) error {
	var history model.UserWebSSHHistory
	err := r.db.Where("user_id = ? AND asset_id = ?", userID, assetID).
		First(&history).Error

	if err == gorm.ErrRecordNotFound {
		// 创建新记录
		history = model.UserWebSSHHistory{
			UserID:          userID,
			AssetID:         assetID,
			ConnectionCount: 1,
		}
		return r.db.Create(&history).Error
	} else if err != nil {
		return err
	}

	// 更新现有记录
	history.ConnectionCount++
	return r.db.Save(&history).Error
}

func (r *websshHistoryRepository) GetUserHistory(userID uuid.UUID, limit int) ([]*model.Asset, error) {
	var assets []*model.Asset
	err := r.db.Table("assets").
		Joins("JOIN user_webssh_history ON assets.id = user_webssh_history.asset_id").
		Where("user_webssh_history.user_id = ?", userID).
		Order("user_webssh_history.last_connected_at DESC").
		Limit(limit).
		Find(&assets).Error
	return assets, err
}

func (r *websshHistoryRepository) GetConnectionCount(userID, assetID uuid.UUID) (int, error) {
	var history model.UserWebSSHHistory
	err := r.db.Where("user_id = ? AND asset_id = ?", userID, assetID).
		First(&history).Error
	if err == gorm.ErrRecordNotFound {
		return 0, nil
	}
	return history.ConnectionCount, err
}

