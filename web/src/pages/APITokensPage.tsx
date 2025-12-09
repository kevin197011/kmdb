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
  const { confirm, ConfirmDialog } = useConfirm()
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    expires_in: 30,
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
    } catch {
      toast({ title: '加载失败', description: '无法加载 Token 列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入 Token 名称', variant: 'error' })
      return
    }

    try {
      const payload: { name: string; scopes?: TokenScope[]; expires_in?: number } = {
        name: formData.name,
      }
      if (formData.scopes.length > 0) payload.scopes = formData.scopes
      if (!formData.no_expiry && formData.expires_in > 0) payload.expires_in = formData.expires_in

      const response = await api.post('/api-tokens', payload)
      setCreatedToken(response.data.raw_token)
      fetchTokens()
      toast({ title: '创建成功', description: '请立即复制并保存 Token，此后将无法再次查看' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建 Token 失败', variant: 'error' })
    }
  }

  const handleRevoke = async (token: APIToken) => {
    const confirmed = await confirm('确认撤销', `确定要撤销 Token "${token.name}" 吗？撤销后该 Token 将无法使用。`)
    if (!confirmed) return

    try {
      await api.post(`/api-tokens/${token.id}/revoke`)
      fetchTokens()
      toast({ title: '撤销成功', description: 'Token 已被撤销' })
    } catch {
      toast({ title: '撤销失败', description: '无法撤销 Token', variant: 'error' })
    }
  }

  const handleDelete = async (token: APIToken) => {
    const confirmed = await confirm('确认删除', `确定要永久删除 Token "${token.name}" 吗？此操作不可恢复。`)
    if (!confirmed) return

    try {
      await api.delete(`/api-tokens/${token.id}`)
      fetchTokens()
      toast({ title: '删除成功', description: 'Token 已被删除' })
    } catch {
      toast({ title: '删除失败', description: '无法删除 Token', variant: 'error' })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: '复制成功', description: 'Token 已复制到剪贴板' })
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
      scopes: prev.scopes.map((scope, i) => (i === index ? { ...scope, [field]: value } : scope)),
    }))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const getStatusBadge = (status: string, expiresAt: string | null) => {
    if (status === 'revoked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          已撤销
        </span>
      )
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          已过期
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        活跃
      </span>
    )
  }

  const resetForm = () => {
    setFormData({ name: '', expires_in: 30, no_expiry: false, scopes: [] })
    setCreatedToken(null)
    setShowCreateDialog(false)
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Token 管理</h1>
          <p className="text-gray-500 mt-1">创建和管理用于程序化访问 API 的 Token</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/docs/"
            target="_blank"
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
          >
            📖 API 文档
          </a>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            + 创建 Token
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔑</span>
          <div>
            <div className="font-medium text-blue-800">使用方法</div>
            <div className="text-sm text-blue-600 mt-1 space-y-1">
              <p>1. 在请求头中添加：<code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">X-API-Key: kmdb_xxxxxxxx</code></p>
              <p>2. 或使用 Bearer Token：<code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">Authorization: Bearer kmdb_xxxxxxxx</code></p>
              <p>3. 或在 URL 中添加：<code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">?api_key=kmdb_xxxxxxxx</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* Token 统计 */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-gray-900">{tokens.length}</span> 个 Token
          </span>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              活跃 {tokens.filter((t) => t.status === 'active' && (!t.expires_at || new Date(t.expires_at) > new Date())).length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              已撤销 {tokens.filter((t) => t.status === 'revoked').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              已过期 {tokens.filter((t) => t.expires_at && new Date(t.expires_at) < new Date() && t.status !== 'revoked').length}
            </span>
          </div>
        </div>
      </div>

      {/* Token 表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <div>加载中...</div>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <div className="text-5xl mb-4">🎫</div>
          <div className="text-gray-500 mb-4">暂无 API Token</div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建第一个 Token
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">名称</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Token 前缀</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">所属用户</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">过期时间</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">最后使用</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">创建时间</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tokens.map((token, index) => (
                  <tr
                    key={token.id}
                    className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg">
                          🎫
                        </div>
                        <div className="font-medium text-gray-900">{token.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">{token.token_prefix}...</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{token.user?.username || '-'}</span>
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(token.status, token.expires_at)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">
                        {token.expires_at ? formatDate(token.expires_at) : '永不过期'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{formatDate(token.last_used_at)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{formatDate(token.created_at)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {token.status === 'active' && (!token.expires_at || new Date(token.expires_at) > new Date()) && (
                          <button
                            onClick={() => handleRevoke(token)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="撤销"
                          >
                            ⏸️
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(token)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建 Token 对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">
                {createdToken ? '🎉 Token 创建成功' : '创建 API Token'}
              </h2>
            </div>

            {createdToken ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium mb-1">⚠️ 请立即复制并安全保存此 Token</p>
                  <p className="text-yellow-700 text-sm">此后将无法再次查看完整 Token</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all text-sm font-mono text-gray-800">{createdToken}</code>
                    <button
                      onClick={() => copyToClipboard(createdToken)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0 text-sm"
                    >
                      复制
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                    完成
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token 名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: CI/CD Pipeline Token"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">过期时间</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.no_expiry}
                        onChange={(e) => setFormData({ ...formData, no_expiry: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">永不过期</span>
                    </label>
                    {!formData.no_expiry && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.expires_in}
                          onChange={(e) => setFormData({ ...formData, expires_in: parseInt(e.target.value) || 0 })}
                          min={1}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center"
                        />
                        <span className="text-sm text-gray-600">天</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      权限范围 <span className="text-gray-500 text-xs">(可选，为空则允许所有操作)</span>
                    </label>
                    <button type="button" onClick={addScope} className="text-sm text-blue-600 hover:text-blue-700">
                      + 添加范围
                    </button>
                  </div>
                  {formData.scopes.length > 0 && (
                    <div className="space-y-2">
                      {formData.scopes.map((scope, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <select
                            value={scope.resource}
                            onChange={(e) => updateScope(index, 'resource', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          >
                            {AVAILABLE_RESOURCES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <select
                            multiple
                            value={scope.actions}
                            onChange={(e) => updateScope(index, 'actions', Array.from(e.target.selectedOptions, (o) => o.value))}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm h-20 bg-white"
                          >
                            {AVAILABLE_ACTIONS.map((a) => (
                              <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => removeScope(index)} className="text-red-500 hover:text-red-600 p-1">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!createdToken && (
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                  取消
                </button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  创建
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
