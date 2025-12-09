package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type FavoriteService interface {
	AddFavorite(userID, assetID uuid.UUID) error
	RemoveFavorite(userID, assetID uuid.UUID) error
	IsFavorite(userID, assetID uuid.UUID) (bool, error)
	GetUserFavorites(userID uuid.UUID) ([]*model.Asset, error)
}

type favoriteService struct {
	favoriteRepo repository.FavoriteRepository
	assetRepo    repository.AssetRepository
}

func NewFavoriteService(
	favoriteRepo repository.FavoriteRepository,
	assetRepo repository.AssetRepository,
) FavoriteService {
	return &favoriteService{
		favoriteRepo: favoriteRepo,
		assetRepo:    assetRepo,
	}
}

func (s *favoriteService) AddFavorite(userID, assetID uuid.UUID) error {
	// 验证资产存在
	_, err := s.assetRepo.GetByID(assetID)
	if err != nil {
		return errors.New("资产不存在")
	}

	// 检查是否已收藏
	isFavorite, err := s.favoriteRepo.IsFavorite(userID, assetID)
	if err != nil {
		return err
	}
	if isFavorite {
		return errors.New("已收藏")
	}

	return s.favoriteRepo.AddFavorite(userID, assetID)
}

func (s *favoriteService) RemoveFavorite(userID, assetID uuid.UUID) error {
	return s.favoriteRepo.RemoveFavorite(userID, assetID)
}

func (s *favoriteService) IsFavorite(userID, assetID uuid.UUID) (bool, error) {
	return s.favoriteRepo.IsFavorite(userID, assetID)
}

func (s *favoriteService) GetUserFavorites(userID uuid.UUID) ([]*model.Asset, error) {
	return s.favoriteRepo.GetUserFavorites(userID)
}

