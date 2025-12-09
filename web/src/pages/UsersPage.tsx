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
  updated_at: string
}

interface UserGroup {
  id: string
  name: string
  description?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    status: 'active',
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  })
  const [userGroups, setUserGroups] = useState<Record<string, UserGroup[]>>({})
  const [allGroups, setAllGroups] = useState<UserGroup[]>([])
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    fetchUsers()
    loadAllGroups()
  }, [page])

  useEffect(() => {
    if (users.length > 0) {
      loadUserGroups()
    }
  }, [users])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/users?page=${page}&limit=20`)
      setUsers(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllGroups = async () => {
    try {
      const response = await api.get('/user-groups?page=1&limit=100')
      setAllGroups(response.data.data || [])
    } catch (error) {
      console.error('加载群组失败:', error)
    }
  }

  const loadUserGroups = async () => {
    const groupsMap: Record<string, UserGroup[]> = {}
    for (const user of users) {
      try {
        const response = await api.get(`/users/${user.id}/groups`)
        groupsMap[user.id] = response.data || []
      } catch (error) {
        console.error(`加载用户 ${user.id} 的群组失败:`, error)
        groupsMap[user.id] = []
      }
    }
    setUserGroups(groupsMap)
  }

  const handleManageGroups = (userId: string) => {
    setSelectedUserId(userId)
    setShowGroupDialog(true)
  }

  const handleAddToGroup = async (groupId: string) => {
    if (!selectedUserId) return
    try {
      await api.post(`/user-groups/${groupId}/members`, { user_id: selectedUserId })
      loadUserGroups()
      toast({ title: '成功', description: '添加成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '添加失败', variant: 'error' })
    }
  }

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!selectedUserId) return
    const confirmed = await confirm('确认移除', '确定要从群组中移除该用户吗？')
    if (!confirmed) return
    try {
      await api.delete(`/user-groups/${groupId}/members/${selectedUserId}`)
      loadUserGroups()
      toast({ title: '成功', description: '移除成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '移除失败', variant: 'error' })
    }
  }

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({ username: '', email: '', password: '', status: 'active' })
    setShowForm(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ username: user.username, email: user.email, password: '', status: user.status })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          username: formData.username,
          email: formData.email,
          status: formData.status,
        })
      } else {
        await api.post('/users', formData)
      }
      setShowForm(false)
      fetchUsers()
      toast({ title: '成功', description: editingUser ? '用户更新成功' : '用户创建成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('确认删除', '确定要删除这个用户吗？此操作不可恢复。')
    if (!confirmed) return
    try {
      await api.delete(`/users/${id}`)
      fetchUsers()
      toast({ title: '成功', description: '用户删除成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '删除失败', variant: 'error' })
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({ title: '错误', description: '新密码和确认密码不匹配', variant: 'error' })
      return
    }
    if (!passwordUserId) return

    try {
      // 管理员修改其他用户密码，不需要旧密码
      await api.post(`/users/${passwordUserId}/change-password`, {
        new_password: passwordData.new_password,
      })
      setShowPasswordForm(false)
      setPasswordUserId(null)
      setPasswordData({ new_password: '', confirm_password: '' })
      toast({ title: '成功', description: '密码修改成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '密码修改失败', variant: 'error' })
    }
  }

  return (
    <>
      <ConfirmDialog />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">用户管理</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="创建新的系统用户"
          >
            <span>➕</span>
            <span>新建用户</span>
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border rounded bg-white">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? '编辑用户' : '新建用户'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block mb-1">密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">禁用</option>
                </select>
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

        {showPasswordForm && passwordUserId && (
          <div className="mb-6 p-4 border rounded bg-white">
            <h2 className="text-xl font-semibold mb-4">修改密码</h2>
            <p className="text-sm text-gray-600 mb-4">
              管理员修改用户密码，无需输入旧密码
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  修改
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordUserId(null)
                    setPasswordData({ new_password: '', confirm_password: '' })
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">用户名</th>
                  <th className="px-4 py-2 border">邮箱</th>
                  <th className="px-4 py-2 border">所属群组</th>
                  <th className="px-4 py-2 border">状态</th>
                  <th className="px-4 py-2 border">创建时间</th>
                  <th className="px-4 py-2 border">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2 border">{user.username}</td>
                    <td className="px-4 py-2 border">{user.email}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex flex-wrap gap-1">
                        {userGroups[user.id]?.length > 0 ? (
                          userGroups[user.id].map((group) => (
                            <span
                              key={group.id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              {group.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">无</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{user.status}</td>
                    <td className="px-4 py-2 border">
                      {new Date(user.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-2 border">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors"
                          title={`编辑用户: ${user.username}`}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => handleManageGroups(user.id)}
                          className="px-2 py-1 text-purple-600 hover:bg-purple-50 rounded text-sm transition-colors"
                          title={`管理 ${user.username} 所属的用户群组`}
                        >
                          👥 群组
                        </button>
                        <button
                          onClick={() => {
                            setPasswordUserId(user.id)
                            setShowPasswordForm(true)
                          }}
                          className="px-2 py-1 text-green-600 hover:bg-green-50 rounded text-sm transition-colors"
                          title={`修改 ${user.username} 的登录密码`}
                        >
                          🔑 改密
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                          title={`删除用户: ${user.username}（此操作不可恢复）`}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div>共 {total} 条记录，第 {page} 页</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {showGroupDialog && selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">管理用户群组</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                用户: {users.find((u) => u.id === selectedUserId)?.username}
              </p>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">当前群组</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userGroups[selectedUserId]?.length > 0 ? (
                    userGroups[selectedUserId].map((group) => (
                      <div
                        key={group.id}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{group.name}</span>
                        <button
                          onClick={() => handleRemoveFromGroup(group.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          移除
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">暂无群组</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">添加到群组</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddToGroup(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">选择群组...</option>
                  {allGroups
                    .filter(
                      (group) =>
                        !userGroups[selectedUserId]?.some((g) => g.id === group.id)
                    )
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowGroupDialog(false)
                  setSelectedUserId(null)
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

