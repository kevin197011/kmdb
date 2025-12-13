package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Username     string    `gorm:"type:varchar(100);not null;unique;index" json:"username"`
	Email        string    `gorm:"type:varchar(255);not null;unique;index" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	Status       string    `gorm:"type:varchar(50);not null;default:'active'" json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

