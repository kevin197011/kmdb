package main

import (
	"log"

	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/database"
	"github.com/kmdb/kmdb/model"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 执行数据库迁移
	log.Println("Running database migrations...")

	err = db.AutoMigrate(
		// 用户相关
		&model.User{},
		&model.UserGroup{},        // 保留旧表，可后续迁移后删除
		&model.UserGroupMember{},  // 保留旧表，可后续迁移后删除

		// 新权限系统 - 团队
		&model.Team{},
		&model.TeamMember{},

		// 角色和权限
		&model.Role{},
		&model.Permission{},       // 保留旧表
		&model.RolePermission{},   // 保留旧表
		&model.UserRole{},
		&model.GroupRole{},        // 保留旧表

		// 新权限系统 - 统一权限表
		&model.ScopedPermission{},

		// 业务模型
		&model.Project{},
		&model.Asset{},
		&model.AssetCredential{},
		&model.AssetPermission{},   // 保留旧表，可后续迁移后删除
		&model.ProjectPermission{}, // 保留旧表，可后续迁移后删除
		&model.AuditLog{},
		&model.UserFavoriteAsset{},
		&model.UserWebSSHHistory{},
		&model.APIToken{},
	)

	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// 删除 scoped_permissions 表的外键约束
	// 因为 SubjectID 和 ResourceID 是通用字段，可以关联到多个不同的表
	log.Println("Removing foreign key constraints from scoped_permissions...")
	sqlDB, err := db.DB()
	if err == nil {
		constraintsSQL := []string{
			"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_role",
			"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_team",
			"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_asset",
			"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_project",
			"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_user",
		}
		for _, sql := range constraintsSQL {
			if _, err := sqlDB.Exec(sql); err != nil {
				log.Printf("Warning: %v", err)
			}
		}
	}

	log.Println("Database migrations completed successfully")
}
