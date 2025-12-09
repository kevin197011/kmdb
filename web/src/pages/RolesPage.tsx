import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Role {
  id: string
  name: string
  description?: string
  created_at: string
}

interface User {
  id: string
  username: string
  email: string
}

// 预设角色说明
const ROLE_DESCRIPTIONS: Record<string, { icon: string; color: string; desc: string }> = {
  super_admin: { icon: '👑', color: 'bg-purple-100 text-purple-800 border-purple-300', desc: '超级管理员，拥有系统所有权限' },
  admin: { icon: '⚙️', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: '管理员，可管理大部分系统功能' },
  operator: { icon: '🔧', color: 'bg-green-100 text-green-800 border-green-300', desc: '运维人员，可操作资产和SSH连接' },
  viewer: { icon: '👁️', color: 'bg-gray-100 text-gray-800 border-gray-300', desc: '只读用户，仅可查看资源' },
  dev: { icon: '💻', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', desc: '开发人员' },
  ops: { icon: '🛠️', color: 'bg-orange-100 text-orange-800 border-orange-300', desc: '运维人员' },
}

export default function RolesPage() {
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showUsersDialog, setShowUsersDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleUsers, setRoleUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const response = await api.get('/roles?limit=100')
      setRoles(response.data.data || [])
    } catch {
      toast({ title: '加载失败', description: '无法加载角色列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleUsers = async (roleId: string) => {
    try {
      // 获取所有用户，然后筛选拥有该角色的用户
      const usersRes = await api.get('/users?limit=1000')
      const allUsers = usersRes.data.data || []

      const usersWithRole: User[] = []
      for (const user of allUsers) {
        try {
          const rolesRes = await api.get(`/users/${user.id}/roles`)
          const userRoles = rolesRes.data || []
          if (userRoles.some((r: Role) => r.id === roleId)) {
            usersWithRole.push(user)
          }
        } catch {
          // ignore
        }
      }
      setRoleUsers(usersWithRole)
    } catch {
      toast({ title: '加载失败', description: '无法加载角色用户', variant: 'error' })
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入角色名称', variant: 'error' })
      return
    }
    try {
      await api.post('/roles', formData)
      toast({ title: '成功', description: '角色创建成功' })
      setShowCreateDialog(false)
      setFormData({ name: '', description: '' })
      fetchRoles()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建角色失败', variant: 'error' })
    }
  }

  const handleUpdate = async () => {
    if (!selectedRole) return
    try {
      await api.put(`/roles/${selectedRole.id}`, formData)
      toast({ title: '成功', description: '角色更新成功' })
      setShowEditDialog(false)
      fetchRoles()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '更新失败', description: err.response?.data?.error || '更新角色失败', variant: 'error' })
    }
  }

  const handleDelete = async (role: Role) => {
    const confirmed = await confirm('确认删除', `确定要删除角色 "${role.name}" 吗？`)
    if (!confirmed) return
    try {
      await api.delete(`/roles/${role.id}`)
      toast({ title: '成功', description: '角色已删除' })
      fetchRoles()
    } catch {
      toast({ title: '删除失败', description: '无法删除角色', variant: 'error' })
    }
  }

  const openEdit = (role: Role) => {
    setSelectedRole(role)
    setFormData({ name: role.name, description: role.description || '' })
    setShowEditDialog(true)
  }

  const openUsers = (role: Role) => {
    setSelectedRole(role)
    setRoleUsers([])
    setShowUsersDialog(true)
    fetchRoleUsers(role.id)
  }

  const getRoleStyle = (roleName: string) => {
    return ROLE_DESCRIPTIONS[roleName] || { icon: '🔐', color: 'bg-gray-100 text-gray-800 border-gray-300', desc: '' }
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">角色管理</h1>
          <p className="text-gray-500 mt-1">管理系统角色，角色用于分组管理权限</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', description: '' }); setShowCreateDialog(true) }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 新建角色
        </button>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-medium text-blue-800">关于角色和权限</div>
            <p className="text-sm text-blue-700 mt-1">
              角色是权限的集合。创建角色后，可以在「权限管理」页面为角色分配具体的资源访问权限。
              用户可以拥有多个角色，最终权限是所有角色权限的并集。
            </p>
          </div>
        </div>
      </div>

      {/* Role Grid */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无角色，点击"新建角色"创建</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const style = getRoleStyle(role.name)
            return (
              <div key={role.id} className={`border-2 rounded-lg overflow-hidden ${style.color.includes('border') ? style.color.split(' ').find(c => c.startsWith('border-')) : 'border-gray-200'}`}>
                <div className={`p-4 ${style.color.split(' ').slice(0, 2).join(' ')}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{style.icon}</span>
                      <h3 className="text-lg font-bold">{role.name}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-sm text-gray-600 mb-3">
                    {role.description || style.desc || '暂无描述'}
                  </p>
                  <div className="text-xs text-gray-400 mb-3">
                    创建于 {new Date(role.created_at).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openUsers(role)}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded flex-1"
                    >
                      👥 查看用户
                    </button>
                    <button
                      onClick={() => openEdit(role)}
                      className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Role Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">新建角色</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">角色名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="如：developer、tester"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="角色的用途说明"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCreateDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">取消</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      {showEditDialog && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">编辑角色</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">角色名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowEditDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">取消</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Users Dialog */}
      {showUsersDialog && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                <span className="mr-2">{getRoleStyle(selectedRole.name).icon}</span>
                {selectedRole.name} 的用户
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {roleUsers.length > 0 ? (
                  roleUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-4">暂无用户拥有此角色</div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setShowUsersDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
