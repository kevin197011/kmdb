# KMDB 测试虚拟机

这是一个用于 KMDB 系统连接测试的 Ubuntu 虚拟机配置。

## 环境要求

- [Vagrant](https://www.vagrantup.com/) >= 2.0
- [VirtualBox](https://www.virtualbox.org/) >= 6.0

## 快速开始

### 1. 启动虚拟机

```bash
cd test
vagrant up
```

### 2. 自动配置 KMDB（推荐）

启动虚拟机后，运行自动配置脚本：

```bash
cd test
python3 setup_kmdb.py
```

或者使用 shell 脚本：

```bash
cd test
./setup_kmdb.sh
```

脚本会自动：
- 登录 KMDB 系统
- 创建或检查测试项目
- 创建测试资产 `test-ubuntu`
- 创建密钥凭证 `testuser密钥`
- 创建密码凭证 `testuser密码`

配置完成后，可以直接在 WebSSH 页面连接测试。

### 3. 连接信息

**IP 地址**: `192.168.56.100`
**SSH 端口**: `22`
**主机端口映射**: `localhost:2222` -> `虚拟机:22`

**测试用户**:
- 用户名: `testuser`
- 密码: `Test123456`

### 4. SSH 连接方式

#### 方式一：通过私有网络 IP（推荐）

**使用密钥登录：**
```bash
ssh -i vagrant_key testuser@192.168.56.100
```

**使用密码登录：**
```bash
ssh testuser@192.168.56.100
# 输入密码: Test123456
```

#### 方式二：通过主机端口映射

**使用密钥登录：**
```bash
ssh -i vagrant_key -p 2222 testuser@localhost
```

**使用密码登录：**
```bash
ssh -p 2222 testuser@localhost
# 输入密码: Test123456
```

### 5. 手动在 KMDB 中配置（如果未使用自动配置脚本）

1. 登录 KMDB 系统
2. 进入"资产管理"页面
3. 创建新资产：
   - **名称**: `test-ubuntu`
   - **类型**: `server`
   - **状态**: `active`
   - **SSH 端口**: `22`
   - **元数据** (JSON):
     ```json
     {
       "ip": "192.168.56.100",
       "os": "Ubuntu 22.04",
       "location": "测试环境"
     }
     ```

4. 进入"主机密钥管理"页面
5. 创建凭证：
   - **凭证名称**: `testuser密钥`
   - **用户名**: `testuser`
   - **认证类型**: `密钥认证`
   - **私钥**: 使用 `vagrant_key` 文件的内容
   - **公钥**: 使用 `vagrant_key.pub` 文件的内容（可选）

   或者创建密码凭证：
   - **凭证名称**: `testuser密码`
   - **用户名**: `testuser`
   - **认证类型**: `密码认证`
   - **密码**: `Test123456`

6. 进入"WebSSH"页面
7. 选择资产 `test-ubuntu`，选择对应的凭证进行连接

## 自动配置脚本

### Python 脚本（推荐）

```bash
cd test
python3 setup_kmdb.py
```

### Shell 脚本

```bash
cd test
./setup_kmdb.sh
```

**注意**：需要安装 `requests` 库（Python）：
```bash
pip3 install requests
```

## 常用命令

### 启动虚拟机
```bash
vagrant up
```

### 停止虚拟机
```bash
vagrant halt
```

### 重启虚拟机
```bash
vagrant reload
```

### 销毁虚拟机
```bash
vagrant destroy
```

### 查看虚拟机状态
```bash
vagrant status
```

### SSH 连接到虚拟机
```bash
vagrant ssh
```

### 查看虚拟机 IP
```bash
vagrant ssh -c "hostname -I"
```

## 虚拟机配置

- **操作系统**: Ubuntu 22.04 LTS (Jammy)
- **CPU**: 1 核
- **内存**: 1 GB
- **网络**: 私有网络 `192.168.56.100`
- **SSH**: 端口 22，支持密码和密钥登录
- **端口映射**: `localhost:2222` -> `虚拟机:22`

## 注意事项

1. 确保 VirtualBox 已安装并运行
2. 如果 IP `192.168.56.100` 已被占用，可以修改 `Vagrantfile` 中的 IP 地址
3. 首次启动可能需要下载 Ubuntu 镜像，请耐心等待
4. 虚拟机启动后，可以通过 `vagrant ssh` 直接连接（使用 vagrant 用户）

## 故障排除

### 虚拟机无法启动
- 检查 VirtualBox 是否正常运行
- 检查系统资源是否充足
- 查看 VirtualBox 日志

### 无法 SSH 连接
- 检查虚拟机是否已启动：`vagrant status`
- 检查 IP 地址是否正确：`vagrant ssh -c "ip addr"`
- 检查防火墙设置

### 网络连接问题
- 确保主机可以访问 `192.168.56.0/24` 网段
- 如果使用 VPN，可能需要调整网络配置

