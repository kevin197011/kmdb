package main

import (
	"log"

	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/database"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
	"github.com/kmdb/kmdb/service"
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
	permissionRepo := repository.NewPermissionRepository(db)
	authzService := service.NewAuthorizationService(
		nil, // roleRepo
		permissionRepo,
		nil, // rolePermissionRepo
		nil, // userRoleRepo
		nil, // groupRoleRepo
		nil, // userGroupMemberRepo
	)

	// 定义所有权限
	permissions := []struct {
		Name     string
		Resource string
		Action   string
		Desc     string
	}{
		// 资产管理页面权限
		{"查看资产管理", "assets", "view", "访问资产管理页面"},
		{"创建资产", "assets", "create", "创建新资产"},
		{"编辑资产", "assets", "update", "编辑现有资产"},
		{"删除资产", "assets", "delete", "删除资产"},
		{"查看资产详情", "assets", "read", "查看单个资产详情"},

		// WebSSH 页面权限
		{"查看WebSSH", "webssh", "view", "访问WebSSH页面"},
		{"连接主机", "webssh", "connect", "通过WebSSH连接主机"},

		// 用户管理页面权限
		{"查看用户管理", "users", "view", "访问用户管理页面"},
		{"创建用户", "users", "create", "创建新用户"},
		{"编辑用户", "users", "update", "编辑用户信息"},
		{"删除用户", "users", "delete", "删除用户"},

		// 用户群组页面权限
		{"查看用户群组", "user_groups", "view", "访问用户群组页面"},
		{"创建用户群组", "user_groups", "create", "创建新用户群组"},
		{"编辑用户群组", "user_groups", "update", "编辑用户群组"},
		{"删除用户群组", "user_groups", "delete", "删除用户群组"},

		// 角色权限页面权限
		{"查看角色权限", "roles", "view", "访问角色权限管理页面"},
		{"创建角色", "roles", "create", "创建新角色"},
		{"编辑角色", "roles", "update", "编辑角色信息"},
		{"删除角色", "roles", "delete", "删除角色"},
		{"分配权限", "roles", "assign", "为角色分配权限"},

		// 用户角色页面权限
		{"查看用户角色", "user_roles", "view", "访问用户角色分配页面"},
		{"分配用户角色", "user_roles", "assign", "为用户分配角色"},

		// 群组角色页面权限
		{"查看群组角色", "group_roles", "view", "访问群组角色分配页面"},
		{"分配群组角色", "group_roles", "assign", "为群组分配角色"},

		// 审计日志页面权限
		{"查看审计日志", "audit", "view", "访问审计日志页面"},
		{"查看审计详情", "audit", "read", "查看审计日志详情"},
	}

	log.Println("=== 初始化权限 ===")
	createdCount := 0
	skippedCount := 0

	for _, perm := range permissions {
		// 检查权限是否已存在（通过 resource 和 action 组合）
		existing, err := permissionRepo.GetByResource(perm.Resource)
		if err == nil {
			// 检查是否已存在相同的 resource 和 action 组合
			exists := false
			for _, p := range existing {
				if p.Action == perm.Action {
					exists = true
					break
				}
			}
			if exists {
				log.Printf("⏭️  权限已存在: %s (%s.%s)", perm.Name, perm.Resource, perm.Action)
				skippedCount++
				continue
			}
		}

		permission := &model.Permission{
			Name:     perm.Name,
			Resource: perm.Resource,
			Action:   perm.Action,
		}

		if err := authzService.CreatePermission(permission); err != nil {
			log.Printf("⚠️  创建权限失败: %s - %v", perm.Name, err)
		} else {
			log.Printf("✅ 创建权限: %s (%s.%s) - %s", perm.Name, perm.Resource, perm.Action, perm.Desc)
			createdCount++
		}
	}

	log.Printf("\n=== 权限初始化完成 ===")
	log.Printf("   创建: %d 个权限", createdCount)
	log.Printf("   跳过: %d 个权限", skippedCount)
}

