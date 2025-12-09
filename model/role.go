package model

import (
	"time"

	"github.com/google/uuid"
)

type Role struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null;unique" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Role) TableName() string {
	return "roles"
}

type Permission struct {
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name     string    `gorm:"type:varchar(255);not null;unique" json:"name"`
	Resource string    `gorm:"type:varchar(100);not null;index" json:"resource"`
	Action   string    `gorm:"type:varchar(100);not null" json:"action"`
	CreatedAt time.Time `json:"created_at"`
}

func (Permission) TableName() string {
	return "permissions"
}

type RolePermission struct {
	RoleID       uuid.UUID `gorm:"type:uuid;primary_key;index" json:"role_id"`
	PermissionID uuid.UUID `gorm:"type:uuid;primary_key;index" json:"permission_id"`

	Role       Role       `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	Permission Permission `gorm:"foreignKey:PermissionID" json:"permission,omitempty"`
}

func (RolePermission) TableName() string {
	return "role_permissions"
}

type UserRole struct {
	UserID    uuid.UUID `gorm:"type:uuid;primary_key;index" json:"user_id"`
	RoleID    uuid.UUID `gorm:"type:uuid;primary_key;index" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (UserRole) TableName() string {
	return "user_roles"
}

type GroupRole struct {
	GroupID   uuid.UUID `gorm:"type:uuid;primary_key;index" json:"group_id"`
	RoleID    uuid.UUID `gorm:"type:uuid;primary_key;index" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`

	Group UserGroup `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	Role  Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (GroupRole) TableName() string {
	return "group_roles"
}

