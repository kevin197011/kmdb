package model

import (
	"time"

	"github.com/google/uuid"
)

// APIToken API Token 用于程序化访问 API
type APIToken struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string     `gorm:"type:varchar(100);not null" json:"name"`                    // Token 名称（描述用途）
	Token       string     `gorm:"type:varchar(64);not null;unique;index" json:"-"`           // Token 值（SHA256 哈希存储）
	TokenPrefix string     `gorm:"type:varchar(12);not null;index" json:"token_prefix"`       // Token 前缀（用于识别）
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`                   // 所属用户
	Scopes      string     `gorm:"type:text" json:"scopes"`                                   // 权限范围 JSON
	ExpiresAt   *time.Time `gorm:"type:timestamp" json:"expires_at"`                          // 过期时间（null表示永不过期）
	LastUsedAt  *time.Time `gorm:"type:timestamp" json:"last_used_at"`                        // 最后使用时间
	Status      string     `gorm:"type:varchar(20);not null;default:'active'" json:"status"`  // 状态: active, revoked
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 关联
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (APIToken) TableName() string {
	return "api_tokens"
}

// TokenScope 定义 Token 可访问的 API 范围
type TokenScope struct {
	Resource string   `json:"resource"` // 资源类型: assets, users, projects 等
	Actions  []string `json:"actions"`  // 允许的操作: read, write, delete
}

