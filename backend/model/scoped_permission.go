package model

import (
	"time"

	"github.com/google/uuid"
)

// SubjectType 权限主体类型
const (
	SubjectTypeUser = "user" // 用户
	SubjectTypeTeam = "team" // 团队
)

// ResourceType 资源类型
const (
	ResourceTypeAll     = "*"       // 所有资源
	ResourceTypeAsset   = "asset"   // 资产
	ResourceTypeProject = "project" // 项目
	ResourceTypeUser    = "user"    // 用户管理
	ResourceTypeTeam    = "team"    // 团队管理
	ResourceTypeAudit   = "audit"   // 审计日志
	ResourceTypeToken   = "token"   // API Token
)

// ActionType 操作类型
const (
	ActionAll     = "*"       // 所有操作
	ActionView    = "view"    // 查看
	ActionCreate  = "create"  // 创建
	ActionUpdate  = "update"  // 更新
	ActionDelete  = "delete"  // 删除
	ActionConnect = "connect" // 连接（SSH）
	ActionManage  = "manage"  // 管理（权限分配等）
)

// ScopedPermission 统一权限表
// 支持为用户、团队分配对任意资源的权限
// 注意：SubjectID 和 ResourceID 是通用字段，不建立外键约束
type ScopedPermission struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SubjectType  string     `gorm:"type:varchar(20);not null;index" json:"subject_type"`  // user, team
	SubjectID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"subject_id"`           // 主体 ID
	ResourceType string     `gorm:"type:varchar(50);not null;index" json:"resource_type"` // asset, project, *, user, team...
	ResourceID   *uuid.UUID `gorm:"type:uuid;index" json:"resource_id"`                   // 资源 ID，null 表示该类型的所有资源
	Action       string     `gorm:"type:varchar(20);not null" json:"action"`              // view, create, update, delete, connect, *, manage
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// 注意：这些是虚拟关联，不创建外键约束（constraint:false）
	// 由于 SubjectID 可以关联到不同的表，需要根据 SubjectType 手动查询
	// 同样，ResourceID 可以关联到不同的资源表，需要根据 ResourceType 手动查询
}

func (ScopedPermission) TableName() string {
	return "scoped_permissions"
}

// PermissionGrant 权限授予请求
type PermissionGrant struct {
	SubjectType  string     `json:"subject_type" binding:"required"`  // user, team
	SubjectID    uuid.UUID  `json:"subject_id" binding:"required"`    // 主体 ID
	ResourceType string     `json:"resource_type" binding:"required"` // 资源类型
	ResourceID   *uuid.UUID `json:"resource_id"`                      // 资源 ID（可选）
	Action       string     `json:"action" binding:"required"`        // 操作
}

// UserPermissionSummary 用户权限摘要（用于前端展示）
type UserPermissionSummary struct {
	IsSuperAdmin        bool        `json:"is_super_admin"`
	IsAdmin             bool        `json:"is_admin"`
	Roles               []string    `json:"roles"` // 保留字段但不再使用
	Teams               []string    `json:"teams"`
	FunctionPermissions []string    `json:"function_permissions"` // 功能权限列表，如 "asset:view"
	AccessibleProjects  []uuid.UUID `json:"accessible_projects"`  // 可访问的项目 ID
}
