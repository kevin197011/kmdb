.PHONY: help build up down logs clean migrate test

help: ## 显示帮助信息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## 构建所有 Docker 镜像
	docker-compose build

up: ## 启动所有服务
	docker-compose up -d

down: ## 停止所有服务
	docker-compose down

logs: ## 查看服务日志
	docker-compose logs -f

logs-backend: ## 查看后端日志
	docker-compose logs -f backend

logs-frontend: ## 查看前端日志
	docker-compose logs -f frontend

clean: ## 清理 Docker 资源（包括 volumes）
	docker-compose down -v
	docker system prune -f

migrate: ## 运行数据库迁移
	docker-compose run --rm migrate

seed: ## 运行数据库种子（创建默认用户）
	docker-compose run --rm seed

fixtures: ## 添加测试数据
	docker-compose --profile fixtures run --rm fixtures

dev-db: ## 启动开发数据库
	docker-compose -f docker-compose.dev.yml up -d postgres

dev-db-down: ## 停止开发数据库
	docker-compose -f docker-compose.dev.yml down

test: ## 运行测试
	go test ./...

restart: ## 重启服务
	docker-compose restart

ps: ## 查看服务状态
	docker-compose ps

