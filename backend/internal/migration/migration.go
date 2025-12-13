package migration

import (
	"log"

	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

// RunMigrations 执行数据库迁移
// 在应用启动时自动执行，确保数据库结构是最新的
func RunMigrations(db *gorm.DB) error {
	log.Println("[Migration] Running database migrations...")

	err := db.AutoMigrate(
		// 用户相关
		&model.User{},
		&model.UserGroup{},       // 保留旧表，可后续迁移后删除
		&model.UserGroupMember{}, // 保留旧表，可后续迁移后删除

		// 权限系统 - 团队
		&model.Team{},
		&model.TeamMember{},

		// 统一权限表
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
		return err
	}

	// 删除 scoped_permissions 表的外键约束
	// 因为 SubjectID 和 ResourceID 是通用字段，可以关联到多个不同的表
	if err := removeConstraints(db); err != nil {
		log.Printf("[Migration] Warning: failed to remove constraints: %v", err)
	}

	log.Println("[Migration] Database migrations completed successfully")
	return nil
}

// removeConstraints 移除不需要的外键约束
func removeConstraints(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	constraintsSQL := []string{
		"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_team",
		"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_asset",
		"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_project",
		"ALTER TABLE scoped_permissions DROP CONSTRAINT IF EXISTS fk_scoped_permissions_user",
	}

	for _, sql := range constraintsSQL {
		if _, err := sqlDB.Exec(sql); err != nil {
			log.Printf("[Migration] Warning: %v", err)
		}
	}

	return nil
}

