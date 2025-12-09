#!/bin/bash

# KMDB 自动配置脚本
# 用于在 KMDB 中创建测试资产和凭证

set -e

API_URL="http://localhost/api/v1"
ADMIN_USER="admin"
ADMIN_PASS="Admin123"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}KMDB 测试环境自动配置${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 登录获取 token
echo -e "\n${YELLOW}[1/5] 正在登录...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

if echo "$LOGIN_RESPONSE" | grep -q "error"; then
  echo -e "${RED}登录失败: $LOGIN_RESPONSE${NC}"
  exit 1
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo -e "${RED}无法获取访问令牌${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 登录成功${NC}"

# 2. 检查或创建项目
echo -e "\n${YELLOW}[2/5] 检查测试项目...${NC}"
PROJECT_NAME="测试项目"
PROJECTS_RESPONSE=$(curl -s -X GET "$API_URL/projects" \
  -H "Authorization: Bearer $TOKEN")

PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${YELLOW}项目不存在，正在创建...${NC}"
  PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/projects" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PROJECT_NAME\",\"description\":\"用于测试的项目\"}")

  if echo "$PROJECT_RESPONSE" | grep -q "error"; then
    echo -e "${RED}创建项目失败: $PROJECT_RESPONSE${NC}"
    exit 1
  fi

  PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 项目创建成功 (ID: $PROJECT_ID)${NC}"
else
  echo -e "${GREEN}✓ 项目已存在 (ID: $PROJECT_ID)${NC}"
fi

# 3. 检查或创建资产
echo -e "\n${YELLOW}[3/5] 检查测试资产...${NC}"
ASSET_NAME="test-ubuntu"
ASSETS_RESPONSE=$(curl -s -X GET "$API_URL/assets?limit=100" \
  -H "Authorization: Bearer $TOKEN")

ASSET_ID=$(echo "$ASSETS_RESPONSE" | grep -o "\"name\":\"$ASSET_NAME\"" -A 20 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ASSET_ID" ]; then
  echo -e "${YELLOW}资产不存在，正在创建...${NC}"
  METADATA='{"ip":"192.168.56.100","os":"Ubuntu 22.04 LTS","location":"测试环境","cpu":"1核","memory":"1GB"}'
  ASSET_RESPONSE=$(curl -s -X POST "$API_URL/assets" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$ASSET_NAME\",\"type\":\"server\",\"status\":\"active\",\"project_id\":\"$PROJECT_ID\",\"ssh_port\":22,\"metadata\":\"$METADATA\"}")

  if echo "$ASSET_RESPONSE" | grep -q "error"; then
    echo -e "${RED}创建资产失败: $ASSET_RESPONSE${NC}"
    exit 1
  fi

  ASSET_ID=$(echo "$ASSET_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 资产创建成功 (ID: $ASSET_ID)${NC}"
else
  echo -e "${GREEN}✓ 资产已存在 (ID: $ASSET_ID)${NC}"
fi

# 4. 读取私钥
PRIVATE_KEY=$(cat "$(dirname "$0")/vagrant_key")
PUBLIC_KEY=$(cat "$(dirname "$0")/vagrant_key.pub")

# 5. 创建密钥凭证
echo -e "\n${YELLOW}[4/5] 检查密钥凭证...${NC}"
CREDENTIALS_RESPONSE=$(curl -s -X GET "$API_URL/asset-credentials" \
  -H "Authorization: Bearer $TOKEN")

KEY_CRED_ID=$(echo "$CREDENTIALS_RESPONSE" | grep -o '"name":"testuser密钥"' -A 10 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$KEY_CRED_ID" ]; then
  echo -e "${YELLOW}密钥凭证不存在，正在创建...${NC}"
  # 转义 JSON 字符串
  PRIVATE_KEY_ESC=$(echo "$PRIVATE_KEY" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' '\\n')
  PUBLIC_KEY_ESC=$(echo "$PUBLIC_KEY" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' '\\n')

  KEY_CRED_RESPONSE=$(curl -s -X POST "$API_URL/asset-credentials" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"testuser密钥\",\"username\":\"testuser\",\"auth_type\":\"key\",\"private_key\":\"$PRIVATE_KEY_ESC\",\"public_key\":\"$PUBLIC_KEY_ESC\",\"description\":\"测试虚拟机SSH密钥\"}")

  if echo "$KEY_CRED_RESPONSE" | grep -q "error"; then
    echo -e "${RED}创建密钥凭证失败: $KEY_CRED_RESPONSE${NC}"
    exit 1
  fi

  KEY_CRED_ID=$(echo "$KEY_CRED_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 密钥凭证创建成功 (ID: $KEY_CRED_ID)${NC}"
else
  echo -e "${GREEN}✓ 密钥凭证已存在 (ID: $KEY_CRED_ID)${NC}"
fi

# 6. 创建密码凭证
echo -e "\n${YELLOW}[5/5] 检查密码凭证...${NC}"
PASS_CRED_ID=$(echo "$CREDENTIALS_RESPONSE" | grep -o '"name":"testuser密码"' -A 10 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PASS_CRED_ID" ]; then
  echo -e "${YELLOW}密码凭证不存在，正在创建...${NC}"
  PASS_CRED_RESPONSE=$(curl -s -X POST "$API_URL/asset-credentials" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"testuser密码\",\"username\":\"testuser\",\"auth_type\":\"password\",\"password\":\"Test123456\",\"description\":\"测试虚拟机密码\"}")

  if echo "$PASS_CRED_RESPONSE" | grep -q "error"; then
    echo -e "${RED}创建密码凭证失败: $PASS_CRED_RESPONSE${NC}"
    exit 1
  fi

  PASS_CRED_ID=$(echo "$PASS_CRED_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ 密码凭证创建成功 (ID: $PASS_CRED_ID)${NC}"
else
  echo -e "${GREEN}✓ 密码凭证已存在 (ID: $PASS_CRED_ID)${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}配置信息：${NC}"
echo -e "  资产名称: ${GREEN}$ASSET_NAME${NC}"
echo -e "  资产ID: ${GREEN}$ASSET_ID${NC}"
echo -e "  IP地址: ${GREEN}192.168.56.100${NC}"
echo -e "  SSH端口: ${GREEN}22${NC}"
echo -e "\n${YELLOW}凭证信息：${NC}"
echo -e "  密钥凭证: ${GREEN}testuser密钥${NC} (ID: $KEY_CRED_ID)"
echo -e "  密码凭证: ${GREEN}testuser密码${NC} (ID: $PASS_CRED_ID)"
echo -e "\n${YELLOW}现在可以在 WebSSH 页面连接测试了！${NC}"
echo -e "${GREEN}========================================${NC}"

