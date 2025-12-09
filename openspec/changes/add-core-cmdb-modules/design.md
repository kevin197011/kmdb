# 核心 CMDB 模块架构设计

## Context

本项目需要构建一个现代化的运维 CMDB 平台，支持资产管理、关系管理、配置快照、审计、WebSSH、用户管理、用户群组和授权管理等核心功能。项目采用模块化架构，需要保证高可维护性、高可扩展性和安全性。

## Goals / Non-Goals

### Goals
- 建立清晰的分层架构，便于维护和扩展
- 实现模块化设计，各模块相对独立
- 提供完整的审计能力，所有操作可追溯
- 支持至少 1000 台资产的并发操作
- 支持至少 50 个 WebSSH 并发会话

### Non-Goals
- 本次不实现 OAuth2/SSO 等外部认证集成，仅实现基础的账号密码认证
- 本次不实现消息队列（Kafka/NATS）的集成，审计日志先存储到数据库
- 本次不实现 Redis 缓存层，后续优化时添加
- 本次不实现前端路由和状态管理的完整方案，仅建立基础结构

## Decisions

### 后端框架选择
**决策**：使用 Gin 作为 HTTP 框架

**理由**：
- 性能优秀，社区活跃
- 中间件生态丰富
- 文档完善，易于上手
- 符合项目技术栈要求

**备选方案**：
- Echo：功能类似，但社区相对较小
- Fiber：性能更好，但生态不如 Gin 成熟

### 数据库设计
**决策**：使用 PostgreSQL，采用关系型设计

**理由**：
- 支持复杂查询和关系管理
- ACID 特性保证数据一致性
- JSONB 支持灵活的配置存储
- 符合项目对数据完整性的要求

**表结构设计**：
- `assets` - 资产主表（id, type, name, status, project, metadata, created_at, updated_at）
- `asset_relations` - 资产关系表（source_id, target_id, relation_type, created_at）
- `config_snapshots` - 配置快照表（asset_id, version, config_data, created_at, created_by）
- `audit_logs` - 审计日志表（id, module, action, resource_id, user_id, details, created_at）
- `users` - 用户表（id, username, email, password_hash, status, created_at, updated_at）
- `user_groups` - 用户群组表（id, name, description, created_at, updated_at）
- `user_group_members` - 用户群组成员表（user_id, group_id, created_at）
- `roles` - 角色表（id, name, description, created_at, updated_at）
- `permissions` - 权限表（id, name, resource, action, created_at）
- `role_permissions` - 角色权限关联表（role_id, permission_id）
- `user_roles` - 用户角色关联表（user_id, role_id, created_at）
- `group_roles` - 群组角色关联表（group_id, role_id, created_at）
- `user_favorite_assets` - 用户收藏资产表（user_id, asset_id, created_at）
- `user_webssh_history` - 用户 WebSSH 连接历史表（user_id, asset_id, last_connected_at, connection_count）

### 前端架构
**决策**：使用 React + shadcn/ui + TailwindCSS

**理由**：
- shadcn/ui 提供高质量组件，可定制性强
- TailwindCSS 支持快速开发
- React 生态成熟，便于扩展

### WebSSH 实现
**决策**：使用 Go 的 `golang.org/x/crypto/ssh` 和前端 `xterm.js`

**理由**：
- Go 标准库支持，稳定可靠
- xterm.js 是成熟的 Web 终端库
- 便于集成审计功能

### 审计机制
**决策**：采用数据库存储 + 事件钩子模式

**理由**：
- 初期实现简单，无需引入消息队列
- 保证审计日志的可靠性
- 后续可扩展为事件流模式

**实现方式**：
- 在 service 层添加审计钩子
- 所有写操作自动记录审计日志
- WebSSH 操作单独记录命令和输出

### 用户认证和授权
**决策**：实现基于 RBAC（基于角色的访问控制）的权限管理系统

**理由**：
- RBAC 是成熟且灵活的权限模型
- 支持角色继承和权限组合
- 便于管理和维护
- 符合企业级应用的安全要求

**实现方式**：
- 用户通过用户名/密码登录，生成 JWT token
- 权限检查通过中间件实现
- 支持用户直接分配角色和通过群组继承角色
- 权限粒度：资源（如 assets）+ 操作（如 create, read, update, delete）

**密码安全**：
- 使用 bcrypt 进行密码哈希
- 密码强度要求：至少 8 位，包含大小写字母和数字
- 支持密码重置功能

**JWT Token**：
- Token 有效期：24 小时
- Refresh token 有效期：7 天
- Token 存储在 HTTP-only cookie 或 Authorization header

## Risks / Trade-offs

### 风险 1：性能瓶颈
**风险**：单节点处理 1000 台资产并发操作可能成为瓶颈

**缓解措施**：
- 数据库添加适当索引（包括 assets.project）
- 关键查询使用连接池
- 后续引入 Redis 缓存层
- 考虑分库分表方案

### 风险 2：WebSSH 安全性
**风险**：WebSSH 是安全敏感功能，需要严格的安全控制

**缓解措施**：
- 强制使用 HTTPS
- 实现会话超时机制
- 记录所有操作到审计日志
- 后续实现基于 RBAC 的权限控制

### 风险 3：模块耦合
**风险**：模块间过度耦合会影响可扩展性

**缓解措施**：
- 采用接口定义模块边界
- 使用依赖注入减少耦合
- 模块间通过事件或服务调用通信

## Migration Plan

### 阶段 1：基础架构（本次提案）
- 建立项目结构
- 实现数据库 schema
- 实现基础 API 框架
- 实现前端基础结构

### 阶段 2：核心功能实现
- 实现 Assets 模块 CRUD
- 实现 Relations 模块
- 实现 Configs 模块
- 实现 Audit 模块基础功能
- 实现 WebSSH 基础功能
- 实现用户管理模块（用户 CRUD、登录、密码管理）
- 实现用户群组模块（群组 CRUD、成员管理）
- 实现授权管理模块（角色、权限、RBAC）

### 阶段 3：集成和优化
- 模块间集成测试
- 性能优化
- 安全加固
- 文档完善

### 回滚计划
- 数据库迁移使用版本控制，支持回滚
- API 版本化，支持向后兼容
- 前端采用渐进式部署

## Open Questions

- [ ] 是否需要支持资产的批量导入/导出功能？
- [ ] WebSSH 是否需要支持文件传输（SFTP）？
- [ ] 配置快照的保留策略（保留多少版本，保留多长时间）？
- [ ] 审计日志的归档策略？
- [ ] 是否需要支持角色的层级继承？
- [ ] 是否需要支持基于资源的细粒度权限（如特定资产的访问控制）？

