package model

import (
	"time"

	"github.com/google/uuid"
)

// Team 团队（替代原来的 UserGroup + GroupRole）
// 团队是用户的集合，可以直接分配角色和权限
type Team struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(100);not null;unique" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	Members []TeamMember `gorm:"foreignKey:TeamID" json:"members,omitempty"`
}

func (Team) TableName() string {
	return "teams"
}

// TeamMember 团队成员
type TeamMember struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TeamID    uuid.UUID `gorm:"type:uuid;not null;index" json:"team_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Role      string    `gorm:"type:varchar(50);default:'member'" json:"role"` // owner, admin, member
	CreatedAt time.Time `json:"created_at"`

	Team *Team `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (TeamMember) TableName() string {
	return "team_members"
}

// TeamMemberRole 团队成员角色常量
const (
	TeamRoleOwner  = "owner"  // 团队所有者
	TeamRoleAdmin  = "admin"  // 团队管理员
	TeamRoleMember = "member" // 普通成员
)

