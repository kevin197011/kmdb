import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Role {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
}

// 资源分组配置
const RESOURCE_GROUPS = [
  { resource: 'assets', label: '资产管理', icon: '📦' },
  { resource: 'webssh', label: 'WebSSH', icon: '💻' },
  { resource: 'users', label: '用户管理', icon: '👤' },
  { resource: 'user_groups', label: '用户群组', icon: '👥' },
  { resource: 'roles', label: '角色权限', icon: '🔐' },
  { resource: 'user_roles', label: '用户角色', icon: '👔' },
  { resource: 'group_roles', label: '群组角色', icon: '👥' },
  { resource: 'audit', label: '审计日志', icon: '📋' },
]

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [showPermissionForm, setShowPermissionForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '' })
  const [permissionFormData, setPermissionFormData] = useState({ name: '', resource: '', action: '' })
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([])
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  // 按资源分组权限
  const permissionsByResource = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    permissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = []
      }
      grouped[perm.resource].push(perm)
    })
    return grouped
  }, [permissions])

  // 按资源分组已分配的权限
  const rolePermissionsByResource = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    rolePermissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = []
      }
      grouped[perm.resource].push(perm)
    })
    return grouped
  }, [rolePermissions])

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  const loadRoles = async () => {
    try {
      const response = await api.get('/roles?page=1&limit=100')
      setRoles(response.data.data || [])
    } catch (error) {
      console.error('加载角色失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const response = await api.get('/permissions')
      setPermissions(response.data || [])
    } catch (error) {
      console.error('加载权限失败:', error)
    }
  }

  const loadRolePermissions = async (roleId: string) => {
    try {
      const response = await api.get(`/roles/${roleId}/permissions`)
      setRolePermissions(response.data || [])
    } catch (error) {
      console.error('加载角色权限失败:', error)
    }
  }

  const handleCreateRole = () => {
    setEditingRole(null)
    setRoleFormData({ name: '', description: '' })
    setShowRoleForm(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleFormData({ name: role.name, description: role.description || '' })
    setShowRoleForm(true)
  }

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, roleFormData)
      } else {
        await api.post('/roles', roleFormData)
      }
      setShowRoleForm(false)
      loadRoles()
      toast({ title: '成功', description: editingRole ? '角色更新成功' : '角色创建成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  const handleDeleteRole = async (id: string) => {
    const confirmed = await confirm('确认删除', '确定要删除这个角色吗？此操作不可恢复。')
    if (!confirmed) return
    try {
      await api.delete(`/roles/${id}`)
      loadRoles()
      toast({ title: '成功', description: '角色删除成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '删除失败', variant: 'error' })
    }
  }

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
    try {
      await api.post(`/roles/${roleId}/permissions`, { permission_id: permissionId })
      loadRolePermissions(roleId)
      toast({ title: '成功', description: '权限分配成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '分配权限失败', variant: 'error' })
    }
  }

  const handleRevokePermission = async (roleId: string, permissionId: string) => {
    try {
      await api.delete(`/roles/${roleId}/permissions/${permissionId}`)
      loadRolePermissions(roleId)
      toast({ title: '成功', description: '权限撤销成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '撤销权限失败', variant: 'error' })
    }
  }

  const handleCreatePermission = () => {
    setPermissionFormData({ name: '', resource: '', action: '' })
    setShowPermissionForm(true)
  }

  const handleSubmitPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/permissions', permissionFormData)
      setShowPermissionForm(false)
      loadPermissions()
      toast({ title: '成功', description: '权限创建成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '创建权限失败', variant: 'error' })
    }
  }

  const hasPermission = (resource: string, action: string): boolean => {
    return rolePermissions.some((p) => p.resource === resource && p.action === action)
  }

  const togglePermission = async (resource: string, action: string) => {
    if (!selectedRole) return

    const permission = permissions.find((p) => p.resource === resource && p.action === action)
    if (!permission) return

    if (hasPermission(resource, action)) {
      await handleRevokePermission(selectedRole, permission.id)
    } else {
      await handleAssignPermission(selectedRole, permission.id)
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <>
      <ConfirmDialog />
      <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">角色和权限管理</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCreatePermission}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            title="创建新的权限项（如资产读取、用户管理等）"
          >
            <span>🔑</span>
            <span>新建权限</span>
          </button>
          <button
            onClick={handleCreateRole}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="创建新的用户角色"
          >
            <span>➕</span>
            <span>新建角色</span>
          </button>
        </div>
      </div>

      {showRoleForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-xl font-semibold mb-4">
            {editingRole ? '编辑角色' : '新建角色'}
          </h2>
          <form onSubmit={handleSubmitRole} className="space-y-4">
            <div>
              <label className="block mb-1">角色名称</label>
              <input
                type="text"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">描述</label>
              <textarea
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={3}
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
                onClick={() => setShowRoleForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {showPermissionForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-xl font-semibold mb-4">新建权限</h2>
          <form onSubmit={handleSubmitPermission} className="space-y-4">
            <div>
              <label className="block mb-1">权限名称</label>
              <input
                type="text"
                value={permissionFormData.name}
                onChange={(e) => setPermissionFormData({ ...permissionFormData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例如：查看资产管理"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">资源 (Resource)</label>
                <select
                  value={permissionFormData.resource}
                  onChange={(e) => setPermissionFormData({ ...permissionFormData, resource: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">选择资源</option>
                  {RESOURCE_GROUPS.map((group) => (
                    <option key={group.resource} value={group.resource}>
                      {group.label} ({group.resource})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1">操作 (Action)</label>
                <select
                  value={permissionFormData.action}
                  onChange={(e) => setPermissionFormData({ ...permissionFormData, action: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">选择操作</option>
                  <option value="view">查看 (view)</option>
                  <option value="create">创建 (create)</option>
                  <option value="update">编辑 (update)</option>
                  <option value="delete">删除 (delete)</option>
                  <option value="read">读取 (read)</option>
                  <option value="connect">连接 (connect)</option>
                  <option value="assign">分配 (assign)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">角色列表</h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`p-4 border rounded cursor-pointer ${
                  selectedRole === role.id ? 'bg-blue-50 border-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedRole(role.id)
                  loadRolePermissions(role.id)
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditRole(role)
                      }}
                      className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      title={`编辑角色: ${role.name}`}
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRole(role.id)
                      }}
                      className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300 transition-colors"
                      title={`删除角色: ${role.name}（此操作不可恢复）`}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedRole && (
          <div>
            <h2 className="text-xl font-semibold mb-4">权限管理</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {RESOURCE_GROUPS.map((group) => {
                const groupPermissions = permissionsByResource[group.resource] || []
                const assignedPermissions = rolePermissionsByResource[group.resource] || []

                if (groupPermissions.length === 0) return null

                return (
                  <div key={group.resource} className="border rounded p-4">
                    <div className="flex items-center mb-3">
                      <span className="text-xl mr-2">{group.icon}</span>
                      <h3 className="font-semibold text-lg">{group.label}</h3>
                      <span className="ml-2 text-sm text-gray-500">
                        ({assignedPermissions.length}/{groupPermissions.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {groupPermissions.map((permission) => {
                        const isAssigned = hasPermission(permission.resource, permission.action)
                        return (
                          <div
                            key={permission.id}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              isAssigned
                                ? 'bg-blue-50 border-blue-500'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => togglePermission(permission.resource, permission.action)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => togglePermission(permission.resource, permission.action)}
                                    className="mr-2"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={`font-medium ${isAssigned ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {permission.name}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 ml-6">
                                  {permission.resource}.{permission.action}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {Object.keys(permissionsByResource).length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无权限，请先创建权限</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

