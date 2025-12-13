package model

import (
	"time"

	"github.com/google/uuid"
)

type UserFavoriteAsset struct {
	UserID    uuid.UUID `gorm:"type:uuid;primary_key;index" json:"user_id"`
	AssetID   uuid.UUID `gorm:"type:uuid;primary_key;index" json:"asset_id"`
	CreatedAt time.Time `json:"created_at"`

	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Asset Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

func (UserFavoriteAsset) TableName() string {
	return "user_favorite_assets"
}

type UserWebSSHHistory struct {
	UserID          uuid.UUID `gorm:"type:uuid;primary_key;index" json:"user_id"`
	AssetID         uuid.UUID `gorm:"type:uuid;primary_key;index" json:"asset_id"`
	LastConnectedAt time.Time `gorm:"index" json:"last_connected_at"`
	ConnectionCount int        `gorm:"default:0" json:"connection_count"`

	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Asset Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

func (UserWebSSHHistory) TableName() string {
	return "user_webssh_history"
}

