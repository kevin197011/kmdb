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
			log.Fatalf("请先运行 seed.go 创建默认管理员用户")
		}
		log.Fatalf("获取用户失败: %v", err)
	}

	userID := testUser.ID
	log.Printf("使用用户: %s (ID: %s)", testUser.Username, userID)

	// 1. 创建测试资产
	log.Println("\n=== 创建测试资产 ===")
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
		{
			Type:          "server",
			Name:          "web-server-01",
			Status:        "active",
			Project:       "电商平台",
			IP:            "192.168.1.10",
			OS:            "Ubuntu 22.04",
			CPU:           "8核",
			Memory:        "16GB",
			Disk:          "500GB SSD",
			Location:      "机房A-机架01",
			Department:    "技术部",
			CloudPlatform: "self-hosted",
			Remark:        "主要Web服务器",
		},
		{
			Type:          "server",
			Name:          "web-server-02",
			Status:        "active",
			Project:       "电商平台",
			IP:            "192.168.1.11",
			OS:            "Ubuntu 22.04",
			CPU:           "8核",
			Memory:        "16GB",
			Disk:          "500GB SSD",
			Location:      "机房A-机架01",
			Department:    "技术部",
			CloudPlatform: "self-hosted",
			Remark:        "备用Web服务器",
		},
		{
			Type:          "server",
			Name:          "db-server-01",
			Status:        "active",
			Project:       "电商平台",
			IP:            "192.168.1.20",
			OS:            "CentOS 8",
			CPU:           "16核",
			Memory:        "32GB",
			Disk:          "2TB SSD",
			Location:      "机房A-机架02",
			Department:    "技术部",
			CloudPlatform: "self-hosted",
			Remark:        "PostgreSQL 14 数据库服务器",
		},
		{
			Type:          "vm",
			Name:          "app-vm-01",
			Status:        "active",
			Project:       "移动应用",
			IP:            "10.0.1.100",
			OS:            "Ubuntu 20.04",
			CPU:           "4核",
			Memory:        "8GB",
			Disk:          "200GB",
			Location:      "阿里云华东1区",
			Department:    "移动部",
			CloudPlatform: "aliyun",
			Remark:        "移动应用后端服务",
		},
		{
			Type:          "vm",
			Name:          "app-vm-02",
			Status:        "active",
			Project:       "移动应用",
			IP:            "10.0.1.101",
			OS:            "Ubuntu 20.04",
			CPU:           "4核",
			Memory:        "8GB",
			Disk:          "200GB",
			Location:      "阿里云华东1区",
			Department:    "移动部",
			CloudPlatform: "aliyun",
			Remark:        "移动应用后端服务-备用",
		},
		{
			Type:          "network_device",
			Name:          "switch-core-01",
			Status:        "active",
			Project:       "网络基础设施",
			IP:            "192.168.0.1",
			OS:            "IOS-XE",
			CPU:           "",
			Memory:        "",
			Disk:          "",
			Location:      "机房A-核心区",
			Department:    "运维部",
			CloudPlatform: "self-hosted",
			Remark:        "Cisco Catalyst 9300 核心交换机，48端口",
		},
		{
			Type:          "network_device",
			Name:          "router-gateway-01",
			Status:        "active",
			Project:       "网络基础设施",
			IP:            "192.168.0.254",
			OS:            "IOS-XE",
			CPU:           "",
			Memory:        "",
			Disk:          "",
			Location:      "机房A-核心区",
			Department:    "运维部",
			CloudPlatform: "self-hosted",
			Remark:        "Cisco ASR 1000 边界路由器",
		},
		{
			Type:          "application",
			Name:          "api-service",
			Status:        "active",
			Project:       "电商平台",
			IP:            "",
			OS:            "",
			CPU:           "",
			Memory:        "",
			Disk:          "",
			Location:      "",
			Department:    "技术部",
			CloudPlatform: "",
			Remark:        "电商平台API服务 v2.1.0 (Go/Gin, 端口8080)",
		},
		{
			Type:          "application",
			Name:          "frontend-app",
			Status:        "active",
			Project:       "电商平台",
			IP:            "",
			OS:            "",
			CPU:           "",
			Memory:        "",
			Disk:          "",
			Location:      "",
			Department:    "前端部",
			CloudPlatform: "",
			Remark:        "电商平台前端 v1.5.2 (TypeScript/React, 端口3000)",
		},
		{
			Type:          "server",
			Name:          "cache-server-01",
			Status:        "active",
			Project:       "电商平台",
			IP:            "192.168.1.30",
			OS:            "Ubuntu 22.04",
			CPU:           "8核",
			Memory:        "32GB",
			Disk:          "1TB SSD",
			Location:      "机房A-机架03",
			Department:    "技术部",
			CloudPlatform: "self-hosted",
			Remark:        "Redis 缓存服务器",
		},
		{
			Type:          "server",
			Name:          "aws-web-01",
			Status:        "active",
			Project:       "电商平台",
			IP:            "54.123.45.67",
			OS:            "Amazon Linux 2",
			CPU:           "4核",
			Memory:        "16GB",
			Disk:          "100GB EBS",
			Location:      "AWS ap-northeast-1",
			Department:    "技术部",
			CloudPlatform: "aws",
			Remark:        "AWS EC2 实例 - 国际站点",
		},
		{
			Type:          "vm",
			Name:          "tencent-app-01",
			Status:        "active",
			Project:       "移动应用",
			IP:            "119.29.100.50",
			OS:            "TencentOS Server 3.1",
			CPU:           "2核",
			Memory:        "4GB",
			Disk:          "50GB",
			Location:      "腾讯云广州区",
			Department:    "移动部",
			CloudPlatform: "tencent",
			Remark:        "腾讯云 CVM - 小程序后端",
		},
	}

	// 先创建或获取项目
	projectMap := make(map[string]*uuid.UUID)
	projectNames := []string{"电商平台", "移动应用", "网络基础设施"}
	for _, projectName := range projectNames {
		project, err := projectRepo.GetByName(projectName)
		if err != nil {
			// 项目不存在，创建它
			newProject := &model.Project{
				Name:        projectName,
				Description: "测试项目",
			}
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

	var createdAssets []*model.Asset
	for _, assetData := range assets {
		// 先尝试获取已存在的资产
		var asset *model.Asset
		existingAssets, _, _ := assetRepo.List(0, 1000, map[string]interface{}{})
		for _, a := range existingAssets {
			if a.Name == assetData.Name {
				asset = a
				break
			}
		}

		if asset == nil {
			// 资产不存在，创建新资产
			asset = &model.Asset{
				Type:          assetData.Type,
				Name:          assetData.Name,
				Status:        assetData.Status,
				SSHPort:       22, // 默认SSH端口
				IP:            assetData.IP,
				OS:            assetData.OS,
				CPU:           assetData.CPU,
				Memory:        assetData.Memory,
				Disk:          assetData.Disk,
				Location:      assetData.Location,
				Department:    assetData.Department,
				CloudPlatform: assetData.CloudPlatform,
				Remark:        assetData.Remark,
			}

			// 根据项目名称查找项目ID
			if assetData.Project != "" {
				if projectID, ok := projectMap[assetData.Project]; ok {
					asset.ProjectID = projectID
				}
			}

			if err := assetService.CreateAsset(asset, userID); err != nil {
				log.Printf("⚠️  创建资产失败 %s: %v", assetData.Name, err)
				continue
			} else {
				projectName := assetData.Project
				if projectName == "" {
					projectName = "未分配"
				}
				log.Printf("✅ 创建资产: %s (%s) - %s [%s]", asset.Name, asset.Type, projectName, assetData.CloudPlatform)
			}
		} else {
			log.Printf("ℹ️  资产已存在: %s (%s)", asset.Name, asset.Type)
		}

		createdAssets = append(createdAssets, asset)
	}

	// 2. 删除所有关联主机的凭证（只保留全局凭证）
	log.Println("\n=== 清理关联主机的凭证 ===")
	// 使用 GORM 直接删除所有关联主机的凭证
	result := db.Where("asset_id IS NOT NULL").Delete(&model.AssetCredential{})
	if result.Error != nil {
		log.Printf("⚠️  清理关联主机凭证失败: %v", result.Error)
	} else {
		log.Printf("✅ 已删除 %d 个关联主机的凭证", result.RowsAffected)
	}

	// 3. 创建测试全局凭证
	log.Println("\n=== 创建测试全局凭证 ===")
	globalCredentials := []struct {
		name        string
		username    string
		authType    string
		password    string
		privateKey  string
		publicKey   string
		description string
	}{
		{
			name:        "root账号",
			username:    "root",
			authType:    "password",
			password:    "Root123456",
			description: "root管理员账号（全局）",
		},
		{
			name:        "admin账号",
			username:    "admin",
			authType:    "password",
			password:    "Admin123456",
			description: "管理员账号（全局）",
		},
		{
			name:        "ubuntu账号",
			username:    "ubuntu",
			authType:    "password",
			password:    "Ubuntu123456",
			description: "Ubuntu默认账号（全局）",
		},
		{
			name:     "SSH密钥认证-部署账号",
			username: "deploy",
			authType: "key",
			privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAvHZo8WueV/hdqVZa8ERbImC/YsMmWGbBy6aL0DoKYglzPuXj
+0XGbxqashdzpaqhutbe/mc27JEGTFWFI9jIMuDIofJBGvMT9vYpn12iuuQs25bQ
LX1MRgasz708a7EbPZPBVDCagARoGsBHFiyysAtnfFKav/fXL1eIA45Qz6U1w22J
Kg3UAm4+5/KBLx9sjisnctoegi4e3ifypacHuPSRwL4dskDmszydh9UEs68SrI2x
wlPczMiZknvALWv4KGFWDdi0rguG+DT4UBljRnDhZoVrcNV7T+458WRV8z7NBE/J
cTP66O/B85Yl0pwS7gTms4INX/T1Iq1q2xdInQIDAQABAoIBADes/4m60leIvxrE
sS7j8sxwKnohztU03jGsrQdB7klSI2LEhZp43Yt7H5JXTUn247qPuecMVPSET4kD
hsa1R0eIkp0NNWChyRcfV+KFxgpSWFIy9qNJrdvOIwVoEU57TuHdIbMefLYvFxY4
EYgiglNxuwvGV4M407BfuoXaaFM/KIc8HrY2OzeMwT3hiwzM98Ru+6O4Pww6imez
j18CrNKY58umV9b7NIu6+ZQCqWjxwNOj2d99RjLNcxjAx9Gl7JL5XdbHUjcFJQoT
rboonKxBEtr9KRjBDbzoTJMxnPJAoDZDdmPRC2SX9O74yZjoHevzGRAYC30TFzPR
xmEUzuECgYEA5E1lDrAO+kIA20jpDAP3U//yF/h64H1sTnZESjQ/UUjkUuIUnDB6
mSgerxbuVn/EPfsWtkxhoxX30higIrZ2/nHv3oyqgT5hXY6ffd9eYbGSHGp/0tSZ
O1LLEs37wLLSOeKM4vjMzzXWjSCS7VB6tOC24cwcAaslKOPW4WmCXwUCgYEA01Os
L7ZeuJDyIdTDO+/u2TAwJcZnFhSaYFegSeGz7dl2mG5tlqU10GuPrh0sXtjJNYri
yploKSHUXSNpO7f2QUznAPM8OuOe8sY5Yu7XgLeb44ptcbYBAcBQQvOsR7eJpRAg
eu2q0GPdaEzceK5S1bpBFmGm664Pg2CwFVbUhrkCgYBSHxzY2a+piZBxUJqzvcF7
r7dPtAvPMI6C8rvBzWVxQb0Pq08ql62h5fKTnLYC21alzOnwjS0Z0s8f/cesdOH8
yNM1xHeYoe24D5ODXZO/pHYgTpbIKb0sv61YiEukly5TsBBpnIFfj8grX6o6PxbE
dYiTVC5G0188hChJUQCaWQKBgQDM7r1x34bnsRg+GpfhzgFv+T0XxNk/Hme+ufsk
6o2UQGiz1ZLMnhYbsdM54+ydZdlp5O+dzTqneLj6QVbRpMpX9P2nfDmSWh5QDE6m
VDwEBQpVlG4h8X/0dMzgwHD3c1M2EPeOfmBBijax6Kd9GIAX53ErBTPcJYXBv8fC
Sdv7cQKBgQCcp/4KvZzwcTwmVXhrmrCNWwYL5H6azXrLd/TOqLcJQDZFEIq0b68N
cwJLUiEUh8RUwhh6oaEfVDpZ9HQzXg/KGNSdkyycVyGdZHcE3oFmsc9Ks14tH0lu
DejoHDOA+5z+qHX1sr07dEj9P3peJxj+J8B1rtICNrQnAjjBu0SxyA==
-----END RSA PRIVATE KEY-----`,
			publicKey:   "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8dmjxa55X+F2pVlrwRFsiYL9iwyZYZsHLpovQOgpiCXM+5eP7RcZvGpqyF3OlqqG61t7+ZzbskQZMVYUj2Mgy4Mih8kEa8xP29imfXaK65CzbltAtfUxGBqzPvTxrsRs9k8FUMJqABGgawEcWLKywC2d8Upq/99cvV4gDjlDPpTXDbYkqDdQCbj7n8oEvH2yOKydy2h6CLh7eJ/Klpwe49JHAvh2yQOazPJ2H1QSzrxKsjbHCU9zMyJmSe8Ata/goYVYN2LSuC4b4NPhQGWNGcOFmhWtw1XtP7jnxZFXzPs0ET8lxM/ro78HzliXSnBLuBOazgg1f9PUirWrbF0id",
			description: "SSH密钥认证-部署账号（全局）",
		},
		{
			name:     "SSH密钥认证-运维账号",
			username: "ops",
			authType: "key",
			privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAwel7AL01pdtWeclQc4X41Br4oZx0+J0gZ9PCuEjaeaoMcIRw
mj3b0CaxrRz+AbmtZoEcU4ShRStldZ4y8WZNmEs44CM1rrhU+ULPbTzYVClUpdJY
TpgU9pqZmgkt0surCJJTNFcmM8tjtvAJuKfVvVzlzbzwnceAF+Tvv2ufROPmszr9
jZ/6m7Nc1/XiRlgF1gcqa9ZIgIWYb+LNYtyU+j6go+iZC89pp0EaAJQF9DmG+++Y
oOJeuYe3+bLYDlI4b040LfkjT4auN9GG9d+FINB+TVdq5TPVUinZNIrOgv9UjRB8
lRv1HMk/Si6Ya4dnO5BvrNfMs9ENqm9EeWYxwwIDAQABAoIBAALMjfv6vzV/rwXf
BAxG2MqnAQPEMGQOUJNvGRZz5sNu0vMk1kNDtVKR3Gq1Sm1X8srR/kiuV22aLMK/
39hgM6qJG28Q0wuMmZ1ne3sGL9E3L4OdP60SwOq2XJU+oKy0R+m9wvm0cFa7Dttr
J5jEw28SUjbgDVEZuh2eLl/C+++QnCpsRhTCjPHiB2HDmp5HmhTL8IpQt5R7Ie0j
5Tf3iEy6wXKbh0WQfidRs8aL/03Rnp79RepUXYJkb1ty2kXVcubnq+b+ZiWw1uab
+XmiqKLRldPr+UitP1GnnbiceTf7jFK0Ts3PD03btPUu/CpfrlBK9wPP97UTOPL/
bixOVBECgYEA5e+zQF8SOkqduipRsfY6bObOJl7ml6Kz52X8H9b+SDDOiDh//AFT
y8NZX8sKGV7HkECwIQcQOx/clFpoqk97p0njxLkMV5Wdlrmp4HkTQ6XIkAkz8saY
bowrrmwFt8ujaXFY3fv2hJEAatJ0S+y/fhlId5ggN0KNiJmX+873Ot8CgYEA1+Rt
FR86e3a09HWg1oA5pLvM8zQbBG6sxye3fn83h7WrCoUflKB3XP522ygRz/LTzoQS
TPOWpdStXzBIFtQFdF2MUG1EKmqf3bsTmiUVP3UEgieB24d2DtnD4jKMK7Nc6wo6
MCgRHPLiloblxedHdDx0iXXfOSbdOLF7f/EyyZ0CgYAJdmDREFiGr5VoGN+9zB1B
aAopyBQDP33Z0veaM9XJEMEfF/wkWcWiCAsAhzGGM8FQrWjSIyFG3ZvNOx89iwHS
s5a8/MSGQjD3B/L2uuTRDtx/GPHbVtLlEb2mcumVU7sI1tJKaFkPwYvb2YdRrI+A
1/eEfG0u+P0sFu4LPcwszwKBgGpN0eCKpfNROjz9BptYPAn/ZyWBzKPcEztlNRcW
cTNjorrlXe2DLgMeUUwMaOjp+p0/rvsxHka9eDjcv0JuV9k6jvKzOtNf+SPnD/ng
tJuwdO3ZojmEc/9P/wIMPbTu9pvNR2Wa9QI6HpRcDBvsi+SSOBfPcIDlwBxAWD1h
eM6JAoGBAKc/bIYUnRZuYxG5sEwtfNTKIrYkiZK/TfMlsPuD30Ds7LhGDtMWqsEx
64ds5iNqNZHrGjfYoTAOnIKbeolhjS3TQbc6TMnEv06U4R4YctFKDQzKpbNwo64d
7QTaHE/qWvRV4Bb/ywIoD1ttESgb6/GtKjhJIHW5GvCeLuLIMEh9
-----END RSA PRIVATE KEY-----`,
			publicKey:   "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDB6XsAvTWl21Z5yVBzhfjUGvihnHT4nSBn08K4SNp5qgxwhHCaPdvQJrGtHP4Bua1mgRxThKFFK2V1njLxZk2YSzjgIzWuuFT5Qs9tPNhUKVSl0lhOmBT2mpmaCS3Sy6sIklM0VyYzy2O28Am4p9W9XOXNvPCdx4AX5O+/a59E4+azOv2Nn/qbs1zX9eJGWAXWBypr1kiAhZhv4s1i3JT6PqCj6JkLz2mnQRoAlAX0OYb775ig4l65h7f5stgOUjhvTjQt+SNPhq430Yb134Ug0H5NV2rlM9VSKdk0is6C/1SNEHyVG/UcyT9KLphrh2c7kG+s18yz0Q2qb0R5ZjHD",
			description: "SSH密钥认证-运维账号（全局）",
		},
	}

	for _, cred := range globalCredentials {
		credential := &model.AssetCredential{
			AssetID:     nil, // 全局凭证，不关联主机
			Name:        cred.name,
			Username:    cred.username,
			AuthType:    cred.authType,
			IsDefault:   false, // 全局凭证不需要默认设置
			Description: cred.description,
		}

		if cred.authType == "password" {
			password := cred.password
			credential.Password = &password
		} else if cred.authType == "key" {
			privateKey := cred.privateKey
			credential.PrivateKey = &privateKey
			if cred.publicKey != "" {
				publicKey := cred.publicKey
				credential.PublicKey = &publicKey
			}
		}

		if err := credentialService.CreateCredential(credential); err != nil {
			log.Printf("⚠️  创建全局凭证失败 %s: %v", cred.name, err)
		} else {
			log.Printf("✅ 创建全局凭证: %s (%s)", cred.name, cred.username)
		}
	}

	// 4. 创建测试用户
	log.Println("\n=== 创建测试用户 ===")
	testUsers := []struct {
		username string
		email    string
		password string
	}{
		{"developer", "developer@kmdb.local", "Dev123456"},
		{"operator", "operator@kmdb.local", "Op123456"},
		{"viewer", "viewer@kmdb.local", "View123456"},
	}

	for _, u := range testUsers {
		user := &model.User{
			Username: u.username,
			Email:    u.email,
			Status:   "active",
		}
		if err := userService.CreateUser(user, u.password); err != nil {
			log.Printf("⚠️  创建用户失败 %s: %v", u.username, err)
		} else {
			log.Printf("✅ 创建用户: %s (%s)", user.Username, user.Email)
		}
	}

	log.Println("\n✅ 测试数据创建完成！")
	log.Println("\n测试账号信息：")
	log.Println("  - developer / Dev123456")
	log.Println("  - operator / Op123456")
	log.Println("  - viewer / View123456")
}
