import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface User {
  id: string
  username: string
  email: string
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  created_at: string
  user?: User
}

interface Team {
  id: string
  name: string
  description: string
  created_at: string
  members?: TeamMember[]
}

const TEAM_ROLES = [
  { value: 'owner', label: '所有者', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: '管理员', color: 'bg-blue-100 text-blue-800' },
  { value: 'member', label: '成员', color: 'bg-gray-100 text-gray-800' },
]

export default function TeamsPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [memberFormData, setMemberFormData] = useState({ user_id: '', role: 'member' })

  useEffect(() => {
    fetchTeams()
    fetchUsers()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const response = await api.get('/teams')
      setTeams(response.data.data || [])
    } catch {
      toast({ title: '加载失败', description: '无法加载团队列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?limit=1000')
      setUsers(response.data.data || [])
    } catch {
      console.error('加载用户列表失败')
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入团队名称', variant: 'error' })
      return
    }

    try {
      await api.post('/teams', formData)
      fetchTeams()
      setShowCreateDialog(false)
      setFormData({ name: '', description: '' })
      toast({ title: '成功', description: '团队创建成功' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建团队失败', variant: 'error' })
    }
  }

  const handleDelete = async (team: Team) => {
    const confirmed = await confirm('确认删除', `确定要删除团队 "${team.name}" 吗？`)
    if (!confirmed) return

    try {
      await api.delete(`/teams/${team.id}`)
      fetchTeams()
      toast({ title: '成功', description: '团队已删除' })
    } catch {
      toast({ title: '删除失败', description: '无法删除团队', variant: 'error' })
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam || !memberFormData.user_id) {
      toast({ title: '错误', description: '请选择用户', variant: 'error' })
      return
    }

    try {
      await api.post(`/teams/${selectedTeam.id}/members`, memberFormData)
      fetchTeams()
      setShowMemberDialog(false)
      setMemberFormData({ user_id: '', role: 'member' })
      toast({ title: '成功', description: '成员已添加' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '添加失败', description: err.response?.data?.error || '添加成员失败', variant: 'error' })
    }
  }

  const handleRemoveMember = async (team: Team, member: TeamMember) => {
    const confirmed = await confirm('确认移除', `确定要将 "${member.user?.username}" 从团队中移除吗？`)
    if (!confirmed) return

    try {
      await api.delete(`/teams/${team.id}/members/${member.user_id}`)
      fetchTeams()
      toast({ title: '成功', description: '成员已移除' })
    } catch {
      toast({ title: '移除失败', description: '无法移除成员', variant: 'error' })
    }
  }

  const getRoleBadge = (role: string) => {
    const roleInfo = TEAM_ROLES.find(r => r.value === role) || TEAM_ROLES[2]
    return <span className={`px-2 py-1 rounded-full text-xs ${roleInfo.color}`}>{roleInfo.label}</span>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">团队管理</h1>
          <p className="text-gray-500 mt-1">管理团队和团队成员，为团队分配权限</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          title="创建新团队"
        >
          + 新建团队
        </button>
      </div>

      {/* 团队列表 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无团队，点击"新建团队"创建</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{team.description || '暂无描述'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedTeam(team); setShowMemberDialog(true); }}
                      className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      title="添加成员"
                    >
                      + 成员
                    </button>
                    <button
                      onClick={() => handleDelete(team)}
                      className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      title="删除团队"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  成员 ({team.members?.length || 0})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {team.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.user?.username}</span>
                        {getRoleBadge(member.role)}
                      </div>
                      <button
                        onClick={() => handleRemoveMember(team, member)}
                        className="text-red-500 hover:text-red-600 text-sm"
                        title="移除成员"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <div className="text-sm text-gray-400 text-center py-2">暂无成员</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建团队对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">新建团队</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">团队名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入团队名称"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入团队描述"
                    rows={3}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setShowCreateDialog(false); setFormData({ name: '', description: '' }); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加成员对话框 */}
      {showMemberDialog && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">添加成员到 {selectedTeam.name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">选择用户 *</label>
                  <select
                    value={memberFormData.user_id}
                    onChange={(e) => setMemberFormData({ ...memberFormData, user_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">请选择用户</option>
                    {users.filter(u => !selectedTeam.members?.some(m => m.user_id === u.id)).map((user) => (
                      <option key={user.id} value={user.id}>{user.username} ({user.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">角色</label>
                  <select
                    value={memberFormData.role}
                    onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {TEAM_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setShowMemberDialog(false); setMemberFormData({ user_id: '', role: 'member' }); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

