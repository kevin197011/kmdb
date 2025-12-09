package main

import (
	"log"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/database"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

// 权限迁移脚本
// 将旧的权限数据迁移到新的统一权限表
// 执行: go run ./migrations/migrate_permissions.go

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("开始权限数据迁移...")

	// 1. 迁移 UserGroup -> Team
	log.Println("1. 迁移用户组 -> 团队...")
	migrateUserGroupsToTeams(db)

	// 2. 迁移 UserGroupMember -> TeamMember
	log.Println("2. 迁移用户组成员 -> 团队成员...")
	migrateUserGroupMembersToTeamMembers(db)

	// 3. 迁移 GroupRole -> ScopedPermission (团队角色权限)
	log.Println("3. 迁移群组角色...")
	migrateGroupRoles(db)

	// 4. 迁移 AssetPermission -> ScopedPermission
	log.Println("4. 迁移资产权限...")
	migrateAssetPermissions(db)

	// 5. 迁移 ProjectPermission -> ScopedPermission
	log.Println("5. 迁移项目权限...")
	migrateProjectPermissions(db)

	// 6. 为超级管理员角色创建全局权限
	log.Println("6. 创建超级管理员权限...")
	createSuperAdminPermission(db)

	log.Println("权限数据迁移完成!")
}

func migrateUserGroupsToTeams(db *gorm.DB) {
	var groups []model.UserGroup
	if err := db.Find(&groups).Error; err != nil {
		log.Printf("获取用户组失败: %v", err)
		return
	}

	for _, group := range groups {
		// 检查是否已存在同名团队
		var existingTeam model.Team
		if err := db.Where("name = ?", group.Name).First(&existingTeam).Error; err == nil {
			log.Printf("团队 %s 已存在，跳过", group.Name)
			continue
		}

		team := model.Team{
			ID:          group.ID, // 保持相同 ID 以便后续关联迁移
			Name:        group.Name,
			Description: group.Description,
			CreatedAt:   group.CreatedAt,
			UpdatedAt:   group.UpdatedAt,
		}

		if err := db.Create(&team).Error; err != nil {
			log.Printf("创建团队 %s 失败: %v", group.Name, err)
		} else {
			log.Printf("迁移团队: %s", group.Name)
		}
	}
}

func migrateUserGroupMembersToTeamMembers(db *gorm.DB) {
	var members []model.UserGroupMember
	if err := db.Find(&members).Error; err != nil {
		log.Printf("获取用户组成员失败: %v", err)
		return
	}

	for _, member := range members {
		// 检查是否已存在
		var existing model.TeamMember
		if err := db.Where("team_id = ? AND user_id = ?", member.GroupID, member.UserID).First(&existing).Error; err == nil {
			continue
		}

		teamMember := model.TeamMember{
			TeamID:    member.GroupID, // UserGroup.ID -> Team.ID
			UserID:    member.UserID,
			Role:      model.TeamRoleMember, // 默认为普通成员
			CreatedAt: member.CreatedAt,
		}

		if err := db.Create(&teamMember).Error; err != nil {
			log.Printf("创建团队成员失败: %v", err)
		}
	}
	log.Printf("迁移了 %d 个团队成员", len(members))
}

func migrateGroupRoles(db *gorm.DB) {
	var groupRoles []model.GroupRole
	if err := db.Preload("Role").Find(&groupRoles).Error; err != nil {
		log.Printf("获取群组角色失败: %v", err)
		return
	}

	for _, gr := range groupRoles {
		// 为团队添加角色的所有权限
		var rolePermissions []model.RolePermission
		if err := db.Preload("Permission").Where("role_id = ?", gr.RoleID).Find(&rolePermissions).Error; err != nil {
			continue
		}

		for _, rp := range rolePermissions {
			// 检查是否已存在
			var existing model.ScopedPermission
			if err := db.Where(
				"subject_type = ? AND subject_id = ? AND resource_type = ? AND action = ?",
				model.SubjectTypeTeam, gr.GroupID, rp.Permission.Resource, rp.Permission.Action,
			).First(&existing).Error; err == nil {
				continue
			}

			perm := model.ScopedPermission{
				SubjectType:  model.SubjectTypeTeam,
				SubjectID:    gr.GroupID, // GroupID -> TeamID
				ResourceType: rp.Permission.Resource,
				ResourceID:   nil,
				Action:       rp.Permission.Action,
			}

			if err := db.Create(&perm).Error; err != nil {
				log.Printf("创建团队权限失败: %v", err)
			}
		}
	}
	log.Printf("迁移了 %d 个群组角色", len(groupRoles))
}

func migrateAssetPermissions(db *gorm.DB) {
	var assetPerms []model.AssetPermission
	if err := db.Find(&assetPerms).Error; err != nil {
		log.Printf("获取资产权限失败: %v", err)
		return
	}

	for _, ap := range assetPerms {
		var subjectType string
		var subjectID uuid.UUID

		if ap.UserID != nil {
			subjectType = model.SubjectTypeUser
			subjectID = *ap.UserID
		} else if ap.RoleID != nil {
			subjectType = model.SubjectTypeRole
			subjectID = *ap.RoleID
		} else {
			continue
		}

		// 检查是否已存在
		var existing model.ScopedPermission
		if err := db.Where(
			"subject_type = ? AND subject_id = ? AND resource_type = ? AND resource_id = ? AND action = ?",
			subjectType, subjectID, model.ResourceTypeAsset, ap.AssetID, ap.Action,
		).First(&existing).Error; err == nil {
			continue
		}

		perm := model.ScopedPermission{
			SubjectType:  subjectType,
			SubjectID:    subjectID,
			ResourceType: model.ResourceTypeAsset,
			ResourceID:   &ap.AssetID,
			Action:       ap.Action,
		}

		if err := db.Create(&perm).Error; err != nil {
			log.Printf("创建资产权限失败: %v", err)
		}
	}
	log.Printf("迁移了 %d 个资产权限", len(assetPerms))
}

func migrateProjectPermissions(db *gorm.DB) {
	var projectPerms []model.ProjectPermission
	if err := db.Find(&projectPerms).Error; err != nil {
		log.Printf("获取项目权限失败: %v", err)
		return
	}

	for _, pp := range projectPerms {
		var subjectType string
		var subjectID uuid.UUID

		if pp.UserID != nil {
			subjectType = model.SubjectTypeUser
			subjectID = *pp.UserID
		} else if pp.RoleID != nil {
			subjectType = model.SubjectTypeRole
			subjectID = *pp.RoleID
		} else {
			continue
		}

		// 检查是否已存在
		var existing model.ScopedPermission
		if err := db.Where(
			"subject_type = ? AND subject_id = ? AND resource_type = ? AND resource_id = ? AND action = ?",
			subjectType, subjectID, model.ResourceTypeProject, pp.ProjectID, pp.Action,
		).First(&existing).Error; err == nil {
			continue
		}

		perm := model.ScopedPermission{
			SubjectType:  subjectType,
			SubjectID:    subjectID,
			ResourceType: model.ResourceTypeProject,
			ResourceID:   &pp.ProjectID,
			Action:       pp.Action,
		}

		if err := db.Create(&perm).Error; err != nil {
			log.Printf("创建项目权限失败: %v", err)
		}
	}
	log.Printf("迁移了 %d 个项目权限", len(projectPerms))
}

func createSuperAdminPermission(db *gorm.DB) {
	// 查找或创建超级管理员角色
	var superAdminRole model.Role
	if err := db.Where("name = ?", model.RoleSuperAdmin).First(&superAdminRole).Error; err != nil {
		// 创建超级管理员角色
		superAdminRole = model.Role{
			Name:        model.RoleSuperAdmin,
			Description: "超级管理员，拥有所有权限",
		}
		if err := db.Create(&superAdminRole).Error; err != nil {
			log.Printf("创建超级管理员角色失败: %v", err)
			return
		}
		log.Println("创建了超级管理员角色")
	}

	// 检查是否已有全局权限
	var existing model.ScopedPermission
	if err := db.Where(
		"subject_type = ? AND subject_id = ? AND resource_type = ? AND action = ?",
		model.SubjectTypeRole, superAdminRole.ID, model.ResourceTypeAll, model.ActionAll,
	).First(&existing).Error; err == nil {
		log.Println("超级管理员权限已存在")
		return
	}

	// 为超级管理员角色创建全局权限
	perm := model.ScopedPermission{
		SubjectType:  model.SubjectTypeRole,
		SubjectID:    superAdminRole.ID,
		ResourceType: model.ResourceTypeAll, // *
		ResourceID:   nil,
		Action:       model.ActionAll, // *
	}

	if err := db.Create(&perm).Error; err != nil {
		log.Printf("创建超级管理员权限失败: %v", err)
	} else {
		log.Println("创建了超级管理员全局权限 (*:*)")
	}

	// 将 admin 用户分配超级管理员角色
	var adminUser model.User
	if err := db.Where("username = ?", "admin").First(&adminUser).Error; err == nil {
		var existingRole model.UserRole
		if err := db.Where("user_id = ? AND role_id = ?", adminUser.ID, superAdminRole.ID).First(&existingRole).Error; err != nil {
			userRole := model.UserRole{
				UserID: adminUser.ID,
				RoleID: superAdminRole.ID,
			}
			if err := db.Create(&userRole).Error; err != nil {
				log.Printf("分配超级管理员角色失败: %v", err)
			} else {
				log.Println("已将 admin 用户设为超级管理员")
			}
		}
	}
}

