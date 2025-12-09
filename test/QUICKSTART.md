# 快速开始指南

## 1. 启动测试虚拟机

```bash
cd test
vagrant up
```

首次启动会自动下载 Ubuntu 镜像，可能需要几分钟时间。

## 2. 获取连接信息

虚拟机启动后，会显示以下信息：

- **IP 地址**: `192.168.56.100`
- **SSH 端口**: `22`
- **测试用户**: `testuser`
- **密码**: `Test123456`

## 3. 测试 SSH 连接

### 使用密钥登录（推荐）

```bash
cd test
ssh -i vagrant_key testuser@192.168.56.100
```

### 使用密码登录

```bash
ssh testuser@192.168.56.100
# 输入密码: Test123456
```

## 4. 在 KMDB 中配置资产

### 步骤 1: 创建资产

1. 登录 KMDB 系统
2. 进入"资产管理"页面
3. 点击"新建资产"
4. 填写信息：
   - **名称**: `test-ubuntu`
   - **类型**: `server`
   - **状态**: `active`
   - **SSH 端口**: `22`
   - **项目**: 选择或创建测试项目
   - **元数据** (JSON 格式):
     ```json
     {
       "ip": "192.168.56.100",
       "os": "Ubuntu 22.04 LTS",
       "location": "测试环境",
       "cpu": "1核",
       "memory": "1GB"
     }
     ```

### 步骤 2: 创建凭证

#### 方式一：密钥认证（推荐）

1. 进入"主机密钥管理"页面
2. 点击"新建凭证"
3. 填写信息：
   - **凭证名称**: `testuser密钥`
   - **用户名**: `testuser`
   - **认证类型**: `密钥认证`
   - **私钥**: 复制 `test/vagrant_key` 文件的完整内容
   - **公钥**: 复制 `test/vagrant_key.pub` 文件的内容（可选）
   - **描述**: `测试虚拟机密钥`

#### 方式二：密码认证

1. 进入"主机密钥管理"页面
2. 点击"新建凭证"
3. 填写信息：
   - **凭证名称**: `testuser密码`
   - **用户名**: `testuser`
   - **认证类型**: `密码认证`
   - **密码**: `Test123456`
   - **描述**: `测试虚拟机密码`

### 步骤 3: 连接测试

1. 进入"WebSSH"页面
2. 在主机列表中找到 `test-ubuntu`
3. 点击连接
4. 选择对应的凭证（密钥或密码）
5. 点击"连接"按钮

## 5. 常用操作

### 查看私钥内容（用于创建凭证）

```bash
cat test/vagrant_key
```

### 查看公钥内容

```bash
cat test/vagrant_key.pub
```

### 停止虚拟机

```bash
vagrant halt
```

### 重启虚拟机

```bash
vagrant reload
```

### 销毁虚拟机（删除）

```bash
vagrant destroy
```

## 故障排除

### 虚拟机无法启动

1. 检查 VirtualBox 是否安装并运行
2. 检查系统资源（内存、磁盘空间）
3. 查看错误信息：`vagrant up --debug`

### 无法 SSH 连接

1. 检查虚拟机状态：`vagrant status`
2. 检查 IP 地址：`vagrant ssh -c "ip addr show"`
3. 尝试使用 vagrant 用户连接：`vagrant ssh`

### IP 地址冲突

如果 `192.168.56.100` 已被占用，可以修改 `Vagrantfile` 中的 IP：

```ruby
config.vm.network "private_network", ip: "192.168.56.101"
```

然后重新启动：`vagrant reload`

