package model

import (
	"time"

	"github.com/google/uuid"
)

// Project 项目表
type Project struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null;unique;index" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"type:varchar(50);not null;default:'active'" json:"status"` // active, inactive, archived
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联关系
	Assets []Asset `gorm:"foreignKey:ProjectID" json:"assets,omitempty"`
}

func (Project) TableName() string {
	return "projects"
}
