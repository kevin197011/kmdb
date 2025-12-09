import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Credential {
  id: string
  asset_id?: string
  name: string
  username: string
  auth_type: 'password' | 'key'
  public_key?: string
  description?: string
  created_at: string
}

export default function AssetCredentialsPage() {
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    auth_type: 'password' as 'password' | 'key',
    password: '',
    private_key: '',
    public_key: '',
    passphrase: '',
    description: '',
  })

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    setLoading(true)
    try {
      const response = await api.get('/asset-credentials')
      setCredentials(response.data || [])
    } catch {
      toast({ title: '加载失败', description: '无法加载凭证列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 只显示全局凭证（不关联主机的）
  const globalCredentials = credentials.filter(cred => !cred.asset_id)

  const filteredCredentials = globalCredentials.filter(cred =>
    cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      auth_type: 'password',
      password: '',
      private_key: '',
      public_key: '',
      passphrase: '',
      description: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.username.trim()) {
      toast({ title: '错误', description: '请填写凭证名称和用户名', variant: 'error' })
      return
    }
    if (formData.auth_type === 'password' && !formData.password) {
      toast({ title: '错误', description: '请填写密码', variant: 'error' })
      return
    }
    if (formData.auth_type === 'key' && !formData.private_key) {
      toast({ title: '错误', description: '请填写私钥', variant: 'error' })
      return
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        username: formData.username,
        auth_type: formData.auth_type,
        description: formData.description,
        is_default: false,
      }
      if (formData.auth_type === 'password') {
        payload.password = formData.password
      } else {
        payload.private_key = formData.private_key
        if (formData.public_key) payload.public_key = formData.public_key
        if (formData.passphrase) payload.passphrase = formData.passphrase
      }

      await api.post('/asset-credentials', payload)
      toast({ title: '成功', description: '凭证创建成功' })
      setShowCreateDialog(false)
      resetForm()
      fetchCredentials()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建凭证失败', variant: 'error' })
    }
  }

  const handleUpdate = async () => {
    if (!selectedCredential) return
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        username: formData.username,
        auth_type: formData.auth_type,
        description: formData.description,
      }
      if (formData.auth_type === 'password' && formData.password) {
        payload.password = formData.password
      } else if (formData.auth_type === 'key') {
        if (formData.private_key) payload.private_key = formData.private_key
        if (formData.public_key) payload.public_key = formData.public_key
        if (formData.passphrase) payload.passphrase = formData.passphrase
      }

      await api.put(`/asset-credentials/${selectedCredential.id}`, payload)
      toast({ title: '成功', description: '凭证更新成功' })
      setShowEditDialog(false)
      fetchCredentials()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '更新失败', description: err.response?.data?.error || '更新凭证失败', variant: 'error' })
    }
  }

  const handleDelete = async (credential: Credential) => {
    const confirmed = await confirm('确认删除', `确定要删除凭证 "${credential.name}" 吗？`)
    if (!confirmed) return
    try {
      await api.delete(`/asset-credentials/${credential.id}`)
      toast({ title: '成功', description: '凭证已删除' })
      fetchCredentials()
    } catch {
      toast({ title: '删除失败', description: '无法删除凭证', variant: 'error' })
    }
  }

  const openEdit = (credential: Credential) => {
    setSelectedCredential(credential)
    setFormData({
      name: credential.name,
      username: credential.username,
      auth_type: credential.auth_type,
      password: '',
      private_key: '',
      public_key: credential.public_key || '',
      passphrase: '',
      description: credential.description || '',
    })
    setShowEditDialog(true)
  }

  const openCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">主机密钥</h1>
          <p className="text-gray-500 mt-1">管理 SSH 凭证，用于 WebSSH 连接主机</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          + 新建凭证
        </button>
      </div>

      {/* 提示信息 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <div className="font-medium text-blue-800">全局凭证说明</div>
            <div className="text-sm text-blue-600 mt-1">
              全局凭证可用于连接任意主机。在 WebSSH 连接时，您可以选择使用已保存的凭证，无需重复输入账号密码。
              敏感数据（密码、私钥）已加密存储。
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和统计 */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="搜索凭证名称或用户名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-gray-900">{filteredCredentials.length}</span> 个凭证
          </span>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              🔑 密钥认证 {filteredCredentials.filter(c => c.auth_type === 'key').length}
            </span>
            <span className="flex items-center gap-1">
              🔒 密码认证 {filteredCredentials.filter(c => c.auth_type === 'password').length}
            </span>
          </div>
        </div>
      </div>

      {/* 凭证表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <div>加载中...</div>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <div className="text-5xl mb-4">🔑</div>
          <div className="text-gray-500 mb-4">暂无凭证数据</div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建第一个凭证
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">凭证名称</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">用户名</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">认证方式</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">描述</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">创建时间</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCredentials.map((credential, index) => (
                  <tr
                    key={credential.id}
                    className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    {/* 凭证名称 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                          credential.auth_type === 'key' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          {credential.auth_type === 'key' ? '🔑' : '🔒'}
                        </div>
                        <div className="font-medium text-gray-900">{credential.name}</div>
                      </div>
                    </td>

                    {/* 用户名 */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{credential.username}</span>
                    </td>

                    {/* 认证方式 */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        credential.auth_type === 'key'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {credential.auth_type === 'key' ? '🔑 SSH 密钥' : '🔒 密码'}
                      </span>
                    </td>

                    {/* 描述 */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600 truncate max-w-xs block">
                        {credential.description || <span className="text-gray-400">-</span>}
                      </span>
                    </td>

                    {/* 创建时间 */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">
                        {new Date(credential.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(credential)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(credential)}
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

      {/* 创建凭证对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">新建凭证</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">凭证名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="如：生产环境 root 账号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="root"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">认证方式</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.auth_type === 'password' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="auth_type"
                      value="password"
                      checked={formData.auth_type === 'password'}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })}
                      className="text-amber-600"
                    />
                    <span>🔒 密码</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.auth_type === 'key' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="auth_type"
                      value="key"
                      checked={formData.auth_type === 'key'}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })}
                      className="text-green-600"
                    />
                    <span>🔑 SSH 密钥</span>
                  </label>
                </div>
              </div>

              {formData.auth_type === 'password' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入密码"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">私钥 *</label>
                    <textarea
                      value={formData.private_key}
                      onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={5}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公钥（可选）</label>
                    <textarea
                      value={formData.public_key}
                      onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={2}
                      placeholder="ssh-rsa AAAAB3..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">私钥密码（如有）</label>
                    <input
                      type="password"
                      value={formData.passphrase}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如果私钥有密码保护"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="凭证的用途说明"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowCreateDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑凭证对话框 */}
      {showEditDialog && selectedCredential && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">编辑凭证</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">凭证名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">认证方式</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.auth_type === 'password' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="auth_type_edit"
                      value="password"
                      checked={formData.auth_type === 'password'}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })}
                      className="text-amber-600"
                    />
                    <span>🔒 密码</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.auth_type === 'key' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="auth_type_edit"
                      value="key"
                      checked={formData.auth_type === 'key'}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })}
                      className="text-green-600"
                    />
                    <span>🔑 SSH 密钥</span>
                  </label>
                </div>
              </div>

              {formData.auth_type === 'password' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码（留空则不修改）</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入新密码"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新私钥（留空则不修改）</label>
                    <textarea
                      value={formData.private_key}
                      onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={5}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公钥</label>
                    <textarea
                      value={formData.public_key}
                      onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">私钥密码</label>
                    <input
                      type="password"
                      value={formData.passphrase}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowEditDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
