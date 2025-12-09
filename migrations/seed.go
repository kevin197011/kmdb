package main

import (
	"log"
	"os"

	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/database"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
	"github.com/kmdb/kmdb/service"
	"gorm.io/gorm"
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

	// 初始化 repositories 和 services
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)

	// 从环境变量获取配置
	adminUsername := getEnv("ADMIN_USERNAME", "admin")
	adminPassword := getEnv("ADMIN_PASSWORD", "Admin123")
	adminEmail := getEnv("ADMIN_EMAIL", "admin@kmdb.local")

	// 检查是否已存在该用户
	_, err = userService.GetUserByUsername(adminUsername)
	if err == nil {
		log.Printf("用户 '%s' 已存在，跳过创建", adminUsername)
		return
	}
	// 如果错误不是"记录不存在"，说明是其他错误，需要处理
	if err != nil && err != gorm.ErrRecordNotFound {
		log.Fatalf("检查用户是否存在时出错: %v", err)
	}
	// err == gorm.ErrRecordNotFound 表示用户不存在，可以继续创建

	// 创建默认管理员用户
	adminUser := &model.User{
		Username: adminUsername,
		Email:    adminEmail,
		Status:   "active",
	}

	if err := userService.CreateUser(adminUser, adminPassword); err != nil {
		log.Fatalf("创建管理员用户失败: %v", err)
	}

	log.Printf("✅ 默认管理员用户创建成功！")
	log.Printf("   用户名: %s", adminUsername)
	log.Printf("   邮箱: %s", adminEmail)
	log.Printf("   密码: %s", adminPassword)
	log.Printf("   ⚠️  请在生产环境中立即修改默认密码！")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
