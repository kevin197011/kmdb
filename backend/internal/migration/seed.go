package migration

import (
	"log"
	"os"

	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
	"github.com/kmdb/kmdb/service"
	"gorm.io/gorm"
)

// RunSeed 创建种子数据（默认管理员用户）
// 在应用启动时执行，确保存在默认管理员账号
func RunSeed(db *gorm.DB) error {
	log.Println("[Seed] Checking seed data...")

	// 初始化 repositories 和 services
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)

	// 从环境变量获取配置
	adminUsername := getEnv("ADMIN_USERNAME", "admin")
	adminPassword := getEnv("ADMIN_PASSWORD", "Admin123")
	adminEmail := getEnv("ADMIN_EMAIL", "admin@kmdb.local")

	// 检查是否已存在该用户
	_, err := userService.GetUserByUsername(adminUsername)
	if err == nil {
		log.Printf("[Seed] Admin user '%s' already exists, skipping", adminUsername)
		return nil
	}

	// 如果错误不是"记录不存在"，说明是其他错误
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	// 创建默认管理员用户
	adminUser := &model.User{
		Username: adminUsername,
		Email:    adminEmail,
		Status:   "active",
	}

	if err := userService.CreateUser(adminUser, adminPassword); err != nil {
		return err
	}

	log.Printf("[Seed] ✅ Default admin user created")
	log.Printf("[Seed]    Username: %s", adminUsername)
	log.Printf("[Seed]    Email: %s", adminEmail)
	log.Printf("[Seed]    ⚠️  Please change the default password in production!")

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

