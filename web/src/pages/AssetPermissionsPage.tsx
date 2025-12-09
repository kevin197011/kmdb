import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Asset {
  id: string
  name: string
  type: string
}

interface Role {
  id: string
  name: string
}

interface User {
  id: string
  username: string
  email: string
}

interface AssetPermission {
  id: string
  asset_id: string
  role_id?: string
  user_id?: string
  action: string
  role?: Role
  user?: User
}

const ACTIONS = [
  { value: 'view', label: '查看' },
  { value: 'connect', label: '连接' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
]

export default function AssetPermissionsPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<AssetPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'role' | 'user'>('role')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('view')
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    if (assetId) {
      loadAsset()
      loadRoles()
      loadUsers()
      loadPermissions()
    }
  }, [assetId])

  const loadAsset = async () => {
    try {
      const response = await api.get(`/assets/${assetId}`)
      setAsset(response.data)
    } catch (error) {
      console.error('加载资产失败:', error)
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

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?page=1&limit=100')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('加载用户失败:', error)
    }
  }

  const loadPermissions = async () => {
    try {
      const response = await api.get(`/assets/${assetId}/permissions`)
      setPermissions(response.data || [])
    } catch (error) {
      console.error('加载权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRolePermission = async () => {
    if (!selectedRole) {
      toast({ title: '错误', description: '请选择角色', variant: 'error' })
      return
    }
    try {
      await api.post(`/assets/${assetId}/permissions/roles`, {
        role_id: selectedRole,
        action: selectedAction,
      })
      loadPermissions()
      setSelectedRole('')
      toast({ title: '成功', description: '权限分配成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '分配权限失败', variant: 'error' })
    }
  }

  const handleAssignUserPermission = async () => {
    if (!selectedUser) {
      toast({ title: '错误', description: '请选择用户', variant: 'error' })
      return
    }
    try {
      await api.post(`/assets/${assetId}/permissions/users`, {
        user_id: selectedUser,
        action: selectedAction,
      })
      loadPermissions()
      setSelectedUser('')
      toast({ title: '成功', description: '权限分配成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '分配权限失败', variant: 'error' })
    }
  }

  const handleRevokePermission = async (permissionId: string) => {
    const confirmed = await confirm('确认撤销', '确定要撤销这个权限吗？')
    if (!confirmed) return

    try {
      await api.delete(`/asset-permissions/${permissionId}`)
      loadPermissions()
      toast({ title: '成功', description: '权限撤销成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '撤销权限失败', variant: 'error' })
    }
  }

  const getActionLabel = (action: string) => {
    const actionObj = ACTIONS.find((a) => a.value === action)
    return actionObj?.label || action
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <>
      <ConfirmDialog />
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">主机权限分配</h1>
          {asset && (
            <p className="text-gray-600">
              资产: <span className="font-semibold">{asset.name}</span> ({asset.type})
            </p>
          )}
        </div>

        {/* 分配权限表单 */}
        <div className="mb-6 p-4 border rounded bg-white">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab('role')}
              className={`px-4 py-2 rounded ${
                activeTab === 'role'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              按角色分配
            </button>
            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-2 rounded ${
                activeTab === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              按用户分配
            </button>
          </div>

          {activeTab === 'role' ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">选择角色</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">选择角色</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">选择操作</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  {ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAssignRolePermission}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  分配权限
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">选择用户</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">选择用户</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">选择操作</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  {ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAssignUserPermission}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  分配权限
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 权限列表 */}
        <div className="bg-white border rounded">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">已分配的权限</h2>
          </div>
          <div className="p-4">
            {permissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无权限分配</p>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="p-4 border rounded flex justify-between items-center hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-medium">
                            {permission.role ? `角色: ${permission.role.name}` : `用户: ${permission.user?.username}`}
                          </span>
                          {permission.user && (
                            <span className="text-sm text-gray-500 ml-2">({permission.user.email})</span>
                          )}
                        </div>
                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                          {getActionLabel(permission.action)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokePermission(permission.id)}
                      className="px-3 py-1 text-sm bg-red-200 text-red-700 rounded hover:bg-red-300"
                    >
                      撤销
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

