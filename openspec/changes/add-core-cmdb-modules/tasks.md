## 1. 项目基础架构

- [x] 1.1 初始化 Go 项目结构（cmd/server, api/, service/, repository/, model/）
- [x] 1.2 配置 Gin 框架和基础中间件（日志、错误处理、CORS）
- [x] 1.3 配置 PostgreSQL 数据库连接和迁移工具
- [x] 1.4 初始化 React 项目结构（src/components, src/pages, src/services）
- [x] 1.5 配置 shadcn/ui 和 TailwindCSS
- [x] 1.6 配置开发环境（Air 热重载、前端开发服务器）

## 2. 数据库 Schema

- [x] 2.1 创建 assets 表（id, type, name, status, project, metadata, created_at, updated_at）
- [x] 2.2 创建 asset_relations 表（source_id, target_id, relation_type, created_at）
- [x] 2.3 创建 config_snapshots 表（asset_id, version, config_data, created_at, created_by）
- [x] 2.4 创建 audit_logs 表（id, module, action, resource_id, user_id, details, created_at）
- [x] 2.5 创建 users 表（id, username, email, password_hash, status, created_at, updated_at）
- [x] 2.6 创建 user_groups 表（id, name, description, created_at, updated_at）
- [x] 2.7 创建 user_group_members 表（user_id, group_id, created_at）
- [x] 2.8 创建 roles 表（id, name, description, created_at, updated_at）
- [x] 2.9 创建 permissions 表（id, name, resource, action, created_at）
- [x] 2.10 创建 role_permissions 表（role_id, permission_id）
- [x] 2.11 创建 user_roles 表（user_id, role_id, created_at）
- [x] 2.12 创建 group_roles 表（group_id, role_id, created_at）
- [x] 2.13 创建 user_favorite_assets 表（user_id, asset_id, created_at）
- [x] 2.14 创建 user_webssh_history 表（user_id, asset_id, last_connected_at, connection_count）
- [x] 2.15 创建必要的索引（assets.type, assets.status, assets.project, users.username, users.email, user_group_members.user_id, user_group_members.group_id, role_permissions.role_id, user_roles.user_id, group_roles.group_id, user_favorite_assets.user_id, user_webssh_history.user_id）
- [x] 2.16 编写数据库迁移脚本

## 3. Assets 模块

- [x] 3.1 实现 Asset 模型定义（Go struct）
- [x] 3.2 实现 AssetRepository（Create, Get, List, Update, Delete）
- [x] 3.3 实现 AssetService（业务逻辑层）
- [x] 3.4 实现 Asset API handlers（POST /assets, GET /assets, GET /assets/:id, PUT /assets/:id, DELETE /assets/:id），支持项目字段
- [x] 3.5 实现前端 Asset 列表页面，支持按项目过滤
- [x] 3.6 实现前端 Asset 创建/编辑表单，包含项目字段
- [x] 3.7 实现按项目统计资产数量的 API
- [ ] 3.8 编写 Assets 模块单元测试

## 4. Relations 模块

- [x] 4.1 实现 Relation 模型定义
- [x] 4.2 实现 RelationRepository（Create, GetBySource, GetByTarget, Delete）
- [x] 4.3 实现 RelationService（包含关系验证逻辑）
- [x] 4.4 实现 Relation API handlers（POST /relations, GET /assets/:id/relations, DELETE /relations/:id）
- [x] 4.5 实现前端关系管理组件
- [ ] 4.6 在前端资产详情页展示关系图（可选，需要图形库）
- [ ] 4.7 编写 Relations 模块单元测试

## 5. Configs 模块

- [x] 5.1 实现 ConfigSnapshot 模型定义
- [x] 5.2 实现 ConfigRepository（Create, GetByAsset, GetVersion, ListVersions）
- [x] 5.3 实现 ConfigService（版本管理逻辑）
- [x] 5.4 实现 Config API handlers（POST /assets/:id/configs, GET /assets/:id/configs, GET /configs/:id）
- [x] 5.5 实现前端配置快照列表页面
- [x] 5.6 实现前端配置对比功能
- [ ] 5.7 编写 Configs 模块单元测试

## 6. Audit 模块

- [x] 6.1 实现 AuditLog 模型定义
- [x] 6.2 实现 AuditRepository（Create, Query）
- [x] 6.3 实现 AuditService 和审计钩子接口
- [x] 6.4 在 Assets/Relations/Configs Service 中集成审计钩子（Assets 已完成）
- [x] 6.5 实现 Audit API handlers（GET /audit-logs）
- [x] 6.6 实现前端审计日志查询页面
- [ ] 6.7 编写 Audit 模块单元测试

## 7. WebSSH 模块

- [x] 7.1 实现 WebSSH 服务（SSH 连接管理）
- [x] 7.2 实现 WebSocket 处理器（终端 I/O）
- [x] 7.3 实现 WebSSH API handlers（POST /webssh/connect, WebSocket /webssh/ws/:session_id）
- [x] 7.14 集成 WebSSH 操作到 Audit 模块
- [x] 7.15 实现会话超时和清理机制
- [x] 7.4 实现前端 WebSSH 页面（使用 xterm.js）
- [x] 7.5 实现多会话标签页管理
- [x] 7.6 实现主机清单侧边栏组件（显示资产列表）
- [x] 7.7 实现主机清单快速连接功能（点击资产快速连接）
- [x] 7.8 实现主机清单会话状态显示（显示连接状态、会话数量）
- [x] 7.9 实现主机清单切换会话功能（从清单切换到对应会话）
- [x] 7.10 实现主机清单过滤和搜索功能（按项目、类型、关键词搜索）
- [x] 7.11 实现主机清单分组功能（按类型分组、按项目分组、按收藏分组）
- [x] 7.12 实现主机收藏功能（收藏/取消收藏资产）
- [ ] 7.13 实现主机清单上下文菜单（快速断开连接等操作）（基础断开功能已实现）
- [ ] 7.16 编写 WebSSH 模块单元测试

## 8. 用户管理模块

- [x] 8.1 实现 User 模型定义（Go struct）
- [x] 8.2 实现 UserRepository（Create, Get, GetByUsername, GetByEmail, List, Update, Delete）
- [x] 8.3 实现 UserService（业务逻辑层，包含密码哈希和验证）
- [x] 8.4 实现用户认证服务（登录、JWT token 生成和验证）
- [x] 8.5 实现 User API handlers（POST /users, GET /users, GET /users/:id, PUT /users/:id, DELETE /users/:id, POST /auth/login, POST /auth/logout）
- [x] 8.6 实现密码管理 API（POST /users/:id/change-password）
- [x] 8.7 实现前端用户列表页面
- [x] 8.8 实现前端用户创建/编辑表单
- [x] 8.9 实现前端登录页面
- [x] 8.10 实现 JWT token 存储和刷新机制
- [ ] 8.11 编写用户管理模块单元测试

## 9. 用户群组模块

- [x] 9.1 实现 UserGroup 模型定义
- [x] 9.2 实现 UserGroupRepository（Create, Get, List, Update, Delete）
- [x] 9.3 实现 UserGroupMemberRepository（AddMember, RemoveMember, GetMembers, GetUserGroups）
- [x] 9.4 实现 UserGroupService（业务逻辑层）
- [x] 9.5 实现 UserGroup API handlers（POST /user-groups, GET /user-groups, GET /user-groups/:id, PUT /user-groups/:id, DELETE /user-groups/:id）
- [x] 9.6 实现群组成员管理 API（POST /user-groups/:id/members, DELETE /user-groups/:id/members/:user_id, GET /user-groups/:id/members）
- [x] 9.7 实现前端群组列表页面
- [x] 9.8 实现前端群组创建/编辑表单
- [x] 9.9 实现前端群组成员管理界面
- [ ] 9.10 编写用户群组模块单元测试

## 10. 授权管理模块

- [x] 10.1 实现 Role 和 Permission 模型定义
- [x] 10.2 实现 RoleRepository（Create, Get, List, Update, Delete）
- [x] 10.3 实现 PermissionRepository（Create, Get, List, GetByResource）
- [x] 10.4 实现 RolePermissionRepository（AssignPermission, RevokePermission, GetRolePermissions, GetPermissionRoles）
- [x] 10.5 实现 UserRoleRepository 和 GroupRoleRepository（AssignRole, RevokeRole, GetUserRoles, GetGroupRoles）
- [x] 10.6 实现 AuthorizationService（权限检查逻辑，支持用户直接角色和群组继承角色）
- [x] 10.7 实现权限检查中间件（JWT 验证 + 权限验证）
- [x] 10.8 实现 Role API handlers（POST /roles, GET /roles, GET /roles/:id, PUT /roles/:id, DELETE /roles/:id）
- [x] 10.9 实现 Permission API handlers（GET /permissions, GET /permissions/:id）
- [x] 10.10 实现角色权限管理 API（POST /roles/:id/permissions, DELETE /roles/:id/permissions/:permission_id, GET /roles/:id/permissions）
- [x] 10.11 实现用户角色管理 API（POST /users/:id/roles, DELETE /users/:id/roles/:role_id, GET /users/:id/roles）
- [x] 10.12 实现群组角色管理 API（POST /user-groups/:id/roles, DELETE /user-groups/:id/roles/:role_id, GET /user-groups/:id/roles）
- [ ] 10.13 在所有业务 API 中集成权限检查中间件（可选，当前使用基础认证）
- [x] 10.14 实现前端角色列表页面
- [x] 10.15 实现前端角色创建/编辑表单
- [x] 10.16 实现前端权限管理界面
- [x] 10.17 实现前端用户/群组角色分配界面
- [ ] 10.18 编写授权管理模块单元测试

## 11. 集成和测试

- [ ] 11.1 编写集成测试（数据库 + API）
- [ ] 11.2 编写前端组件测试
- [ ] 11.3 端到端测试关键流程
- [ ] 11.4 权限测试（不同角色的访问控制）
- [ ] 11.5 性能测试（1000 资产并发操作）
- [ ] 11.6 WebSSH 并发测试（50 会话）

## 12. 文档和部署

- [ ] 12.1 编写 API 文档
- [ ] 12.2 编写部署文档（Docker Compose）
- [ ] 12.3 编写开发环境搭建文档
- [ ] 12.4 编写权限管理使用文档
- [ ] 12.5 配置 CI/CD 基础流程

