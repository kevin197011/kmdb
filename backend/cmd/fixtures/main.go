package main

import (
	"log"

	"github.com/google/uuid"
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
	projectRepo := repository.NewProjectRepository(db)
	assetRepo := repository.NewAssetRepository(db)
	assetService := service.NewAssetService(assetRepo)

	credentialRepo := repository.NewAssetCredentialRepository(db)
	credentialService := service.NewAssetCredentialService(credentialRepo, assetRepo)

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)

	// 获取或创建测试用户
	testUser, err := userService.GetUserByUsername("admin")
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Fatalf("请先启动后端服务创建默认管理员用户")
		}
		log.Fatalf("获取用户失败: %v", err)
	}

	userID := testUser.ID
	log.Printf("使用用户: %s (ID: %s)", testUser.Username, userID)

	// 1. 创建测试资产
	log.Println("\n=== 创建测试资产 ===")
	createTestAssets(projectRepo, assetRepo, assetService, userID)

	// 2. 创建测试全局凭证
	log.Println("\n=== 创建测试全局凭证 ===")
	createTestCredentials(db, credentialService)

	// 3. 创建测试用户
	log.Println("\n=== 创建测试用户 ===")
	createTestUsers(userService)

	log.Println("\n✅ 测试数据创建完成！")
	log.Println("\n测试账号信息：")
	log.Println("  - developer / Dev123456")
	log.Println("  - operator / Op123456")
	log.Println("  - viewer / View123456")
}

func createTestAssets(projectRepo repository.ProjectRepository, assetRepo repository.AssetRepository, assetService service.AssetService, userID uuid.UUID) {
	assets := []struct {
		Type          string
		Name          string
		Status        string
		Project       string
		IP            string
		OS            string
		CPU           string
		Memory        string
		Disk          string
		Location      string
		Department    string
		CloudPlatform string
		Remark        string
	}{
		{"server", "web-server-01", "active", "电商平台", "192.168.1.10", "Ubuntu 22.04", "8核", "16GB", "500GB SSD", "机房A-机架01", "技术部", "self-hosted", "主要Web服务器"},
		{"server", "web-server-02", "active", "电商平台", "192.168.1.11", "Ubuntu 22.04", "8核", "16GB", "500GB SSD", "机房A-机架01", "技术部", "self-hosted", "备用Web服务器"},
		{"server", "db-server-01", "active", "电商平台", "192.168.1.20", "CentOS 8", "16核", "32GB", "2TB SSD", "机房A-机架02", "技术部", "self-hosted", "PostgreSQL 14 数据库服务器"},
		{"vm", "app-vm-01", "active", "移动应用", "10.0.1.100", "Ubuntu 20.04", "4核", "8GB", "200GB", "阿里云华东1区", "移动部", "aliyun", "移动应用后端服务"},
		{"vm", "app-vm-02", "active", "移动应用", "10.0.1.101", "Ubuntu 20.04", "4核", "8GB", "200GB", "阿里云华东1区", "移动部", "aliyun", "移动应用后端服务-备用"},
		{"network_device", "switch-core-01", "active", "网络基础设施", "192.168.0.1", "IOS-XE", "", "", "", "机房A-核心区", "运维部", "self-hosted", "Cisco Catalyst 9300 核心交换机"},
		{"server", "cache-server-01", "active", "电商平台", "192.168.1.30", "Ubuntu 22.04", "8核", "32GB", "1TB SSD", "机房A-机架03", "技术部", "self-hosted", "Redis 缓存服务器"},
		{"server", "aws-web-01", "active", "电商平台", "54.123.45.67", "Amazon Linux 2", "4核", "16GB", "100GB EBS", "AWS ap-northeast-1", "技术部", "aws", "AWS EC2 实例"},
		{"vm", "tencent-app-01", "active", "移动应用", "119.29.100.50", "TencentOS Server 3.1", "2核", "4GB", "50GB", "腾讯云广州区", "移动部", "tencent", "腾讯云 CVM"},
	}

	// 先创建或获取项目
	projectMap := make(map[string]*uuid.UUID)
	projectNames := []string{"电商平台", "移动应用", "网络基础设施"}
	for _, projectName := range projectNames {
		project, err := projectRepo.GetByName(projectName)
		if err != nil {
			newProject := &model.Project{Name: projectName, Description: "测试项目"}
			if err := projectRepo.Create(newProject); err != nil {
				log.Printf("⚠️  创建项目失败 %s: %v", projectName, err)
			} else {
				log.Printf("✅ 创建项目: %s", projectName)
				projectMap[projectName] = &newProject.ID
			}
		} else {
			projectMap[projectName] = &project.ID
		}
	}

	for _, assetData := range assets {
		existingAssets, _, _ := assetRepo.List(0, 1000, map[string]interface{}{})
		var exists bool
		for _, a := range existingAssets {
			if a.Name == assetData.Name {
				exists = true
				log.Printf("ℹ️  资产已存在: %s", assetData.Name)
				break
			}
		}
		if exists {
			continue
		}

		asset := &model.Asset{
			Type: assetData.Type, Name: assetData.Name, Status: assetData.Status,
			SSHPort: 22, IP: assetData.IP, OS: assetData.OS,
			CPU: assetData.CPU, Memory: assetData.Memory, Disk: assetData.Disk,
			Location: assetData.Location, Department: assetData.Department,
			CloudPlatform: assetData.CloudPlatform, Remark: assetData.Remark,
		}
		if projectID, ok := projectMap[assetData.Project]; ok {
			asset.ProjectID = projectID
		}

		if err := assetService.CreateAsset(asset, userID); err != nil {
			log.Printf("⚠️  创建资产失败 %s: %v", assetData.Name, err)
		} else {
			log.Printf("✅ 创建资产: %s (%s)", asset.Name, asset.Type)
		}
	}
}

func createTestCredentials(db *gorm.DB, credentialService service.AssetCredentialService) {
	// 清理关联主机的凭证
	result := db.Where("asset_id IS NOT NULL").Delete(&model.AssetCredential{})
	if result.Error != nil {
		log.Printf("⚠️  清理凭证失败: %v", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("✅ 已删除 %d 个关联主机的凭证", result.RowsAffected)
	}

	credentials := []struct {
		name, username, authType, password, description string
	}{
		{"root账号", "root", "password", "Root123456", "root管理员账号（全局）"},
		{"admin账号", "admin", "password", "Admin123456", "管理员账号（全局）"},
		{"ubuntu账号", "ubuntu", "password", "Ubuntu123456", "Ubuntu默认账号（全局）"},
	}

	for _, cred := range credentials {
		credential := &model.AssetCredential{
			AssetID: nil, Name: cred.name, Username: cred.username,
			AuthType: cred.authType, IsDefault: false, Description: cred.description,
		}
		password := cred.password
		credential.Password = &password

		if err := credentialService.CreateCredential(credential); err != nil {
			log.Printf("⚠️  创建凭证失败 %s: %v", cred.name, err)
		} else {
			log.Printf("✅ 创建全局凭证: %s (%s)", cred.name, cred.username)
		}
	}
}

func createTestUsers(userService service.UserService) {
	testUsers := []struct {
		username, email, password string
	}{
		{"developer", "developer@kmdb.local", "Dev123456"},
		{"operator", "operator@kmdb.local", "Op123456"},
		{"viewer", "viewer@kmdb.local", "View123456"},
	}

	for _, u := range testUsers {
		user := &model.User{Username: u.username, Email: u.email, Status: "active"}
		if err := userService.CreateUser(user, u.password); err != nil {
			log.Printf("⚠️  创建用户失败 %s: %v", u.username, err)
		} else {
			log.Printf("✅ 创建用户: %s (%s)", user.Username, user.Email)
		}
	}
}

