package api

import (
	"github.com/gin-gonic/gin"
	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/internal/middleware"
	"github.com/kmdb/kmdb/repository"
	"github.com/kmdb/kmdb/service"
	"gorm.io/gorm"
)

func SetupRouter(cfg *config.Config, db *gorm.DB) *gin.Engine {
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// 基础中间件
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())
	router.Use(middleware.ErrorHandler())

	// 健康检查端点（支持 GET 和 HEAD 请求）
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "kmdb"})
	})
	router.HEAD("/health", func(c *gin.Context) {
		c.Status(200)
	})

	// Swagger API 文档端点
	router.GET("/api/docs", func(c *gin.Context) {
		c.Redirect(302, "/api/docs/")
	})
	router.GET("/api/docs/", serveSwaggerUI)
	router.GET("/api/docs/swagger.json", serveSwaggerJSON)

	// 初始化 repositories
	userRepo := repository.NewUserRepository(db)
	userGroupRepo := repository.NewUserGroupRepository(db)
	userGroupMemberRepo := repository.NewUserGroupMemberRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	rolePermissionRepo := repository.NewRolePermissionRepository(db)
	userRoleRepo := repository.NewUserRoleRepository(db)
	groupRoleRepo := repository.NewGroupRoleRepository(db)
	projectRepo := repository.NewProjectRepository(db)
	assetRepo := repository.NewAssetRepository(db)
	assetCredentialRepo := repository.NewAssetCredentialRepository(db)
	favoriteRepo := repository.NewFavoriteRepository(db)
	websshHistoryRepo := repository.NewWebSSHHistoryRepository(db)
	assetPermissionRepo := repository.NewAssetPermissionRepository(db)
	projectPermissionRepo := repository.NewProjectPermissionRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	apiTokenRepo := repository.NewAPITokenRepository(db)

	// 初始化 services
	userService := service.NewUserService(userRepo)
	userGroupService := service.NewUserGroupService(userGroupRepo, userGroupMemberRepo, userRepo)
	authzService := service.NewAuthorizationService(
		roleRepo,
		permissionRepo,
		rolePermissionRepo,
		userRoleRepo,
		groupRoleRepo,
		userGroupMemberRepo,
	)
	authService := service.NewAuthService(userService, userRepo, cfg)
	auditService := service.NewAuditService(auditRepo)
	auditHook := service.NewAuditHook(auditService)
	apiTokenService := service.NewAPITokenService(apiTokenRepo)
	projectService := service.NewProjectService(projectRepo, assetRepo)
	assetService := service.NewAssetServiceWithAudit(assetRepo, auditHook)
	assetCredentialService := service.NewAssetCredentialService(assetCredentialRepo, assetRepo)
	favoriteService := service.NewFavoriteService(favoriteRepo, assetRepo)
	assetPermissionService := service.NewAssetPermissionService(
		assetPermissionRepo,
		assetRepo,
		userRoleRepo,
		groupRoleRepo,
		userGroupMemberRepo,
	)
	projectPermissionService := service.NewProjectPermissionService(
		projectPermissionRepo,
		projectRepo,
		userRoleRepo,
		groupRoleRepo,
		userGroupMemberRepo,
	)
	websshService := service.NewWebSSHService(assetRepo, websshHistoryRepo, auditHook)

	// 初始化 handlers
	userHandler := NewUserHandler(userService)
	passwordHandler := NewPasswordHandler(userService)
	userGroupHandler := NewUserGroupHandler(userGroupService)
	authzHandler := NewAuthorizationHandler(authzService)
	authHandler := NewAuthHandler(authService)
	projectHandler := NewProjectHandler(projectService)
	assetHandler := NewAssetHandler(assetService)
	assetCredentialHandler := NewAssetCredentialHandler(assetCredentialService)
	favoriteHandler := NewFavoriteHandler(favoriteService)
	assetPermissionHandler := NewAssetPermissionHandler(assetPermissionService)
	projectPermissionHandler := NewProjectPermissionHandler(projectPermissionService)
	websshHandler := NewWebSSHHandler(websshService, assetCredentialService)
	auditHandler := NewAuditHandler(auditService)
	apiTokenHandler := NewAPITokenHandler(apiTokenService)
	dashboardHandler := NewDashboardHandler(
		assetRepo,
		userRepo,
		projectRepo,
		userGroupRepo,
		roleRepo,
		auditRepo,
	)

	// 认证中间件（支持 JWT 和 API Token）
	authMiddleware := middleware.AuthMiddlewareWithAPIToken(authService, apiTokenService, cfg)

	// API v1 路由组
	v1 := router.Group("/api/v1")
	{
		// 公开路由（无需认证）
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
		}

		// 需要认证的路由
		protected := v1.Group("")
		protected.Use(authMiddleware)
		{
			// Dashboard 路由
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/stats", dashboardHandler.GetDashboardStats)
			}

			// Users 路由
			users := protected.Group("/users")
			{
				users.POST("", userHandler.CreateUser)
				users.GET("", userHandler.ListUsers)
				users.GET("/:id", userHandler.GetUser)
				users.PUT("/:id", userHandler.UpdateUser)
				users.DELETE("/:id", userHandler.DeleteUser)
				users.GET("/:id/groups", userGroupHandler.GetUserGroups)
				users.POST("/:id/change-password", passwordHandler.ChangePassword)
			}

			// User Groups 路由
			userGroups := protected.Group("/user-groups")
			{
				userGroups.POST("", userGroupHandler.CreateGroup)
				userGroups.GET("", userGroupHandler.ListGroups)
				userGroups.GET("/:id", userGroupHandler.GetGroup)
				userGroups.PUT("/:id", userGroupHandler.UpdateGroup)
				userGroups.DELETE("/:id", userGroupHandler.DeleteGroup)
				userGroups.GET("/:id/members", userGroupHandler.GetMembers)
				userGroups.POST("/:id/members", userGroupHandler.AddMember)
				userGroups.DELETE("/:id/members/:user_id", userGroupHandler.RemoveMember)
			}

			// Projects 路由
			projects := protected.Group("/projects")
			{
				projects.POST("", projectHandler.CreateProject)
				projects.GET("", projectHandler.ListProjects)
				projects.GET("/:id", projectHandler.GetProject)
				projects.PUT("/:id", projectHandler.UpdateProject)
				projects.DELETE("/:id", projectHandler.DeleteProject)
				projects.GET("/:id/assets", projectHandler.GetProjectAssets)
				// 项目权限管理
				projects.GET("/:id/permissions", projectPermissionHandler.GetProjectPermissions)
				projects.POST("/:id/permissions/roles", projectPermissionHandler.AssignPermissionToRole)
				projects.POST("/:id/permissions/users", projectPermissionHandler.AssignPermissionToUser)
			}

			// Assets 路由
			assets := protected.Group("/assets")
			{
				assets.POST("", assetHandler.CreateAsset)
				assets.GET("", assetHandler.ListAssets)
				assets.GET("/stats/project", assetHandler.GetAssetCountByProject)
				assets.GET("/:id", assetHandler.GetAsset)
				assets.PUT("/:id", assetHandler.UpdateAsset)
				assets.DELETE("/:id", assetHandler.DeleteAsset)
				assets.POST("/:id/favorite", favoriteHandler.AddFavorite)
				assets.DELETE("/:id/favorite", favoriteHandler.RemoveFavorite)
				assets.GET("/:id/favorite", favoriteHandler.IsFavorite)
				// 资产权限管理
				assets.GET("/:id/permissions", assetPermissionHandler.GetAssetPermissions)
				assets.POST("/:id/permissions/roles", assetPermissionHandler.AssignPermissionToRole)
				assets.POST("/:id/permissions/users", assetPermissionHandler.AssignPermissionToUser)
				// 资产凭证管理
				assets.GET("/:id/credentials", assetCredentialHandler.GetCredentialsByAsset)
				assets.POST("/:id/credentials/:credential_id/set-default", assetCredentialHandler.SetDefaultCredential)
			}

			// Asset Permissions 路由
			assetPermissions := protected.Group("/asset-permissions")
			{
				assetPermissions.DELETE("/:permission_id", assetPermissionHandler.RevokePermission)
			}

			// Asset Credentials 路由
			assetCredentials := protected.Group("/asset-credentials")
			{
				assetCredentials.GET("", assetCredentialHandler.GetAllCredentials)
				assetCredentials.POST("", assetCredentialHandler.CreateCredential)
				assetCredentials.GET("/:id", assetCredentialHandler.GetCredential)
				assetCredentials.PUT("/:id", assetCredentialHandler.UpdateCredential)
				assetCredentials.DELETE("/:id", assetCredentialHandler.DeleteCredential)
			}

			// Project Permissions 删除路由
			projectPermissions := protected.Group("/project-permissions")
			{
				projectPermissions.DELETE("/:permission_id", projectPermissionHandler.RevokePermission)
			}

			// Favorites 路由
			favorites := protected.Group("/favorites")
			{
				favorites.GET("", favoriteHandler.GetUserFavorites)
			}

			// Audit 路由
			audit := protected.Group("/audit-logs")
			{
				audit.GET("", auditHandler.GetAuditLogs)
			}

			// API Tokens 路由
			apiTokens := protected.Group("/api-tokens")
			{
				apiTokens.POST("", apiTokenHandler.CreateToken)
				apiTokens.GET("", apiTokenHandler.ListTokens)
				apiTokens.GET("/my", apiTokenHandler.GetMyTokens)
				apiTokens.GET("/:id", apiTokenHandler.GetToken)
				apiTokens.POST("/:id/revoke", apiTokenHandler.RevokeToken)
				apiTokens.DELETE("/:id", apiTokenHandler.DeleteToken)
			}

			// Roles 路由
			roles := protected.Group("/roles")
			{
				roles.POST("", authzHandler.CreateRole)
				roles.GET("", authzHandler.ListRoles)
				roles.GET("/:id", authzHandler.GetRole)
				roles.PUT("/:id", authzHandler.UpdateRole)
				roles.DELETE("/:id", authzHandler.DeleteRole)
				roles.GET("/:id/permissions", authzHandler.GetRolePermissions)
				roles.POST("/:id/permissions", authzHandler.AssignPermissionToRole)
				roles.DELETE("/:id/permissions/:permission_id", authzHandler.RevokePermissionFromRole)
			}

			// Permissions 路由
			permissions := protected.Group("/permissions")
			{
				permissions.POST("", authzHandler.CreatePermission)
				permissions.GET("", authzHandler.ListPermissions)
				permissions.GET("/:id", authzHandler.GetPermission)
			}

			// 用户角色管理（扩展 Users 路由）
			users.GET("/:id/roles", authzHandler.GetUserRoles)
			users.POST("/:id/roles", authzHandler.AssignRoleToUser)
			users.DELETE("/:id/roles/:role_id", authzHandler.RevokeRoleFromUser)

			// 群组角色管理（扩展 User Groups 路由）
			userGroups.GET("/:id/roles", authzHandler.GetGroupRoles)
			userGroups.POST("/:id/roles", authzHandler.AssignRoleToGroup)
			userGroups.DELETE("/:id/roles/:role_id", authzHandler.RevokeRoleFromGroup)

			// 权限检查路由
			authz := protected.Group("/authz")
			{
				authz.GET("/check", authzHandler.CheckPermission)
				authz.GET("/permissions", authzHandler.GetUserPermissions)
			}

			// WebSSH 路由
			webssh := protected.Group("/webssh")
			{
				webssh.POST("/connect", websshHandler.Connect)
				webssh.GET("/ws/:session_id", websshHandler.WebSocket)
				webssh.POST("/:session_id/resize", websshHandler.Resize)
				webssh.DELETE("/:session_id", websshHandler.Close)
			}
		}
	}

	return router
}
