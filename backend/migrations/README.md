# 数据库迁移

此目录用于存放数据库迁移 SQL 文件。

## 目录结构

```
migrations/
├── README.md           # 本文件
└── sql/               # SQL 迁移文件目录
    ├── 001_init.sql    # 初始化表结构（由 GORM 自动生成，此文件仅供参考）
    └── ...            # 后续变更 SQL
```

## 说明

### 自动迁移

当前系统使用 GORM 的 `AutoMigrate` 功能自动管理表结构。迁移逻辑已集成到后端主程序中，在服务启动时自动执行：

- 表结构创建/更新：由 GORM 自动处理
- 种子数据：创建默认管理员用户

### 手动 SQL 迁移

如需执行复杂的数据迁移或 GORM 无法处理的变更，可在 `sql/` 目录下添加 SQL 文件：

1. 命名规范：`NNN_description.sql`（如 `002_add_index.sql`）
2. 按序号顺序执行
3. 确保 SQL 是幂等的（可重复执行不会出错）

### 环境变量

```bash
ADMIN_USERNAME=admin       # 默认管理员用户名
ADMIN_PASSWORD=Admin123    # 默认管理员密码
ADMIN_EMAIL=admin@kmdb.local  # 默认管理员邮箱
```

## 注意事项

- 生产环境请务必修改默认管理员密码
- 复杂的数据迁移建议先在测试环境验证
- 重要变更前请备份数据库
