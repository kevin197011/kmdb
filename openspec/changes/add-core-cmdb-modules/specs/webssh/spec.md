## ADDED Requirements

### Requirement: WebSSH 连接建立
系统 SHALL 支持通过 Web 界面建立到资产的 SSH 连接。

#### Scenario: 成功建立 SSH 连接
- **WHEN** 用户提供有效的资产 ID 和认证信息（用户名、密码或密钥）
- **THEN** 系统建立 SSH 连接到目标资产
- **THEN** 创建 WebSSH 会话并分配会话 ID
- **AND** 返回 WebSocket 连接地址
- **AND** 连接操作记录到审计日志

#### Scenario: 连接到不存在的资产
- **WHEN** 用户尝试连接到不存在的资产 ID
- **THEN** 系统返回 404 错误，提示资产不存在

#### Scenario: SSH 认证失败
- **WHEN** 用户提供无效的认证信息
- **THEN** 系统返回 401 认证失败错误
- **AND** 认证失败操作记录到审计日志

#### Scenario: 资产不可达
- **WHEN** 用户尝试连接到网络不可达的资产
- **THEN** 系统返回连接超时错误
- **AND** 错误信息记录到审计日志

### Requirement: WebSSH 终端交互
系统 SHALL 支持通过 WebSocket 进行终端输入输出交互。

#### Scenario: 终端输入处理
- **WHEN** 用户在 Web 终端中输入命令
- **THEN** 系统通过 WebSocket 将输入发送到 SSH 连接
- **AND** 命令传输到远程终端

#### Scenario: 终端输出显示
- **WHEN** 远程终端产生输出
- **THEN** 系统通过 WebSocket 将输出发送到前端
- **AND** 前端实时显示终端输出

#### Scenario: 终端大小调整
- **WHEN** 用户调整浏览器窗口大小
- **THEN** 系统将新的终端尺寸信息发送到远程终端
- **AND** 远程终端适配新的尺寸

#### Scenario: WebSocket 连接断开
- **WHEN** WebSocket 连接意外断开
- **THEN** 系统尝试重连
- **AND** 如果重连失败，清理 SSH 会话资源

### Requirement: WebSSH 多会话管理
系统 SHALL 支持同时管理多个 WebSSH 会话，每个会话独立运行。

#### Scenario: 创建多个会话
- **WHEN** 用户创建多个 WebSSH 会话（连接到不同资产）
- **THEN** 系统为每个会话分配独立的会话 ID
- **AND** 每个会话独立运行，互不干扰

#### Scenario: 会话标签页切换
- **WHEN** 用户在多个会话标签页之间切换
- **THEN** 系统保持每个会话的状态
- **AND** 切换时正确恢复对应的终端显示

#### Scenario: 关闭会话
- **WHEN** 用户关闭某个会话标签页
- **THEN** 系统关闭对应的 SSH 连接
- **AND** 清理会话资源
- **AND** 关闭操作记录到审计日志

### Requirement: WebSSH 会话超时
系统 SHALL 支持会话超时机制，自动清理长时间无活动的会话。

#### Scenario: 会话空闲超时
- **WHEN** WebSSH 会话在指定时间内无活动（如 30 分钟）
- **THEN** 系统自动关闭 SSH 连接
- **AND** 清理会话资源
- **AND** 超时关闭操作记录到审计日志

#### Scenario: 会话最大时长限制
- **WHEN** WebSSH 会话运行超过最大时长（如 2 小时）
- **THEN** 系统自动关闭 SSH 连接
- **AND** 提示用户会话已超时

### Requirement: WebSSH 操作审计
系统 SHALL 记录所有 WebSSH 操作，包括登录、命令执行、会话结束等。

#### Scenario: 记录登录操作
- **WHEN** 用户通过 WebSSH 登录到资产
- **THEN** 系统记录登录审计日志
- **AND** 包含用户 ID、资产 ID、登录时间、会话 ID

#### Scenario: 记录命令执行
- **WHEN** 用户在 WebSSH 会话中执行命令
- **THEN** 系统记录命令审计日志
- **AND** 包含会话 ID、命令内容、执行时间
- **AND** 敏感命令（如包含密码）需特殊标记

#### Scenario: 记录会话结束
- **WHEN** WebSSH 会话结束（正常退出、超时、错误）
- **THEN** 系统记录会话结束审计日志
- **AND** 包含会话 ID、结束时间、结束原因、会话总时长

### Requirement: WebSSH 安全性
系统 SHALL 确保 WebSSH 连接的安全性。

#### Scenario: 强制 HTTPS
- **WHEN** 用户尝试通过 HTTP 访问 WebSSH 功能
- **THEN** 系统重定向到 HTTPS
- **AND** 或返回错误，要求使用 HTTPS

#### Scenario: WebSocket 安全连接
- **WHEN** 系统建立 WebSocket 连接
- **THEN** WebSocket 连接必须通过 WSS（安全 WebSocket）
- **AND** 使用 TLS 加密传输

#### Scenario: 会话隔离
- **WHEN** 多个用户同时连接到同一资产
- **THEN** 每个用户的会话相互隔离
- **AND** 一个用户的会话不能访问另一个用户的会话

### Requirement: WebSSH 并发支持
系统 SHALL 支持至少 50 个并发 WebSSH 会话。

#### Scenario: 创建多个并发会话
- **WHEN** 系统同时处理 50 个 WebSSH 会话
- **THEN** 所有会话正常运行
- **AND** 系统资源使用在合理范围内
- **AND** 会话之间互不干扰

#### Scenario: 超过并发限制
- **WHEN** 系统已达到最大并发会话数（50）
- **THEN** 新会话请求返回错误或排队等待
- **AND** 提示用户当前会话数已满

### Requirement: WebSSH 主机清单
系统 SHALL 在 WebSSH 界面提供主机清单功能，方便用户快速查看、连接和切换主机。

#### Scenario: 显示主机清单
- **WHEN** 用户打开 WebSSH 页面
- **THEN** 系统显示主机清单侧边栏或面板
- **AND** 清单显示用户有权限访问的资产列表
- **AND** 包含资产的基本信息（名称、类型、项目、状态、IP 地址等）

#### Scenario: 从清单快速连接主机
- **WHEN** 用户在主机清单中点击资产
- **THEN** 系统弹出连接对话框或直接使用默认认证信息连接
- **AND** 如果资产需要认证信息，提示用户输入
- **AND** 连接成功后创建新的会话标签页

#### Scenario: 在清单中显示当前会话状态
- **WHEN** 用户有活跃的 WebSSH 会话
- **THEN** 主机清单中对应资产显示连接状态标识
- **AND** 显示会话数量（如果同一资产有多个会话）

#### Scenario: 从清单切换会话
- **WHEN** 用户在主机清单中点击已连接的资产
- **THEN** 系统切换到该资产对应的会话标签页
- **AND** 如果该资产有多个会话，显示会话选择菜单

#### Scenario: 清单按项目过滤
- **WHEN** 用户在主机清单中选择项目过滤器
- **THEN** 系统仅显示该项目的资产
- **AND** 支持选择多个项目或"全部项目"

#### Scenario: 清单搜索功能
- **WHEN** 用户在主机清单的搜索框中输入关键词
- **THEN** 系统实时过滤资产列表
- **AND** 支持按资产名称、IP 地址、类型等字段搜索

#### Scenario: 清单按类型分组
- **WHEN** 用户在主机清单中选择按类型分组
- **THEN** 系统将资产按类型（服务器、虚拟机、网络设备等）分组显示
- **AND** 支持展开/折叠分组

#### Scenario: 清单显示最近连接的主机
- **WHEN** 用户在主机清单中选择"最近连接"
- **THEN** 系统显示用户最近连接过的资产列表
- **AND** 按连接时间倒序排列
- **AND** 支持快速重新连接

#### Scenario: 清单显示收藏的主机
- **WHEN** 用户将资产添加到收藏
- **THEN** 系统在清单中显示收藏标记
- **AND** 支持按收藏状态过滤
- **AND** 收藏的主机显示在清单顶部或独立分组

#### Scenario: 从清单快速断开连接
- **WHEN** 用户在主机清单中右键点击已连接的资产
- **THEN** 系统显示上下文菜单
- **AND** 用户可以选择断开连接或关闭会话

