#!/bin/bash

# KMDB 启动脚本

set -e

echo "🚀 启动 KMDB 平台..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，修改数据库密码和 JWT Secret"
    read -p "按 Enter 继续..."
fi

# 启动服务
echo "🐳 启动 Docker Compose 服务..."
docker-compose up -d

# 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "✅ KMDB 平台已启动！"
echo ""
echo "访问地址:"
echo "  - 前端: http://localhost"
echo "  - 后端 API: http://localhost:8080"
echo "  - 健康检查: http://localhost:8080/health"
echo ""
echo "查看日志:"
echo "  - docker-compose logs -f backend"
echo "  - docker-compose logs -f frontend"
echo ""
echo "停止服务:"
echo "  - docker-compose down"

