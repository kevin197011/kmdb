# 数据库迁移

本目录包含数据库迁移脚本。

## 使用方式

迁移脚本将在后续任务中实现，使用 GORM 的 AutoMigrate 功能或独立的迁移工具（如 golang-migrate）。

## 迁移顺序

1. 创建基础表结构（users, roles, permissions 等）
2. 创建业务表结构（assets, relations, config_snapshots 等）
3. 创建关联表（user_roles, role_permissions 等）
4. 创建索引

