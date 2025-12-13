package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type APITokenRepository interface {
	Create(token *model.APIToken) error
	GetByID(id uuid.UUID) (*model.APIToken, error)
	GetByToken(tokenHash string) (*model.APIToken, error)
	GetByTokenPrefix(prefix string) (*model.APIToken, error)
	GetByUserID(userID uuid.UUID) ([]model.APIToken, error)
	Update(token *model.APIToken) error
	Delete(id uuid.UUID) error
	List(page, limit int) ([]model.APIToken, int64, error)
	UpdateLastUsed(id uuid.UUID) error
}

type apiTokenRepository struct {
	db *gorm.DB
}

func NewAPITokenRepository(db *gorm.DB) APITokenRepository {
	return &apiTokenRepository{db: db}
}

func (r *apiTokenRepository) Create(token *model.APIToken) error {
	return r.db.Create(token).Error
}

func (r *apiTokenRepository) GetByID(id uuid.UUID) (*model.APIToken, error) {
	var token model.APIToken
	err := r.db.Preload("User").First(&token, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *apiTokenRepository) GetByToken(tokenHash string) (*model.APIToken, error) {
	var token model.APIToken
	err := r.db.Preload("User").First(&token, "token = ? AND status = ?", tokenHash, "active").Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *apiTokenRepository) GetByTokenPrefix(prefix string) (*model.APIToken, error) {
	var token model.APIToken
	err := r.db.Preload("User").First(&token, "token_prefix = ? AND status = ?", prefix, "active").Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *apiTokenRepository) GetByUserID(userID uuid.UUID) ([]model.APIToken, error) {
	var tokens []model.APIToken
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&tokens).Error
	return tokens, err
}

func (r *apiTokenRepository) Update(token *model.APIToken) error {
	return r.db.Save(token).Error
}

func (r *apiTokenRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.APIToken{}, "id = ?", id).Error
}

func (r *apiTokenRepository) List(page, limit int) ([]model.APIToken, int64, error) {
	var tokens []model.APIToken
	var total int64

	offset := (page - 1) * limit

	err := r.db.Model(&model.APIToken{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = r.db.Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tokens).Error
	if err != nil {
		return nil, 0, err
	}

	return tokens, total, nil
}

func (r *apiTokenRepository) UpdateLastUsed(id uuid.UUID) error {
	return r.db.Model(&model.APIToken{}).Where("id = ?", id).Update("last_used_at", gorm.Expr("NOW()")).Error
}

