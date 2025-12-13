package main

import (
	"log"
	"os"

	"github.com/kmdb/kmdb/api"
	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/database"
	"github.com/kmdb/kmdb/internal/migration"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化数据库连接
	db, err := database.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 执行数据库迁移
	if err := migration.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// 创建种子数据（默认管理员用户）
	if err := migration.RunSeed(db); err != nil {
		log.Fatalf("Failed to run seed: %v", err)
	}

	// 设置路由
	router := api.SetupRouter(cfg, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
