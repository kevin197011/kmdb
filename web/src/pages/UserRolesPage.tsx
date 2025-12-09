import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  username: string
  email: string
  full_name?: string
}

interface Role {
  id: string
  name: string
  description?: string
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userRoles, setUserRoles] = useState<Role[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?page=1&limit=100')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('加载用户失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const response = await api.get('/roles?page=1&limit=100')
      setRoles(response.data.data || [])
    } catch (error) {
      console.error('加载角色失败:', error)
    }
  }

  const loadUserRoles = async (userId: string) => {
    try {
      const response = await api.get(`/users/${userId}/roles`)
      setUserRoles(response.data || [])
    } catch (error) {
      console.error('加载用户角色失败:', error)
    }
  }

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await api.post(`/users/${userId}/roles`, { role_id: roleId })
      loadUserRoles(userId)
      toast({ title: '成功', description: '角色分配成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '分配角色失败', variant: 'error' })
    }
  }

  const handleRevokeRole = async (userId: string, roleId: string) => {
    try {
      await api.delete(`/users/${userId}/roles/${roleId}`)
      loadUserRoles(userId)
      toast({ title: '成功', description: '角色撤销成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '撤销角色失败', variant: 'error' })
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">用户角色分配</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">用户列表</h2>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-4 border rounded cursor-pointer ${
                  selectedUser === user.id ? 'bg-blue-50 border-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedUser(user.id)
                  loadUserRoles(user.id)
                }}
              >
                <div>
                  <h3 className="font-semibold">{user.username}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedUser && (
          <div>
            <h2 className="text-xl font-semibold mb-4">角色分配</h2>
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignRole(selectedUser, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">选择角色分配给用户</option>
                {roles
                  .filter((r) => !userRoles.some((ur) => ur.id === r.id))
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              {userRoles.map((role) => (
                <div
                  key={role.id}
                  className="p-3 border rounded flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{role.name}</div>
                    {role.description && (
                      <div className="text-sm text-gray-600">{role.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevokeRole(selectedUser, role.id)}
                    className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                  >
                    撤销
                  </button>
                </div>
              ))}
              {userRoles.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无角色</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

