# 使用说明

## 快速启动

```bash
cd test
vagrant up
```

## 连接信息

- **IP**: `192.168.56.100`
- **端口**: `22`
- **用户**: `testuser`
- **密码**: `Test123456`

## 在 KMDB 中配置

### 1. 创建资产

在"资产管理"页面创建新资产：

```json
{
  "name": "test-ubuntu",
  "type": "server",
  "status": "active",
  "ssh_port": 22,
  "metadata": {
    "ip": "192.168.56.100",
    "os": "Ubuntu 22.04 LTS"
  }
}
```

### 2. 创建凭证

#### 密钥凭证

1. 进入"主机密钥管理"
2. 点击"新建凭证"
3. 填写：
   - 名称: `testuser密钥`
   - 用户名: `testuser`
   - 认证类型: `密钥认证`
   - 私钥: 复制 `vagrant_key` 文件内容
   - 公钥: 复制 `vagrant_key.pub` 文件内容（可选）

#### 密码凭证

1. 进入"主机密钥管理"
2. 点击"新建凭证"
3. 填写：
   - 名称: `testuser密码`
   - 用户名: `testuser`
   - 认证类型: `密码认证`
   - 密码: `Test123456`

### 3. 测试连接

在"WebSSH"页面选择资产和凭证进行连接测试。

