package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// serveSwaggerUI 提供 Swagger UI 页面
func serveSwaggerUI(c *gin.Context) {
	html := `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KMDB API 文档</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-size: 2em; }
        .swagger-ui .info .description { font-size: 1.1em; line-height: 1.6; }
        .swagger-ui .info .description h2 { margin-top: 1.5em; }
        .swagger-ui .info .description code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
        }
        /* 自定义主题色 */
        .swagger-ui .btn.execute { background: #4F46E5; }
        .swagger-ui .btn.execute:hover { background: #4338CA; }
        .swagger-ui .opblock.opblock-post { border-color: #10B981; background: rgba(16, 185, 129, 0.1); }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #10B981; }
        .swagger-ui .opblock.opblock-get { border-color: #3B82F6; background: rgba(59, 130, 246, 0.1); }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #3B82F6; }
        .swagger-ui .opblock.opblock-put { border-color: #F59E0B; background: rgba(245, 158, 11, 0.1); }
        .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #F59E0B; }
        .swagger-ui .opblock.opblock-delete { border-color: #EF4444; background: rgba(239, 68, 68, 0.1); }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #EF4444; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: "/api/docs/swagger.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                defaultModelsExpandDepth: 3,
                defaultModelExpandDepth: 3,
                docExpansion: "list",
                syntaxHighlight: {
                    theme: "monokai"
                }
            });
        };
    </script>
</body>
</html>`
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

// serveSwaggerJSON 提供 Swagger JSON 规范文件
func serveSwaggerJSON(c *gin.Context) {
	c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(swaggerJSON))
}

// swaggerJSON Swagger JSON 文档
const swaggerJSON = `{
  "swagger": "2.0",
  "info": {
    "title": "KMDB API",
    "description": "KMDB DevOps 资产管理平台 API 文档\n\n## 认证方式\n\n### 1. JWT Token（用于 Web 界面）\n- 通过 /api/v1/auth/login 登录获取 token\n- 在请求头中添加: Authorization: Bearer {token}\n\n### 2. API Token（用于程序化访问）\n- 在 Token 管理页面创建 API Token\n- 在请求头中添加: X-API-Key: kmdb_xxxxxxxx\n- 或使用查询参数: ?api_key=kmdb_xxxxxxxx",
    "version": "1.0",
    "contact": {
      "name": "KMDB Support",
      "email": "support@kmdb.io"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
    }
  },
  "host": "localhost",
  "basePath": "/api/v1",
  "schemes": ["http", "https"],
  "securityDefinitions": {
    "BearerAuth": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header",
      "description": "JWT Bearer Token，格式: Bearer {token}"
    },
    "APIKeyAuth": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header",
      "description": "API Token，格式: kmdb_xxxxxxxx"
    }
  },
  "tags": [
    {"name": "Auth", "description": "认证相关接口"},
    {"name": "Dashboard", "description": "仪表盘数据"},
    {"name": "Users", "description": "用户管理"},
    {"name": "User Groups", "description": "用户组管理"},
    {"name": "Projects", "description": "项目管理"},
    {"name": "Assets", "description": "资产管理"},
    {"name": "Asset Credentials", "description": "主机凭证管理"},
    {"name": "Roles", "description": "角色管理"},
    {"name": "Permissions", "description": "权限管理"},
    {"name": "API Tokens", "description": "API Token 管理"},
    {"name": "Audit", "description": "审计日志"},
    {"name": "WebSSH", "description": "Web SSH 终端"}
  ],
  "paths": {
    "/auth/login": {
      "post": {
        "tags": ["Auth"],
        "summary": "用户登录",
        "description": "使用用户名和密码登录，获取 JWT Token",
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["username", "password"],
              "properties": {
                "username": {"type": "string", "example": "admin"},
                "password": {"type": "string", "example": "Admin123"}
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "登录成功",
            "schema": {
              "type": "object",
              "properties": {
                "access_token": {"type": "string"},
                "refresh_token": {"type": "string"},
                "expires_in": {"type": "integer"}
              }
            }
          },
          "401": {"description": "用户名或密码错误"}
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "tags": ["Auth"],
        "summary": "刷新 Token",
        "description": "使用 refresh_token 获取新的 access_token",
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["refresh_token"],
              "properties": {
                "refresh_token": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "200": {"description": "刷新成功"},
          "401": {"description": "无效的 refresh_token"}
        }
      }
    },
    "/dashboard/stats": {
      "get": {
        "tags": ["Dashboard"],
        "summary": "获取仪表盘统计数据",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "responses": {
          "200": {"description": "成功"}
        }
      }
    },
    "/users": {
      "get": {
        "tags": ["Users"],
        "summary": "获取用户列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Users"],
        "summary": "创建用户",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["username", "email", "password"],
              "properties": {
                "username": {"type": "string"},
                "email": {"type": "string"},
                "password": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"},
          "400": {"description": "参数错误"}
        }
      }
    },
    "/users/{id}": {
      "get": {
        "tags": ["Users"],
        "summary": "获取用户详情",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "成功"},
          "404": {"description": "用户不存在"}
        }
      },
      "put": {
        "tags": ["Users"],
        "summary": "更新用户",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"},
          {"in": "body", "name": "body", "required": true, "schema": {"type": "object"}}
        ],
        "responses": {
          "200": {"description": "更新成功"},
          "404": {"description": "用户不存在"}
        }
      },
      "delete": {
        "tags": ["Users"],
        "summary": "删除用户",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "删除成功"},
          "404": {"description": "用户不存在"}
        }
      }
    },
    "/projects": {
      "get": {
        "tags": ["Projects"],
        "summary": "获取项目列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Projects"],
        "summary": "创建项目",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"}
        }
      }
    },
    "/projects/{id}": {
      "get": {
        "tags": ["Projects"],
        "summary": "获取项目详情",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "put": {
        "tags": ["Projects"],
        "summary": "更新项目",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"},
          {"in": "body", "name": "body", "required": true, "schema": {"type": "object"}}
        ],
        "responses": {
          "200": {"description": "更新成功"}
        }
      },
      "delete": {
        "tags": ["Projects"],
        "summary": "删除项目",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "删除成功"}
        }
      }
    },
    "/assets": {
      "get": {
        "tags": ["Assets"],
        "summary": "获取资产列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20},
          {"name": "type", "in": "query", "type": "string", "description": "资产类型: server, vm, network_device, application"},
          {"name": "status", "in": "query", "type": "string", "description": "状态: active, inactive, maintenance"},
          {"name": "project_id", "in": "query", "type": "string", "description": "项目 ID"}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Assets"],
        "summary": "创建资产",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["type", "name", "status"],
              "properties": {
                "type": {"type": "string", "enum": ["server", "vm", "network_device", "application"]},
                "name": {"type": "string"},
                "status": {"type": "string", "enum": ["active", "inactive", "maintenance"]},
                "project_id": {"type": "string"},
                "ip": {"type": "string"},
                "ssh_port": {"type": "integer", "default": 22},
                "os": {"type": "string"},
                "cpu": {"type": "string"},
                "memory": {"type": "string"},
                "disk": {"type": "string"},
                "location": {"type": "string"},
                "department": {"type": "string"},
                "cloud_platform": {"type": "string"},
                "remark": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"}
        }
      }
    },
    "/assets/{id}": {
      "get": {
        "tags": ["Assets"],
        "summary": "获取资产详情",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "put": {
        "tags": ["Assets"],
        "summary": "更新资产",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"},
          {"in": "body", "name": "body", "required": true, "schema": {"type": "object"}}
        ],
        "responses": {
          "200": {"description": "更新成功"}
        }
      },
      "delete": {
        "tags": ["Assets"],
        "summary": "删除资产",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "删除成功"}
        }
      }
    },
    "/asset-credentials": {
      "get": {
        "tags": ["Asset Credentials"],
        "summary": "获取所有凭证列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Asset Credentials"],
        "summary": "创建凭证",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name", "username", "auth_type"],
              "properties": {
                "name": {"type": "string"},
                "username": {"type": "string"},
                "auth_type": {"type": "string", "enum": ["password", "key"]},
                "password": {"type": "string"},
                "private_key": {"type": "string"},
                "public_key": {"type": "string"},
                "passphrase": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"}
        }
      }
    },
    "/api-tokens": {
      "get": {
        "tags": ["API Tokens"],
        "summary": "获取 Token 列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["API Tokens"],
        "summary": "创建 API Token",
        "description": "创建新的 API Token 用于程序化访问 API。创建成功后会返回完整的 Token 值，此后将无法再次查看。",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": {"type": "string", "description": "Token 名称（描述用途）", "example": "CI/CD Token"},
                "scopes": {
                  "type": "array",
                  "description": "权限范围（为空则允许所有操作）",
                  "items": {
                    "type": "object",
                    "properties": {
                      "resource": {"type": "string", "example": "assets"},
                      "actions": {"type": "array", "items": {"type": "string"}, "example": ["read", "write"]}
                    }
                  }
                },
                "expires_in": {"type": "integer", "description": "过期天数（null 或 0 表示永不过期）", "example": 30}
              }
            }
          }
        ],
        "responses": {
          "201": {
            "description": "创建成功",
            "schema": {
              "type": "object",
              "properties": {
                "token": {"type": "object"},
                "raw_token": {"type": "string", "description": "完整 Token 值（仅此一次显示）"},
                "message": {"type": "string"}
              }
            }
          }
        }
      }
    },
    "/api-tokens/my": {
      "get": {
        "tags": ["API Tokens"],
        "summary": "获取当前用户的 Token",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "responses": {
          "200": {"description": "成功"}
        }
      }
    },
    "/api-tokens/{id}": {
      "get": {
        "tags": ["API Tokens"],
        "summary": "获取 Token 详情",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "delete": {
        "tags": ["API Tokens"],
        "summary": "删除 Token",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "删除成功"}
        }
      }
    },
    "/api-tokens/{id}/revoke": {
      "post": {
        "tags": ["API Tokens"],
        "summary": "撤销 Token",
        "description": "撤销 Token 后将无法使用，但记录保留",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "type": "string"}
        ],
        "responses": {
          "200": {"description": "撤销成功"}
        }
      }
    },
    "/roles": {
      "get": {
        "tags": ["Roles"],
        "summary": "获取角色列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Roles"],
        "summary": "创建角色",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"}
        }
      }
    },
    "/permissions": {
      "get": {
        "tags": ["Permissions"],
        "summary": "获取权限列表",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "responses": {
          "200": {"description": "成功"}
        }
      },
      "post": {
        "tags": ["Permissions"],
        "summary": "创建权限",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name", "resource", "action"],
              "properties": {
                "name": {"type": "string"},
                "resource": {"type": "string"},
                "action": {"type": "string"}
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "创建成功"}
        }
      }
    },
    "/audit-logs": {
      "get": {
        "tags": ["Audit"],
        "summary": "获取审计日志",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "produces": ["application/json"],
        "parameters": [
          {"name": "page", "in": "query", "type": "integer", "default": 1},
          {"name": "limit", "in": "query", "type": "integer", "default": 20},
          {"name": "user_id", "in": "query", "type": "string"},
          {"name": "action", "in": "query", "type": "string"},
          {"name": "resource_type", "in": "query", "type": "string"}
        ],
        "responses": {
          "200": {"description": "成功"}
        }
      }
    },
    "/webssh/connect": {
      "post": {
        "tags": ["WebSSH"],
        "summary": "创建 SSH 连接",
        "security": [{"BearerAuth": []}, {"APIKeyAuth": []}],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["asset_id"],
              "properties": {
                "asset_id": {"type": "string"},
                "username": {"type": "string"},
                "password": {"type": "string"},
                "credential_id": {"type": "string"},
                "cols": {"type": "integer", "default": 80},
                "rows": {"type": "integer", "default": 24}
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "连接成功",
            "schema": {
              "type": "object",
              "properties": {
                "session_id": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}`

