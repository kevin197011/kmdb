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
		&model.User{},
		&model.UserGroup{},
		&model.UserGroupMember{},
		&model.Role{},
		&model.Permission{},
		&model.RolePermission{},
		&model.UserRole{},
		&model.GroupRole{},
		&model.Project{},
		&model.Asset{},
		&model.AssetCredential{},
		&model.AssetPermission{},
		&model.ProjectPermission{},
		&model.AuditLog{},
		&model.UserFavoriteAsset{},
		&model.UserWebSSHHistory{},
		&model.APIToken{},
	)

	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Database migrations completed successfully")
}
