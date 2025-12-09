package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type FavoriteRepository interface {
	AddFavorite(userID, assetID uuid.UUID) error
	RemoveFavorite(userID, assetID uuid.UUID) error
	IsFavorite(userID, assetID uuid.UUID) (bool, error)
	GetUserFavorites(userID uuid.UUID) ([]*model.Asset, error)
}

type favoriteRepository struct {
	db *gorm.DB
}

func NewFavoriteRepository(db *gorm.DB) FavoriteRepository {
	return &favoriteRepository{db: db}
}

func (r *favoriteRepository) AddFavorite(userID, assetID uuid.UUID) error {
	favorite := &model.UserFavoriteAsset{
		UserID:  userID,
		AssetID: assetID,
	}
	return r.db.Create(favorite).Error
}

func (r *favoriteRepository) RemoveFavorite(userID, assetID uuid.UUID) error {
	return r.db.Where("user_id = ? AND asset_id = ?", userID, assetID).
		Delete(&model.UserFavoriteAsset{}).Error
}

func (r *favoriteRepository) IsFavorite(userID, assetID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.UserFavoriteAsset{}).
		Where("user_id = ? AND asset_id = ?", userID, assetID).
		Count(&count).Error
	return count > 0, err
}

func (r *favoriteRepository) GetUserFavorites(userID uuid.UUID) ([]*model.Asset, error) {
	var assets []*model.Asset
	err := r.db.Table("assets").
		Joins("JOIN user_favorite_assets ON assets.id = user_favorite_assets.asset_id").
		Where("user_favorite_assets.user_id = ?", userID).
		Order("user_favorite_assets.created_at DESC").
		Find(&assets).Error
	return assets, err
}

