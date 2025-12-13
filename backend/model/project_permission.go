package model

import (
	"time"

	"github.com/google/uuid"
)

// ProjectPermission 项目权限表（旧表，保留用于数据迁移）
// 用于控制用户对特定项目的访问权限
type ProjectPermission struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProjectID uuid.UUID  `gorm:"type:uuid;not null;index" json:"project_id"`
	RoleID    *uuid.UUID `gorm:"type:uuid;index" json:"role_id,omitempty"` // 已废弃
	UserID    *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Action    string     `gorm:"type:varchar(50);not null" json:"action"` // view, connect, update, delete
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ProjectPermission) TableName() string {
	return "project_permissions"
}
