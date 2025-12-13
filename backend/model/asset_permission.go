package model

import (
	"time"

	"github.com/google/uuid"
)

// AssetPermission 资产权限表（旧表，保留用于数据迁移）
// 用于控制用户对特定资产的访问权限
type AssetPermission struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AssetID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"asset_id"`
	RoleID    *uuid.UUID `gorm:"type:uuid;index" json:"role_id,omitempty"` // 已废弃
	UserID    *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Action    string     `gorm:"type:varchar(50);not null" json:"action"` // view, connect, update, delete
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	Asset Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	User  *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AssetPermission) TableName() string {
	return "asset_permissions"
}
