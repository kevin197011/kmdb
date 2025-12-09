import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface APIToken {
  id: string
  name: string
  token_prefix: string
  user_id: string
  scopes: string
  expires_at: string | null
  last_used_at: string | null
  status: string
  created_at: string
  user?: {
    id: string
    username: string
  }
}

interface TokenScope {
  resource: string
  actions: string[]
}

const AVAILABLE_RESOURCES = [
  { value: '*', label: '所有资源' },
  { value: 'assets', label: '资产' },
  { value: 'projects', label: '项目' },
  { value: 'users', label: '用户' },
  { value: 'roles', label: '角色' },
  { value: 'credentials', label: '凭证' },
  { value: 'audit', label: '审计日志' },
]

const AVAILABLE_ACTIONS = [
  { value: '*', label: '所有操作' },
  { value: 'read', label: '读取' },
  { value: 'write', label: '写入' },
  { value: 'delete', label: '删除' },
]

export default function APITokensPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    expires_in: 30, // 默认30天
    no_expiry: false,
    scopes: [] as TokenScope[],
  })

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api-tokens')
      setTokens(response.data.data || [])
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载 Token 列表',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: '错误',
        description: '请输入 Token 名称',
        variant: 'error',
      })
      return
    }

    try {
      const payload: {
        name: string
        scopes?: TokenScope[]
        expires_in?: number
      } = {
        name: formData.name,
      }

      if (formData.scopes.length > 0) {
        payload.scopes = formData.scopes
      }

      if (!formData.no_expiry && formData.expires_in > 0) {
        payload.expires_in = formData.expires_in
      }

      const response = await api.post('/api-tokens', payload)
      setCreatedToken(response.data.raw_token)
      fetchTokens()
      toast({
        title: '创建成功',
        description: '请立即复制并保存 Token，此后将无法再次查看',
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({
        title: '创建失败',
        description: err.response?.data?.error || '创建 Token 失败',
        variant: 'error',
      })
    }
  }

  const handleRevoke = async (token: APIToken) => {
    const confirmed = await confirm(
      '确认撤销',
      `确定要撤销 Token "${token.name}" 吗？撤销后该 Token 将无法使用。`
    )

    if (!confirmed) return

    try {
      await api.post(`/api-tokens/${token.id}/revoke`)
      fetchTokens()
      toast({
        title: '撤销成功',
        description: 'Token 已被撤销',
      })
    } catch {
      toast({
        title: '撤销失败',
        description: '无法撤销 Token',
        variant: 'error',
      })
    }
  }

  const handleDelete = async (token: APIToken) => {
    const confirmed = await confirm(
      '确认删除',
      `确定要永久删除 Token "${token.name}" 吗？此操作不可恢复。`
    )

    if (!confirmed) return

    try {
      await api.delete(`/api-tokens/${token.id}`)
      fetchTokens()
      toast({
        title: '删除成功',
        description: 'Token 已被删除',
      })
    } catch {
      toast({
        title: '删除失败',
        description: '无法删除 Token',
        variant: 'error',
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: '复制成功',
      description: 'Token 已复制到剪贴板',
    })
  }

  const addScope = () => {
    setFormData((prev) => ({
      ...prev,
      scopes: [...prev.scopes, { resource: '*', actions: ['*'] }],
    }))
  }

  const removeScope = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.filter((_, i) => i !== index),
    }))
  }

  const updateScope = (index: number, field: keyof TokenScope, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.map((scope, i) =>
        i === index ? { ...scope, [field]: value } : scope
      ),
    }))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const getStatusBadge = (status: string, expiresAt: string | null) => {
    if (status === 'revoked') {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">已撤销</span>
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">已过期</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">活跃</span>
  }

  const resetForm = () => {
    setFormData({
      name: '',
      expires_in: 30,
      no_expiry: false,
      scopes: [],
    })
    setCreatedToken(null)
    setShowCreateDialog(false)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">API Token 管理</h1>
          <p className="text-gray-500 mt-1">创建和管理用于程序化访问 API 的 Token</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/docs/"
            target="_blank"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            title="查看 API 文档"
          >
            📖 API 文档
          </a>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            title="创建新的 API Token"
          >
            + 创建 Token
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">使用方法</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>1. 在请求头中添加：<code className="bg-blue-100 px-1 rounded">X-API-Key: kmdb_xxxxxxxx</code></p>
          <p>2. 或使用 Bearer Token：<code className="bg-blue-100 px-1 rounded">Authorization: Bearer kmdb_xxxxxxxx</code></p>
          <p>3. 或在 URL 中添加：<code className="bg-blue-100 px-1 rounded">?api_key=kmdb_xxxxxxxx</code></p>
        </div>
      </div>

      {/* Token 列表 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无 Token，点击"创建 Token"开始使用
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 border text-left">名称</th>
                <th className="px-4 py-3 border text-left">Token 前缀</th>
                <th className="px-4 py-3 border text-left">所属用户</th>
                <th className="px-4 py-3 border text-left">状态</th>
                <th className="px-4 py-3 border text-left">过期时间</th>
                <th className="px-4 py-3 border text-left">最后使用</th>
                <th className="px-4 py-3 border text-left">创建时间</th>
                <th className="px-4 py-3 border text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border font-medium">{token.name}</td>
                  <td className="px-4 py-3 border">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{token.token_prefix}...</code>
                  </td>
                  <td className="px-4 py-3 border">{token.user?.username || '-'}</td>
                  <td className="px-4 py-3 border">{getStatusBadge(token.status, token.expires_at)}</td>
                  <td className="px-4 py-3 border text-sm">
                    {token.expires_at ? formatDate(token.expires_at) : '永不过期'}
                  </td>
                  <td className="px-4 py-3 border text-sm">{formatDate(token.last_used_at)}</td>
                  <td className="px-4 py-3 border text-sm">{formatDate(token.created_at)}</td>
                  <td className="px-4 py-3 border">
                    <div className="flex gap-2">
                      {token.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(token)}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          title="撤销此 Token"
                        >
                          撤销
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(token)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        title="永久删除此 Token"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 创建 Token 对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {createdToken ? '🎉 Token 创建成功' : '创建 API Token'}
              </h2>

              {createdToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium mb-2">⚠️ 请立即复制并安全保存此 Token</p>
                    <p className="text-yellow-700 text-sm">此后将无法再次查看完整 Token</p>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all text-sm font-mono">{createdToken}</code>
                      <button
                        onClick={() => copyToClipboard(createdToken)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0"
                      >
                        复制
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      完成
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Token 名称 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Token 名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如: CI/CD Pipeline Token"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 过期时间 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">过期时间</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.no_expiry}
                          onChange={(e) => setFormData({ ...formData, no_expiry: e.target.checked })}
                        />
                        永不过期
                      </label>
                      {!formData.no_expiry && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData.expires_in}
                            onChange={(e) =>
                              setFormData({ ...formData, expires_in: parseInt(e.target.value) || 0 })
                            }
                            min={1}
                            className="w-20 px-3 py-2 border rounded"
                          />
                          <span>天</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 权限范围 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        权限范围 <span className="text-gray-500 text-xs">(可选，为空则允许所有操作)</span>
                      </label>
                      <button
                        type="button"
                        onClick={addScope}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        + 添加范围
                      </button>
                    </div>

                    {formData.scopes.length > 0 && (
                      <div className="space-y-2">
                        {formData.scopes.map((scope, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <select
                              value={scope.resource}
                              onChange={(e) => updateScope(index, 'resource', e.target.value)}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                            >
                              {AVAILABLE_RESOURCES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            <select
                              multiple
                              value={scope.actions}
                              onChange={(e) =>
                                updateScope(
                                  index,
                                  'actions',
                                  Array.from(e.target.selectedOptions, (o) => o.value)
                                )
                              }
                              className="flex-1 px-2 py-1 border rounded text-sm h-20"
                            >
                              {AVAILABLE_ACTIONS.map((a) => (
                                <option key={a.value} value={a.value}>
                                  {a.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeScope(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreate}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      创建
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

