package model

import (
	"time"

	"github.com/google/uuid"
)

type UserGroup struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null;unique" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (UserGroup) TableName() string {
	return "user_groups"
}

type UserGroupMember struct {
	UserID    uuid.UUID `gorm:"type:uuid;primary_key;index" json:"user_id"`
	GroupID   uuid.UUID `gorm:"type:uuid;primary_key;index" json:"group_id"`
	CreatedAt time.Time `json:"created_at"`

	User  User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Group UserGroup `gorm:"foreignKey:GroupID" json:"group,omitempty"`
}

func (UserGroupMember) TableName() string {
	return "user_group_members"
}

