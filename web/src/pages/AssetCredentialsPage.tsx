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
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null)
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
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    setLoading(true)
    try {
      // 获取所有凭证（包括未关联资产的）
      const response = await api.get('/asset-credentials')
      setCredentials(response.data || [])
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '加载凭证失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCredential(null)
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
    setShowForm(true)
  }

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential)
    setFormData({
      name: credential.name,
      username: credential.username,
      auth_type: credential.auth_type,
      password: '', // 不显示已加密的密码
      private_key: '', // 不显示已加密的私钥
      public_key: credential.public_key || '', // 公钥可以显示
      passphrase: '',
      description: credential.description || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        name: formData.name,
        username: formData.username,
        auth_type: formData.auth_type,
        description: formData.description,
        is_default: false, // 全局凭证不需要默认设置
      }

      if (formData.auth_type === 'password') {
        if (formData.password) {
          payload.password = formData.password
        }
      } else {
        if (formData.private_key) {
          payload.private_key = formData.private_key
        }
        if (formData.public_key) {
          payload.public_key = formData.public_key
        }
        if (formData.passphrase) {
          payload.passphrase = formData.passphrase
        }
      }

      if (editingCredential) {
        await api.put(`/asset-credentials/${editingCredential.id}`, payload)
        toast({ title: '成功', description: '凭证更新成功', variant: 'success' })
      } else {
        await api.post('/asset-credentials', payload)
        toast({ title: '成功', description: '凭证创建成功', variant: 'success' })
      }
      setShowForm(false)
      fetchCredentials()
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('确认删除', '确定要删除这个凭证吗？此操作不可恢复。')
    if (!confirmed) return

    try {
      await api.delete(`/asset-credentials/${id}`)
      toast({ title: '成功', description: '凭证删除成功', variant: 'success' })
      fetchCredentials()
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '删除失败', variant: 'error' })
    }
  }

  // 只显示全局凭证（不关联主机的）
  const globalCredentials = credentials.filter(cred => !cred.asset_id)

  return (
    <>
      <ConfirmDialog />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">主机密钥管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理全局凭证，所有主机都可以使用这些凭证进行连接
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="创建新的全局凭证（SSH密码或密钥）"
          >
            <span>➕</span>
            <span>新建凭证</span>
          </button>
        </div>

        {/* 创建/编辑表单 */}
        {showForm && (
          <div className="mb-6 p-4 border rounded bg-white">
            <h2 className="text-xl font-semibold mb-4">
              {editingCredential ? '编辑凭证' : '新建凭证'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">🌐</span>
                  <div>
                    <div className="font-medium text-blue-700">全局凭证</div>
                    <div className="text-xs text-blue-600 mt-1">
                      所有主机都可以使用此凭证进行连接
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">凭证名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="如：root账号、admin账号"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">用户名 *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">认证类型 *</label>
                <select
                  value={formData.auth_type}
                  onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="password">密码认证</option>
                  <option value="key">密钥认证</option>
                </select>
              </div>

              {formData.auth_type === 'password' ? (
                <div>
                  <label className="block mb-1 text-sm font-medium">
                    密码 {editingCredential ? '(留空则不修改)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required={!editingCredential}
                  />
                  {editingCredential && (
                    <p className="text-xs text-gray-500 mt-1">留空则保留原有密码</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      私钥 {editingCredential ? '(留空则不修改)' : '*'}
                    </label>
                    {editingCredential && formData.private_key === '' && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        ⚠️ 私钥已设置但出于安全考虑不显示。如需修改，请重新输入完整私钥。
                      </div>
                    )}
                    <textarea
                      value={formData.private_key}
                      onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                      className="w-full px-3 py-2 border rounded font-mono text-sm"
                      rows={6}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                      required={!editingCredential}
                    />
                    {editingCredential && (
                      <p className="text-xs text-gray-500 mt-1">留空则保留原有私钥</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">公钥 (可选)</label>
                    <textarea
                      value={formData.public_key}
                      onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                      className="w-full px-3 py-2 border rounded font-mono text-sm"
                      rows={3}
                      placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">密钥密码 (可选)</label>
                    <input
                      type="password"
                      value={formData.passphrase}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="如果私钥有密码保护，请输入"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>


              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 凭证列表 */}
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div>
            {globalCredentials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无凭证</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-lg text-blue-700">
                    🌐 全局凭证（所有主机可用）
                    <span className="ml-2 text-sm text-gray-600">
                      ({globalCredentials.length} 个凭证)
                    </span>
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">
                    这些凭证可以在连接任何主机时选择使用
                  </p>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {globalCredentials.map((credential) => (
                      <div
                        key={credential.id}
                        className="p-4 border rounded-lg bg-white hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{credential.name}</h4>
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {credential.auth_type === 'password' ? '密码' : '密钥'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">用户名:</span> {credential.username}
                              </p>
                              {credential.auth_type === 'key' && credential.public_key && (
                                <p>
                                  <span className="font-medium">公钥:</span>{' '}
                                  <span className="font-mono text-xs break-all">
                                    {credential.public_key.length > 60
                                      ? `${credential.public_key.substring(0, 60)}...`
                                      : credential.public_key}
                                  </span>
                                </p>
                              )}
                              {credential.description && (
                                <p>
                                  <span className="font-medium">描述:</span> {credential.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                创建时间: {new Date(credential.created_at).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <button
                              onClick={() => handleEdit(credential)}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              title={`编辑凭证: ${credential.name}`}
                            >
                              ✏️ 编辑
                            </button>
                            <button
                              onClick={() => handleDelete(credential.id)}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              title={`删除凭证: ${credential.name}（此操作不可恢复）`}
                            >
                              🗑️ 删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

