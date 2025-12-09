# KMDB - 运维 CMDB 管理平台

现代化的运维 CMDB（Configuration Management Database）管理平台，提供资产管理、项目管理、WebSSH、API Token 管理和完整的 RBAC 权限系统。

## 功能特性

### 核心功能
- **仪表盘**：系统概览、资产统计、最新活动
- **资产管理**：服务器、虚拟机、网络设备、应用的统一管理
- **项目管理**：按项目组织和管理资产，支持项目级权限控制
- **主机密钥**：SSH 凭证管理，支持密码和密钥认证
- **WebSSH**：通过 Web 界面便捷、安全地登录和操作远程主机

### 用户与权限
- **用户管理**：用户账号的创建、编辑、删除
- **用户群组**：用户分组管理
- **角色权限**：完整的 RBAC 权限管理系统
- **用户角色**：为用户分配角色
- **群组角色**：为群组分配角色

### 开发者功能
- **API Token**：创建和管理用于程序化访问的 Token
- **Swagger 文档**：完整的 API 文档，支持在线测试
- **审计日志**：操作审计、变更追踪

## 技术栈

- **Backend**: Go 1.23 + Gin + GORM
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL 16
- **WebSSH**: xterm.js + WebSocket + golang.org/x/crypto/ssh
- **容器化**: Docker + Docker Compose

## 快速开始

### 使用 Docker Compose（推荐）

1. **克隆项目**
```bash
git clone <repository-url>
cd kmdb
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，修改数据库密码和 JWT Secret
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问应用**
- 前端界面: http://localhost
- API 文档: http://localhost/api/docs/
- 健康检查: http://localhost/health

5. **默认登录账号**
- 用户名: `admin`
- 密码: `Admin123`（可通过 `.env` 文件中的 `ADMIN_PASSWORD` 环境变量修改）
- ⚠️ **重要**: 首次登录后请立即修改密码！

6. **查看日志**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

7. **停止服务**
```bash
docker-compose down
```

### 本地开发

#### 后端开发

1. **安装依赖**
```bash
go mod download
```

2. **配置数据库**
```bash
# 启动 PostgreSQL（使用 Docker）
docker run -d \
  --name kmdb-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kmdb \
  -p 5432:5432 \
  postgres:16-alpine
```

3. **运行数据库迁移**
```bash
go run ./migrations/migrate.go
```

4. **启动后端服务**
```bash
# 使用 Air 热重载
air

# 或直接运行
go run ./cmd/server/main.go
```

#### 前端开发

1. **安装依赖**
```bash
cd web
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **构建生产版本**
```bash
npm run build
```

## 项目结构

```
kmdb/
├── api/              # HTTP handlers
├── cmd/              # 应用入口
├── internal/         # 内部包
│   ├── config/       # 配置管理
│   ├── database/     # 数据库连接
│   └── middleware/   # 中间件（认证、日志等）
├── model/            # 数据模型
├── repository/       # 数据访问层
├── service/          # 业务逻辑层
├── migrations/       # 数据库迁移和种子数据
├── web/              # 前端应用
│   ├── src/
│   │   ├── components/  # 通用组件
│   │   ├── pages/       # 页面组件
│   │   ├── hooks/       # 自定义 Hooks
│   │   └── services/    # API 服务
│   └── ...
└── test/             # 测试相关文件
```

## API 文档

### 在线文档

访问 http://localhost/api/docs/ 查看完整的 Swagger API 文档。

### 认证方式

#### 1. JWT Token（Web 界面使用）

```bash
# 登录获取 Token
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123"}'

# 使用 Token
curl http://localhost/api/v1/assets \
  -H "Authorization: Bearer <access_token>"
```

#### 2. API Token（程序化访问）

在 **API Token 管理** 页面创建 Token 后，可通过以下方式使用：

```bash
# 方式 1: X-API-Key header（推荐）
curl http://localhost/api/v1/assets \
  -H "X-API-Key: kmdb_xxxxxxxx"

# 方式 2: Authorization Bearer header
curl http://localhost/api/v1/assets \
  -H "Authorization: Bearer kmdb_xxxxxxxx"

# 方式 3: 查询参数
curl "http://localhost/api/v1/assets?api_key=kmdb_xxxxxxxx"
```

### 主要 API 端点

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| **认证** | POST | `/api/v1/auth/login` | 用户登录 |
| | POST | `/api/v1/auth/logout` | 用户登出 |
| | POST | `/api/v1/auth/refresh` | 刷新 Token |
| **仪表盘** | GET | `/api/v1/dashboard/stats` | 获取统计数据 |
| **资产** | GET | `/api/v1/assets` | 获取资产列表 |
| | POST | `/api/v1/assets` | 创建资产 |
| | GET | `/api/v1/assets/:id` | 获取资产详情 |
| | PUT | `/api/v1/assets/:id` | 更新资产 |
| | DELETE | `/api/v1/assets/:id` | 删除资产 |
| **项目** | GET | `/api/v1/projects` | 获取项目列表 |
| | POST | `/api/v1/projects` | 创建项目 |
| | GET | `/api/v1/projects/:id` | 获取项目详情 |
| | PUT | `/api/v1/projects/:id` | 更新项目 |
| | DELETE | `/api/v1/projects/:id` | 删除项目 |
| **凭证** | GET | `/api/v1/asset-credentials` | 获取凭证列表 |
| | POST | `/api/v1/asset-credentials` | 创建凭证 |
| | PUT | `/api/v1/asset-credentials/:id` | 更新凭证 |
| | DELETE | `/api/v1/asset-credentials/:id` | 删除凭证 |
| **API Token** | GET | `/api/v1/api-tokens` | 获取 Token 列表 |
| | POST | `/api/v1/api-tokens` | 创建 Token |
| | GET | `/api/v1/api-tokens/my` | 获取当前用户 Token |
| | POST | `/api/v1/api-tokens/:id/revoke` | 撤销 Token |
| | DELETE | `/api/v1/api-tokens/:id` | 删除 Token |
| **WebSSH** | POST | `/api/v1/webssh/connect` | 建立 SSH 连接 |
| | GET | `/api/v1/webssh/ws/:session_id` | WebSocket 连接 |
| | POST | `/api/v1/webssh/:session_id/resize` | 调整终端大小 |
| | DELETE | `/api/v1/webssh/:session_id` | 关闭会话 |
| **审计** | GET | `/api/v1/audit-logs` | 获取审计日志 |

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | postgres |
| DB_NAME | 数据库名称 | kmdb |
| DB_SSLMODE | SSL 模式 | disable |
| PORT | 后端服务端口 | 8080 |
| ENV | 运行环境 | development |
| JWT_SECRET | JWT 密钥 | change-me-in-production |
| ADMIN_USERNAME | 默认管理员用户名 | admin |
| ADMIN_PASSWORD | 默认管理员密码 | Admin123 |
| ADMIN_EMAIL | 默认管理员邮箱 | admin@kmdb.local |

## 开发工具

### Air 热重载

后端开发使用 Air 实现热重载：

```bash
# 安装 Air
go install github.com/cosmtrek/air@latest

# 运行（使用 .air.toml 配置）
air
```

### 数据库迁移

```bash
# 运行迁移
go run ./migrations/migrate.go

# 或使用 Docker
docker-compose run --rm migrate
```

### 初始化测试数据

```bash
# 运行种子数据
go run ./migrations/seed.go

# 运行示例数据（包含更多测试资产）
go run ./migrations/fixtures.go
```

## 测试

```bash
# 运行后端测试
go test ./...

# 运行前端测试
cd web
npm test
```

## 部署

### 生产环境部署

1. **修改环境变量**
```bash
# 修改 .env 文件
JWT_SECRET=<strong-random-secret>
DB_PASSWORD=<strong-password>
ENV=production
```

2. **构建和启动**
```bash
docker-compose up -d --build
```

3. **验证部署**
```bash
# 检查健康状态
curl http://localhost/health

# 检查 API
curl http://localhost/api/v1/health
```

### 使用 HTTPS

建议在生产环境使用 Nginx 反向代理并配置 SSL 证书。

#### Nginx 配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /api/v1/webssh/ws/ {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### 数据备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres kmdb > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres kmdb < backup.sql
```

## 截图

### 仪表盘
系统概览，展示资产统计、用户数量、最新活动等信息。

### 资产管理
支持按项目分组查看，可搜索、筛选资产。

### WebSSH
Web 终端，支持多标签、收藏、分组等功能。

### API Token
创建和管理程序化访问的 Token。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

## 更新日志

### v1.0.0
- 初始版本
- 资产管理、项目管理
- WebSSH 终端
- RBAC 权限系统
- API Token 管理
- Swagger API 文档
