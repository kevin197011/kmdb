package model

import (
	"time"

	"github.com/google/uuid"
)

// ProjectPermission 项目权限表
// 用于控制角色或用户对特定项目的访问权限
type ProjectPermission struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProjectID uuid.UUID  `gorm:"type:uuid;not null;index" json:"project_id"`     // 项目ID
	RoleID    *uuid.UUID `gorm:"type:uuid;index" json:"role_id,omitempty"`        // 如果为角色分配，则设置此字段
	UserID    *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`        // 如果为用户分配，则设置此字段
	Action    string     `gorm:"type:varchar(50);not null" json:"action"`        // view, connect, update, delete
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Role    *Role    `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ProjectPermission) TableName() string {
	return "project_permissions"
}
