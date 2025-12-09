import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface UserGroup {
  id: string
  name: string
  description?: string
}

interface Role {
  id: string
  name: string
  description?: string
}

export default function GroupRolesPage() {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupRoles, setGroupRoles] = useState<Role[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadGroups()
    loadRoles()
  }, [])

  const loadGroups = async () => {
    try {
      const response = await api.get('/user-groups?page=1&limit=100')
      setGroups(response.data.data || [])
    } catch (error) {
      console.error('加载群组失败:', error)
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

  const loadGroupRoles = async (groupId: string) => {
    try {
      const response = await api.get(`/user-groups/${groupId}/roles`)
      setGroupRoles(response.data || [])
    } catch (error) {
      console.error('加载群组角色失败:', error)
    }
  }

  const handleAssignRole = async (groupId: string, roleId: string) => {
    try {
      await api.post(`/user-groups/${groupId}/roles`, { role_id: roleId })
      loadGroupRoles(groupId)
      toast({ title: '成功', description: '角色分配成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '分配角色失败', variant: 'error' })
    }
  }

  const handleRevokeRole = async (groupId: string, roleId: string) => {
    try {
      await api.delete(`/user-groups/${groupId}/roles/${roleId}`)
      loadGroupRoles(groupId)
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
      <h1 className="text-2xl font-bold mb-6">群组角色分配</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">群组列表</h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-4 border rounded cursor-pointer ${
                  selectedGroup === group.id ? 'bg-blue-50 border-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedGroup(group.id)
                  loadGroupRoles(group.id)
                }}
              >
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div>
            <h2 className="text-xl font-semibold mb-4">角色分配</h2>
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignRole(selectedGroup, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">选择角色分配给群组</option>
                {roles
                  .filter((r) => !groupRoles.some((gr) => gr.id === r.id))
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              {groupRoles.map((role) => (
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
                    onClick={() => handleRevokeRole(selectedGroup, role.id)}
                    className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                  >
                    撤销
                  </button>
                </div>
              ))}
              {groupRoles.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无角色</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

