import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '活跃', color: 'text-green-700', bg: 'bg-green-100' },
  inactive: { label: '停用', color: 'text-gray-600', bg: 'bg-gray-100' },
  archived: { label: '归档', color: 'text-red-700', bg: 'bg-red-100' },
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' })
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchProjects()
    fetchAssetCounts()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get('/projects?limit=1000')
      setProjects(response.data.data || [])
    } catch {
      toast({ title: '加载失败', description: '无法加载项目列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAssetCounts = async () => {
    try {
      const response = await api.get('/assets/stats/project')
      const counts: Record<string, number> = {}
      ;(response.data || []).forEach((item: { project_id: string; count: number }) => {
        counts[item.project_id] = item.count
      })
      setAssetCounts(counts)
    } catch {
      console.error('加载资产统计失败')
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入项目名称', variant: 'error' })
      return
    }
    try {
      await api.post('/projects', formData)
      toast({ title: '成功', description: '项目创建成功' })
      setShowCreateDialog(false)
      setFormData({ name: '', description: '', status: 'active' })
      fetchProjects()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '创建失败', description: err.response?.data?.error || '创建项目失败', variant: 'error' })
    }
  }

  const handleUpdate = async () => {
    if (!selectedProject) return
    try {
      await api.put(`/projects/${selectedProject.id}`, formData)
      toast({ title: '成功', description: '项目更新成功' })
      setShowEditDialog(false)
      fetchProjects()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '更新失败', description: err.response?.data?.error || '更新项目失败', variant: 'error' })
    }
  }

  const handleDelete = async (project: Project) => {
    const confirmed = await confirm('确认删除', `确定要删除项目 "${project.name}" 吗？此操作不可恢复。`)
    if (!confirmed) return
    try {
      await api.delete(`/projects/${project.id}`)
      toast({ title: '成功', description: '项目已删除' })
      fetchProjects()
    } catch {
      toast({ title: '删除失败', description: '无法删除项目', variant: 'error' })
    }
  }

  const openEdit = (project: Project) => {
    setSelectedProject(project)
    setFormData({ name: project.name, description: project.description || '', status: project.status })
    setShowEditDialog(true)
  }

  const renderStatus = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'archived' ? 'bg-red-500' : 'bg-gray-400'}`} />
        {config.label}
      </span>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-500 mt-1">管理项目，项目用于组织和分组资产</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', description: '', status: 'active' }); setShowCreateDialog(true) }}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          + 新建项目
        </button>
      </div>

      {/* 搜索 */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="搜索项目名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* 统计信息 */}
        <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-gray-900">{filteredProjects.length}</span> 个项目
          </span>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              活跃 {filteredProjects.filter(p => p.status === 'active').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              停用 {filteredProjects.filter(p => p.status === 'inactive').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              归档 {filteredProjects.filter(p => p.status === 'archived').length}
            </span>
          </div>
        </div>
      </div>

      {/* 项目表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <div>加载中...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <div className="text-5xl mb-4">📁</div>
          <div className="text-gray-500 mb-4">暂无项目数据</div>
          <button
            onClick={() => { setFormData({ name: '', description: '', status: 'active' }); setShowCreateDialog(true) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">项目名称</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">描述</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">资产数量</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">创建时间</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((project, index) => {
                  const count = assetCounts[project.id] || 0
                  return (
                    <tr
                      key={project.id}
                      className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      {/* 项目名称 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg">
                            📁
                          </div>
                          <div className="font-medium text-gray-900">{project.name}</div>
                        </div>
                      </td>

                      {/* 描述 */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                          {project.description || <span className="text-gray-400">暂无描述</span>}
                        </span>
                      </td>

                      {/* 状态 */}
                      <td className="px-4 py-3.5">
                        {renderStatus(project.status)}
                      </td>

                      {/* 资产数量 */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                          count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          📦 {count} 个
                        </span>
                      </td>

                      {/* 创建时间 */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600">
                          {new Date(project.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/assets?project_id=${project.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看资产"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => openEdit(project)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建项目对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">新建项目</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="如：生产环境、测试环境"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="项目的用途说明"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                  <option value="archived">归档</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowCreateDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑项目对话框 */}
      {showEditDialog && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">编辑项目</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                  <option value="archived">归档</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowEditDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
