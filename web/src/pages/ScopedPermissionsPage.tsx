import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Role {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
}

interface User {
  id: string
  username: string
}

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
}

interface ScopedPermission {
  id: string
  subject_type: string
  subject_id: string
  resource_type: string
  resource_id: string | null
  action: string
  created_at: string
}

interface PermissionSummary {
  is_super_admin: boolean
  is_admin: boolean
  roles: string[]
  teams: string[]
  function_permissions: string[]
  accessible_projects: string[]
}

const SUBJECT_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'role', label: '角色' },
  { value: 'team', label: '团队' },
]

const RESOURCE_TYPES = [
  { value: '*', label: '所有资源' },
  { value: 'asset', label: '资产' },
  { value: 'project', label: '项目' },
  { value: 'user', label: '用户管理' },
  { value: 'team', label: '团队管理' },
  { value: 'role', label: '角色管理' },
  { value: 'audit', label: '审计日志' },
  { value: 'token', label: 'API Token' },
]

const ACTIONS = [
  { value: '*', label: '所有操作' },
  { value: 'view', label: '查看' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'connect', label: '连接(SSH)' },
  { value: 'manage', label: '管理' },
]

export default function ScopedPermissionsPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [myPermissions, setMyPermissions] = useState<PermissionSummary | null>(null)
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [subjectPermissions, setSubjectPermissions] = useState<ScopedPermission[]>([])
  const [selectedSubject, setSelectedSubject] = useState<{ type: string; id: string } | null>(null)

  const [formData, setFormData] = useState({
    subject_type: 'role',
    subject_id: '',
    resource_type: '*',
    resource_id: '',
    action: '*',
  })

  useEffect(() => {
    fetchMyPermissions()
    fetchRoles()
    fetchTeams()
    fetchUsers()
    fetchProjects()
    fetchAssets()
  }, [])

  const fetchMyPermissions = async () => {
    try {
      const response = await api.get('/scoped-permissions/my')
      setMyPermissions(response.data)
    } catch {
      console.error('获取权限摘要失败')
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles')
      setRoles(response.data.data || [])
    } catch {
      console.error('获取角色列表失败')
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams')
      setTeams(response.data.data || [])
    } catch {
      console.error('获取团队列表失败')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?limit=1000')
      setUsers(response.data.data || [])
    } catch {
      console.error('获取用户列表失败')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?limit=1000')
      setProjects(response.data.data || [])
    } catch {
      console.error('获取项目列表失败')
    }
  }

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets?limit=1000')
      setAssets(response.data.data || [])
    } catch {
      console.error('获取资产列表失败')
    }
  }

  const fetchSubjectPermissions = async (subjectType: string, subjectId: string) => {
    try {
      const response = await api.get(`/scoped-permissions/subject?subject_type=${subjectType}&subject_id=${subjectId}`)
      setSubjectPermissions(response.data.data || [])
      setSelectedSubject({ type: subjectType, id: subjectId })
    } catch {
      toast({ title: '加载失败', description: '无法加载权限列表', variant: 'error' })
    }
  }

  const handleGrant = async () => {
    if (!formData.subject_id) {
      toast({ title: '错误', description: '请选择授权对象', variant: 'error' })
      return
    }

    try {
      const payload = {
        subject_type: formData.subject_type,
        subject_id: formData.subject_id,
        resource_type: formData.resource_type,
        resource_id: formData.resource_id || null,
        action: formData.action,
      }
      await api.post('/scoped-permissions', payload)
      toast({ title: '成功', description: '权限已授予' })
      setShowGrantDialog(false)
      setFormData({ subject_type: 'role', subject_id: '', resource_type: '*', resource_id: '', action: '*' })

      // 刷新当前查看的权限列表
      if (selectedSubject) {
        fetchSubjectPermissions(selectedSubject.type, selectedSubject.id)
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '授权失败', description: err.response?.data?.error || '授予权限失败', variant: 'error' })
    }
  }

  const handleRevoke = async (permissionId: string) => {
    const confirmed = await confirm('确认撤销', '确定要撤销此权限吗？')
    if (!confirmed) return

    try {
      await api.delete(`/scoped-permissions/${permissionId}`)
      toast({ title: '成功', description: '权限已撤销' })

      if (selectedSubject) {
        fetchSubjectPermissions(selectedSubject.type, selectedSubject.id)
      }
    } catch {
      toast({ title: '撤销失败', description: '无法撤销权限', variant: 'error' })
    }
  }

  const getSubjectOptions = () => {
    switch (formData.subject_type) {
      case 'role':
        return roles.map(r => ({ value: r.id, label: r.name }))
      case 'team':
        return teams.map(t => ({ value: t.id, label: t.name }))
      case 'user':
        return users.map(u => ({ value: u.id, label: u.username }))
      default:
        return []
    }
  }

  const getResourceOptions = () => {
    if (formData.resource_type === '*' || !['asset', 'project'].includes(formData.resource_type)) {
      return []
    }
    if (formData.resource_type === 'asset') {
      return assets.map(a => ({ value: a.id, label: a.name }))
    }
    if (formData.resource_type === 'project') {
      return projects.map(p => ({ value: p.id, label: p.name }))
    }
    return []
  }

  const getResourceTypeName = (type: string) => {
    return RESOURCE_TYPES.find(r => r.value === type)?.label || type
  }

  const getActionName = (action: string) => {
    return ACTIONS.find(a => a.value === action)?.label || action
  }

  const getSubjectTypeName = (type: string) => {
    return SUBJECT_TYPES.find(s => s.value === type)?.label || type
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">权限管理</h1>
          <p className="text-gray-500 mt-1">统一管理用户、角色、团队的访问权限</p>
        </div>
        <button
          onClick={() => setShowGrantDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          title="授予新权限"
        >
          + 授予权限
        </button>
      </div>

      {/* 当前用户权限摘要 */}
      {myPermissions && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-3">我的权限摘要</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-blue-600 mb-1">身份</div>
              <div className="flex gap-2 flex-wrap">
                {myPermissions.is_super_admin && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">超级管理员</span>
                )}
                {myPermissions.is_admin && !myPermissions.is_super_admin && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">管理员</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-blue-600 mb-1">角色</div>
              <div className="flex gap-2 flex-wrap">
                {myPermissions.roles.map((role, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{role}</span>
                ))}
                {myPermissions.roles.length === 0 && <span className="text-gray-400 text-sm">无</span>}
              </div>
            </div>
            <div>
              <div className="text-sm text-blue-600 mb-1">团队</div>
              <div className="flex gap-2 flex-wrap">
                {myPermissions.teams.map((team, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{team}</span>
                ))}
                {myPermissions.teams.length === 0 && <span className="text-gray-400 text-sm">无</span>}
              </div>
            </div>
          </div>
          {myPermissions.function_permissions.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-blue-600 mb-1">功能权限</div>
              <div className="flex gap-2 flex-wrap">
                {myPermissions.function_permissions.map((perm, i) => (
                  <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{perm}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 权限查询 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：选择查询对象 */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-4">查询权限</h3>

            {/* 角色列表 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-600 mb-2">角色</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => fetchSubjectPermissions('role', role.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50 ${
                      selectedSubject?.type === 'role' && selectedSubject?.id === role.id
                        ? 'bg-blue-50 text-blue-700'
                        : ''
                    }`}
                  >
                    🔐 {role.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 团队列表 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-600 mb-2">团队</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => fetchSubjectPermissions('team', team.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50 ${
                      selectedSubject?.type === 'team' && selectedSubject?.id === team.id
                        ? 'bg-blue-50 text-blue-700'
                        : ''
                    }`}
                  >
                    👥 {team.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 用户列表 */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">用户</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {users.slice(0, 20).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => fetchSubjectPermissions('user', user.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50 ${
                      selectedSubject?.type === 'user' && selectedSubject?.id === user.id
                        ? 'bg-blue-50 text-blue-700'
                        : ''
                    }`}
                  >
                    👤 {user.username}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：权限列表 */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-4">
              {selectedSubject
                ? `${getSubjectTypeName(selectedSubject.type)} 的权限`
                : '请选择查询对象'}
            </h3>

            {selectedSubject ? (
              subjectPermissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-sm">资源类型</th>
                        <th className="px-4 py-2 text-left text-sm">资源</th>
                        <th className="px-4 py-2 text-left text-sm">操作</th>
                        <th className="px-4 py-2 text-left text-sm">创建时间</th>
                        <th className="px-4 py-2 text-left text-sm">管理</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectPermissions.map((perm) => (
                        <tr key={perm.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{getResourceTypeName(perm.resource_type)}</td>
                          <td className="px-4 py-2 text-sm">
                            {perm.resource_id
                              ? (perm.resource_type === 'project'
                                  ? projects.find(p => p.id === perm.resource_id)?.name
                                  : assets.find(a => a.id === perm.resource_id)?.name) || perm.resource_id
                              : '所有'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {getActionName(perm.action)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(perm.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => handleRevoke(perm.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              撤销
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">暂无权限记录</div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">点击左侧列表选择查询对象</div>
            )}
          </div>
        </div>
      </div>

      {/* 授权对话框 */}
      {showGrantDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">授予权限</h2>
              <div className="space-y-4">
                {/* 主体类型 */}
                <div>
                  <label className="block text-sm font-medium mb-1">授权对象类型 *</label>
                  <select
                    value={formData.subject_type}
                    onChange={(e) => setFormData({ ...formData, subject_type: e.target.value, subject_id: '' })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {SUBJECT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* 主体选择 */}
                <div>
                  <label className="block text-sm font-medium mb-1">授权对象 *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">请选择</option>
                    {getSubjectOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 资源类型 */}
                <div>
                  <label className="block text-sm font-medium mb-1">资源类型 *</label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value, resource_id: '' })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {RESOURCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* 资源选择（可选） */}
                {getResourceOptions().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">指定资源（留空表示所有）</label>
                    <select
                      value={formData.resource_id}
                      onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">所有 {getResourceTypeName(formData.resource_type)}</option>
                      {getResourceOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 操作 */}
                <div>
                  <label className="block text-sm font-medium mb-1">操作 *</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setShowGrantDialog(false); setFormData({ subject_type: 'role', subject_id: '', resource_type: '*', resource_id: '', action: '*' }); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleGrant}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  授权
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

