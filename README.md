# KMDB - 运维 CMDB 管理平台

现代化的运维 CMDB（Configuration Management Database）管理平台，提供资产管理、关系管理、配置快照、审计日志和 WebSSH 功能。

## 功能特性

- **资产管理**：服务器、网络设备、应用及相关配置的统一登记和管理
- **关系管理**：资产间依赖关系、拓扑关系记录
- **配置快照**：变更记录追踪、版本管理
- **审计日志**：操作审计、变更追踪
- **WebSSH**：通过 Web 界面便捷、安全地登录和操作远程主机
- **用户权限**：完整的 RBAC 权限管理系统

## 技术栈

- **Backend**: Go 1.23 + Gin
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Database**: PostgreSQL 16
- **WebSSH**: xterm.js + WebSocket

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
- 前端: http://localhost
- 后端 API: http://localhost:8080
- 健康检查: http://localhost:8080/health

5. **默认登录账号**
- 用户名: `admin`
- 密码: `Admin123`（符合密码强度要求，可通过 `.env` 文件中的 `ADMIN_PASSWORD` 环境变量修改）
- ⚠️ **重要**: 首次登录后请立即修改密码！

5. **查看日志**
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
│   └── middleware/   # 中间件
├── model/            # 数据模型
├── repository/       # 数据访问层
├── service/          # 业务逻辑层
├── migrations/       # 数据库迁移
├── web/              # 前端应用
└── openspec/         # OpenSpec 规范
```

## API 文档

### 认证

- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新 Token

### 资产管理

- `GET /api/v1/assets` - 获取资产列表
- `POST /api/v1/assets` - 创建资产
- `GET /api/v1/assets/:id` - 获取资产详情
- `PUT /api/v1/assets/:id` - 更新资产
- `DELETE /api/v1/assets/:id` - 删除资产
- `GET /api/v1/assets/stats/project` - 按项目统计资产

### WebSSH

- `POST /api/v1/webssh/connect` - 建立 SSH 连接
- `GET /api/v1/webssh/ws/:session_id` - WebSocket 连接
- `POST /api/v1/webssh/:session_id/resize` - 调整终端大小
- `DELETE /api/v1/webssh/:session_id` - 关闭会话

更多 API 文档请参考代码注释。

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
# 使用 Makefile
make build
make up

# 或直接使用 docker-compose
docker-compose up -d --build
```

3. **查看服务状态**
```bash
make ps
# 或
docker-compose ps
```

4. **验证部署**
```bash
# 检查健康状态
curl http://localhost:8080/health

# 检查前端
curl http://localhost
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

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

## 许可证

[添加许可证信息]

## 贡献

欢迎提交 Issue 和 Pull Request。
