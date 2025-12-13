package model

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Module     string    `gorm:"type:varchar(50);not null;index" json:"module"`
	Action     string    `gorm:"type:varchar(50);not null" json:"action"`
	ResourceID uuid.UUID `gorm:"type:uuid;index" json:"resource_id"`
	UserID     uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Details    string    `gorm:"type:jsonb" json:"details"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

