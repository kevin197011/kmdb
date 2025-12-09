import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface UserGroup {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface User {
  id: string
  username: string
  email: string
  full_name?: string
}

export default function UserGroupsPage() {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    loadGroups()
    loadUsers()
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

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?page=1&limit=100')
      setAllUsers(response.data.data || [])
    } catch (error) {
      console.error('加载用户失败:', error)
    }
  }

  const loadMembers = async (groupId: string) => {
    try {
      const response = await api.get(`/user-groups/${groupId}/members`)
      setMembers(response.data || [])
    } catch (error) {
      console.error('加载成员失败:', error)
    }
  }

  const handleCreate = () => {
    setEditingGroup(null)
    setFormData({ name: '', description: '' })
    setShowForm(true)
  }

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group)
    setFormData({ name: group.name, description: group.description || '' })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingGroup) {
        await api.put(`/user-groups/${editingGroup.id}`, formData)
      } else {
        await api.post('/user-groups', formData)
      }
      setShowForm(false)
      loadGroups()
      toast({ title: '成功', description: editingGroup ? '群组更新成功' : '群组创建成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('确认删除', '确定要删除这个群组吗？此操作不可恢复。')
    if (!confirmed) return
    try {
      await api.delete(`/user-groups/${id}`)
      loadGroups()
      toast({ title: '成功', description: '群组删除成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '删除失败', variant: 'error' })
    }
  }

  const handleAddMember = async (groupId: string, userId: string) => {
    try {
      await api.post(`/user-groups/${groupId}/members`, { user_id: userId })
      loadMembers(groupId)
      toast({ title: '成功', description: '成员添加成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '添加成员失败', variant: 'error' })
    }
  }

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await api.delete(`/user-groups/${groupId}/members/${userId}`)
      loadMembers(groupId)
      toast({ title: '成功', description: '成员移除成功', variant: 'success' })
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '移除成员失败', variant: 'error' })
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
        <h1 className="text-2xl font-bold">用户群组管理</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          title="创建新的用户群组"
        >
          <span>➕</span>
          <span>新建群组</span>
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">
            {editingGroup ? '编辑群组' : '新建群组'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">群组名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                onClick={() => setShowForm(false)}
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
                  loadMembers(group.id)
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(group)
                      }}
                      className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      title={`编辑群组: ${group.name}`}
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(group.id)
                      }}
                      className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300 transition-colors"
                      title={`删除群组: ${group.name}（此操作不可恢复）`}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div>
            <h2 className="text-xl font-semibold mb-4">成员管理</h2>
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddMember(selectedGroup, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">选择用户添加到群组</option>
                {allUsers
                  .filter((user) => !members.some((m) => m.id === user.id))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{member.username}</div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(selectedGroup, member.id)}
                    className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                  >
                    移除
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无成员</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

