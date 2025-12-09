
# OpenSpec 项目需求文档 — 运维 CMDB 平台

## **Project Context**

### Purpose

本项目旨在开发一个现代化运维 CMDB（Configuration Management Database）管理平台，提供以下核心能力：

* **资产管理**：服务器、网络设备、应用及相关配置的统一登记和管理
* **关系管理**：资产间依赖关系、拓扑关系记录
* **配置快照 & 审计**：变更记录追踪、操作审计
* **Web SSH 管理**：通过独立 WebSSH 页面便捷、安全地登录和操作远程主机
* **模块化扩展**：支持未来扩展功能，如 CI/CD 配置管理、监控管理、告警系统等

项目目标是构建一个**高可维护、高可扩展、易用的运维管理平台**，同时保证安全性和操作审计能力。

---

## **Tech Stack**

* **Backend**: Golang（Gin / Echo / Fiber 可选）
* **Frontend**: shadcn/ui + React + TailwindCSS
* **Database**: PostgreSQL（主存储），可选 Redis 缓存
* **WebSSH**: 内置模块化 WebSSH 页面（支持多会话管理、审计日志记录）
* **DevOps/Infra**: Docker、Kubernetes（可选）、GitHub Actions / GitLab CI
* **Messaging / Audit**: Kafka 或 NATS（事件与审计日志流）

---

## **Project Conventions**

### Communication Language

* **语言要求**：项目中的所有问答、讨论、文档编写和 AI 交互均采用**中文**进行
* **代码注释**：代码注释优先使用中文，技术术语可保留英文
* **文档**：所有项目文档、规范说明、OpenSpec 提案均使用中文编写

### Code Style

* **Backend (Go)**: 使用 `golangci-lint` 校验；遵循官方 Go 风格（`gofmt` + `golint`）
* **Frontend (React + shadcn/ui)**: 使用 Prettier 格式化，组件命名采用 PascalCase，页面文件夹结构保持模块化
* **Naming**:

  * API 路径使用 `kebab-case`（例：`/assets/create`）
  * 数据库表使用 `snake_case`，字段名一致
* **Commit Message**: `feat|fix|chore|docs(scope): message`

---

### Architecture Patterns

* **模块化架构**：

  * 核心模块：Assets、Relations、Configs、Audit、WebSSH
  * 扩展模块：CI/CD 管理、监控管理、告警管理
* **后端**：Clean Architecture / Hexagonal Architecture，分层：

  * `api/` → HTTP handlers
  * `service/` → 业务逻辑
  * `repository/` → 数据库操作
  * `model/` → 数据结构定义
* **前端**：组件化 + 页面模块化，每个模块包含：

  * `components/`
  * `pages/`
  * `services/` → API 调用封装
* **审计机制**：

  * 所有操作记录事件流
  * 数据库事务级别审计 + 前端操作记录

---

### Testing Strategy

* **Backend**：

  * 单元测试（`testing` + `testify`）
  * 集成测试（Postgres + WebSSH mock + Audit event mock）
  * OpenSpec proposal-driven 测试
* **Frontend**：

  * 单元测试：Jest + React Testing Library
  * 端到端测试：Cypress / Playwright
* **WebSSH**：

  * 模拟终端输入输出，测试多会话并发
* **CI/CD**：

  * 每个 PR 自动运行 OpenSpec proposal 验证
  * 部署前执行集成测试与审计验证

---

### Git Workflow

* **Branching**：

  * `main` → 生产分支
  * `develop` → 开发分支
  * feature 分支 → `feature/<模块名>`
* **Pull Request**：

  * 所有 PR 必须通过 OpenSpec 验证 + 单元测试
  * PR 描述中必须注明涉及的模块和 proposal
* **Versioning**：

  * Semantic Versioning（`vX.Y.Z`）

---

## **Domain Context**

* **资产类型**：服务器、虚拟机、网络设备、应用
* **关系类型**：`depends_on`、`hosted_on`、`connected_to`
* **配置管理**：每台资产的配置可保存快照，支持历史回溯
* **审计需求**：

  * WebSSH 操作需记录登录用户、时间、命令
  * 资产管理操作需记录变更前后状态
* **WebSSH 页面**：

  * 独立路由 `/webssh`
  * 支持多会话标签页
  * 自动记录操作日志到 Audit 模块
* **模块化扩展**：

  * 后续可加入 CI/CD、监控、告警、日志管理模块
  * 每个模块独立、可 Plug-in

---

## **Important Constraints**

* **安全性**：

  * WebSSH 必须通过 HTTPS
  * 用户权限控制（RBAC）
* **可扩展性**：

  * 模块化架构，后续添加功能无需改动核心
* **审计合规**：

  * 任何操作都必须可追溯
* **性能**：

  * 单节点支持至少 1000 台资产并发操作
  * WebSSH 支持至少 50 个并发会话

---

## **External Dependencies**

* **PostgreSQL** → 主数据库
* **Redis** → 可选缓存
* **Kafka/NATS** → 审计事件/消息流
* **WebSSH** → 内置模块（可使用 `xterm.js` 或 Go WebSSH 库）
* **CI/CD** → GitHub Actions / GitLab CI
* **监控** → Prometheus/Grafana（扩展模块使用）

---

我可以帮你进一步做**下一步**：

1. **生成 OpenSpec Proposal 核心模块模板**（Assets、Relations、Configs、Audit、WebSSH）
2. **生成模块化 Golang + shadcn/ui 前端项目结构示例**，带基础 API + WebSSH 页面 + audit hooks

你希望我帮你生成哪个？
