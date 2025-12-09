import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface User {
  id: string
  username: string
  email: string
  status: string
  created_at: string
}

interface Role {
  id: string
  name: string
  description?: string
}

interface Team {
  id: string
  name: string
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-800' },
  inactive: { label: '禁用', color: 'bg-red-100 text-red-800' },
}

export default function UsersPage() {
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // 用户角色和团队映射
  const [userRoles, setUserRoles] = useState<Record<string, Role[]>>({})
  const [userTeams, setUserTeams] = useState<Record<string, Team[]>>({})

  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showTeamDialog, setShowTeamDialog] = useState(false)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', status: 'active' })
  const [passwordData, setPasswordData] = useState({ new_password: '', confirm_password: '' })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes, teamsRes] = await Promise.all([
        api.get('/users?limit=1000'),
        api.get('/roles?limit=100'),
        api.get('/teams?limit=100'),
      ])
      const userList = usersRes.data.data || []
      setUsers(userList)
      setRoles(rolesRes.data.data || [])
      setTeams(teamsRes.data.data || [])

      // 加载用户角色和团队
      await loadUserRolesAndTeams(userList)
    } catch {
      toast({ title: '加载失败', description: '无法加载数据', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadUserRolesAndTeams = async (userList: User[]) => {
    const rolesMap: Record<string, Role[]> = {}
    const teamsMap: Record<string, Team[]> = {}

    await Promise.all(
      userList.map(async (user) => {
        try {
          const rolesRes = await api.get(`/users/${user.id}/roles`)
          rolesMap[user.id] = rolesRes.data || []
          // 暂时用空数组，因为 API 不支持获取单个用户的团队
          teamsMap[user.id] = []
        } catch {
          rolesMap[user.id] = []
          teamsMap[user.id] = []
        }
      })
    )

    setUserRoles(rolesMap)
    setUserTeams(teamsMap)
  }

  const loadUserRoles = async (userId: string) => {
    try {
      const res = await api.get(`/users/${userId}/roles`)
      setUserRoles(prev => ({ ...prev, [userId]: res.data || [] }))
    } catch {
      console.error('加载用户角色失败')
    }
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      toast({ title: '错误', description: '请填写所有必填项', variant: 'error' })
      return
    }
    try {
      await api.post('/users', formData)
      toast({ title: '成功', description: '用户创建成功' })
      setShowCreateDialog(false)
      setFormData({ username: '', email: '', password: '', status: 'active' })
      fetchAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建用户失败', variant: 'error' })
    }
  }

  const handleUpdate = async () => {
    if (!selectedUser) return
    try {
      await api.put(`/users/${selectedUser.id}`, {
        username: formData.username,
        email: formData.email,
        status: formData.status,
      })
      toast({ title: '成功', description: '用户更新成功' })
      setShowEditDialog(false)
      fetchAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '更新失败', description: err.response?.data?.error || '更新用户失败', variant: 'error' })
    }
  }

  const handleDelete = async (user: User) => {
    const confirmed = await confirm('确认删除', `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`)
    if (!confirmed) return
    try {
      await api.delete(`/users/${user.id}`)
      toast({ title: '成功', description: '用户已删除' })
      fetchAll()
    } catch {
      toast({ title: '删除失败', description: '无法删除用户', variant: 'error' })
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({ title: '错误', description: '两次输入的密码不一致', variant: 'error' })
      return
    }
    try {
      await api.post(`/users/${selectedUser.id}/change-password`, {
        new_password: passwordData.new_password,
      })
      toast({ title: '成功', description: '密码修改成功' })
      setShowPasswordDialog(false)
      setPasswordData({ new_password: '', confirm_password: '' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '修改失败', description: err.response?.data?.error || '密码修改失败', variant: 'error' })
    }
  }

  const handleAssignRole = async (roleId: string) => {
    if (!selectedUser) return
    try {
      await api.post(`/users/${selectedUser.id}/roles`, { role_id: roleId })
      toast({ title: '成功', description: '角色分配成功' })
      loadUserRoles(selectedUser.id)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '分配失败', description: err.response?.data?.error || '角色分配失败', variant: 'error' })
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!selectedUser) return
    try {
      await api.delete(`/users/${selectedUser.id}/roles/${roleId}`)
      toast({ title: '成功', description: '角色已撤销' })
      loadUserRoles(selectedUser.id)
    } catch {
      toast({ title: '撤销失败', description: '角色撤销失败', variant: 'error' })
    }
  }

  const handleAddToTeam = async (teamId: string) => {
    if (!selectedUser) return
    try {
      await api.post(`/teams/${teamId}/members`, { user_id: selectedUser.id })
      toast({ title: '成功', description: '已添加到团队' })
      fetchAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '添加失败', description: err.response?.data?.error || '添加到团队失败', variant: 'error' })
    }
  }

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({ username: user.username, email: user.email, password: '', status: user.status })
    setShowEditDialog(true)
  }

  const openPassword = (user: User) => {
    setSelectedUser(user)
    setPasswordData({ new_password: '', confirm_password: '' })
    setShowPasswordDialog(true)
  }

  const openRoleDialog = (user: User) => {
    setSelectedUser(user)
    setShowRoleDialog(true)
  }

  const openTeamDialog = (user: User) => {
    setSelectedUser(user)
    setShowTeamDialog(true)
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户、分配角色和团队</p>
        </div>
        <button
          onClick={() => { setFormData({ username: '', email: '', password: '', status: 'active' }); setShowCreateDialog(true) }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 新建用户
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 搜索用户名或邮箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg"
        />
      </div>

      {/* User Cards */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无用户数据</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                {/* User Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGES[user.status]?.color || 'bg-gray-100'}`}>
                    {STATUS_BADGES[user.status]?.label || user.status}
                  </span>
                </div>

                {/* Roles */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">角色</div>
                  <div className="flex flex-wrap gap-1">
                    {userRoles[user.id]?.length > 0 ? (
                      userRoles[user.id].map((role) => (
                        <span key={role.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">无角色</span>
                    )}
                  </div>
                </div>

                {/* Teams */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">团队</div>
                  <div className="flex flex-wrap gap-1">
                    {userTeams[user.id]?.length > 0 ? (
                      userTeams[user.id].map((team) => (
                        <span key={team.id} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {team.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">无团队</span>
                    )}
                  </div>
                </div>

                {/* Created Time */}
                <div className="text-xs text-gray-400 mb-3">
                  创建于 {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <button
                    onClick={() => openEdit(user)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => openRoleDialog(user)}
                    className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                  >
                    🔐 角色
                  </button>
                  <button
                    onClick={() => openTeamDialog(user)}
                    className="px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
                  >
                    👥 团队
                  </button>
                  <button
                    onClick={() => openPassword(user)}
                    className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded"
                  >
                    🔑 改密
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">新建用户</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">用户名 *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="输入用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">邮箱 *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="输入邮箱"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">密码 *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="输入密码（需包含大小写字母和数字）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">禁用</option>
                  </select>
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

      {/* Edit User Dialog */}
      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">编辑用户</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">用户名</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">禁用</option>
                  </select>
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

      {/* Change Password Dialog */}
      {showPasswordDialog && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">修改密码</h2>
              <p className="text-sm text-gray-500 mb-4">为用户 <strong>{selectedUser.username}</strong> 设置新密码</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">新密码</label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="输入新密码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">确认密码</label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="再次输入新密码"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowPasswordDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">取消</button>
                <button onClick={handleChangePassword} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">修改</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Dialog */}
      {showRoleDialog && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">管理角色</h2>
              <p className="text-sm text-gray-500 mb-4">为用户 <strong>{selectedUser.username}</strong> 分配角色</p>

              {/* Current Roles */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">当前角色</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userRoles[selectedUser.id]?.length > 0 ? (
                    userRoles[selectedUser.id].map((role) => (
                      <div key={role.id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">{role.name}</span>
                        <button
                          onClick={() => handleRevokeRole(role.id)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          撤销
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 py-2">暂无角色</div>
                  )}
                </div>
              </div>

              {/* Add Role */}
              <div>
                <div className="text-sm font-medium mb-2">添加角色</div>
                <select
                  onChange={(e) => { if (e.target.value) { handleAssignRole(e.target.value); e.target.value = '' } }}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">选择角色...</option>
                  {roles.filter(r => !userRoles[selectedUser.id]?.some(ur => ur.id === r.id)).map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowRoleDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Team Dialog */}
      {showTeamDialog && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">加入团队</h2>
              <p className="text-sm text-gray-500 mb-4">将用户 <strong>{selectedUser.username}</strong> 添加到团队</p>

              {/* Team List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.length > 0 ? (
                  teams.map((team) => (
                    <div key={team.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                      <span className="font-medium">{team.name}</span>
                      <button
                        onClick={() => handleAddToTeam(team.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        添加
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-4">暂无团队，请先创建团队</div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowTeamDialog(false)} className="px-4 py-2 border rounded hover:bg-gray-50">关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
