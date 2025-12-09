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

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' })
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    fetchProjects()
  }, [page])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/projects?page=${page}&limit=20`)
      setProjects(response.data.data || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error('加载项目失败:', error)
      toast({ title: '错误', description: '加载项目列表失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '', status: 'active' })
    setShowForm(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, formData)
        toast({ title: '成功', description: '项目更新成功', variant: 'success' })
      } else {
        await api.post('/projects', formData)
        toast({ title: '成功', description: '项目创建成功', variant: 'success' })
      }
      setShowForm(false)
      fetchProjects()
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('确认删除', '确定要删除这个项目吗？此操作不可恢复。')
    if (!confirmed) return

    try {
      await api.delete(`/projects/${id}`)
      toast({ title: '成功', description: '项目删除成功', variant: 'success' })
      fetchProjects()
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '删除失败', variant: 'error' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'inactive':
        return '停用'
      case 'archived':
        return '归档'
      default:
        return status
    }
  }

  return (
    <>
      <ConfirmDialog />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">项目管理</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="创建新的项目"
          >
            <span>➕</span>
            <span>新建项目</span>
          </button>
        </div>

        {/* 创建/编辑表单 */}
        {showForm && (
          <div className="mb-6 p-4 border rounded bg-white">
            <h2 className="text-xl font-semibold mb-4">
              {editingProject ? '编辑项目' : '新建项目'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">项目名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                  <option value="archived">归档</option>
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

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <>
            <div className="bg-white border rounded overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">项目名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">描述</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{project.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {project.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(project.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/projects/${project.id}/permissions`)}
                            className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            title={`管理 "${project.name}" 的项目权限`}
                          >
                            🔒 权限
                          </button>
                          <button
                            onClick={() => navigate(`/assets?project=${project.id}`)}
                            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            title={`查看 "${project.name}" 下的所有资产`}
                          >
                            📦 资产
                          </button>
                          <button
                            onClick={() => handleEdit(project)}
                            className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            title={`编辑项目: ${project.name}`}
                          >
                            ✏️ 编辑
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            title={`删除项目: ${project.name}（此操作不可恢复）`}
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

            {/* 分页 */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                共 {total} 条记录，第 {page} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

