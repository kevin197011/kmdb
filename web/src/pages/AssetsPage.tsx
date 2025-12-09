import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import AssetForm from '../components/AssetForm'

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  type: string
  name: string
  status: string
  project_id?: string
  project?: Project
  ssh_port?: number
  ip?: string
  os?: string
  cpu?: string
  memory?: string
  disk?: string
  location?: string
  department?: string
  cloud_platform?: string
  remark?: string
  created_at: string
  updated_at: string
}

const CLOUD_PLATFORM_LABELS: Record<string, string> = {
  'self-hosted': '自建机房',
  'aliyun': '阿里云',
  'tencent': '腾讯云',
  'huawei': '华为云',
  'aws': 'AWS',
  'azure': 'Azure',
  'gcp': 'Google Cloud',
  'other': '其他',
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  'active': { text: '运行中', color: 'bg-green-100 text-green-800' },
  'inactive': { text: '已停止', color: 'bg-gray-100 text-gray-800' },
  'maintenance': { text: '维护中', color: 'bg-yellow-100 text-yellow-800' },
}

const TYPE_LABELS: Record<string, string> = {
  'server': '服务器',
  'vm': '虚拟机',
  'network_device': '网络设备',
  'application': '应用',
}

export default function AssetsPage() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    project_id: '',
  })
  const [searchTerm, setSearchTerm] = useState('') // 搜索关键词
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'group'>('group') // 默认按项目分组

  useEffect(() => {
    fetchProjects()
    fetchAssets()
  }, [page, filters])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?page=1&limit=1000')
      setProjects(response.data.data || [])
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '1000', // 获取更多数据用于分组
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      })
      const response = await api.get(`/assets?${params}`)
      setAssets(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }

  // 根据搜索关键词过滤资产（按主机名或IP模糊匹配）
  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm.trim()) return true
    const keyword = searchTerm.toLowerCase().trim()
    const nameMatch = asset.name?.toLowerCase().includes(keyword)
    const ipMatch = asset.ip?.toLowerCase().includes(keyword)
    return nameMatch || ipMatch
  })

  // 按项目分组资产（使用过滤后的数据）
  const assetsByProject = filteredAssets.reduce((acc, asset) => {
    const projectId = asset.project_id || 'unassigned'
    const projectName = asset.project?.name || '未分类'
    if (!acc[projectId]) {
      acc[projectId] = {
        project: asset.project || { id: projectId, name: projectName },
        assets: [],
      }
    }
    acc[projectId].assets.push(asset)
    return acc
  }, {} as Record<string, { project: Project; assets: Asset[] }>)

  const projectGroups = Object.values(assetsByProject).sort((a, b) =>
    a.project.name.localeCompare(b.project.name)
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const renderStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { text: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">资产管理</h1>
        <div className="flex gap-2">
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('group')}
              className={`px-4 py-2 ${
                viewMode === 'group'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              按项目分组
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              列表视图
            </button>
          </div>
          <button
            onClick={() => {
              setEditingAsset(null)
              setShowForm(true)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
            title="创建新的资产记录"
          >
            <span>➕</span>
            <span>新建资产</span>
          </button>
        </div>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">
              {editingAsset ? '编辑资产' : '新建资产'}
            </h2>
            <AssetForm
              asset={editingAsset || undefined}
              onSuccess={() => {
                setShowForm(false)
                setEditingAsset(null)
                fetchAssets()
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingAsset(null)
              }}
            />
          </div>
        </div>
      )}

      {/* 搜索和过滤器 */}
      <div className="mb-6 flex gap-4 flex-wrap items-center">
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 搜索主机名或IP..."
            className="px-4 py-2 border rounded w-64 pr-8"
            title="按主机名或IP地址模糊搜索"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="清除搜索"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={filters.project_id}
          onChange={(e) => handleFilterChange('project_id', e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有类型</option>
          <option value="server">服务器</option>
          <option value="vm">虚拟机</option>
          <option value="network_device">网络设备</option>
          <option value="application">应用</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有状态</option>
          <option value="active">运行中</option>
          <option value="inactive">已停止</option>
          <option value="maintenance">维护中</option>
        </select>

        {/* 搜索结果统计 */}
        {searchTerm && (
          <span className="text-sm text-gray-500">
            找到 {filteredAssets.length} 条结果
          </span>
        )}
      </div>

      {/* 资产列表 */}
      {loading ? (
        <div>加载中...</div>
      ) : viewMode === 'group' ? (
        /* 按项目分组显示 */
        <div className="space-y-6">
          {projectGroups.map((group) => (
            <div key={group.project.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{group.project.name}</h2>
                  <span className="text-sm text-gray-600">
                    ({group.assets.length} 台)
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/projects/${group.project.id}/permissions`)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  项目权限
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-50 text-sm">
                      <th className="px-3 py-2 border text-left">名称</th>
                      <th className="px-3 py-2 border text-left">IP</th>
                      <th className="px-3 py-2 border text-left">类型</th>
                      <th className="px-3 py-2 border text-left">状态</th>
                      <th className="px-3 py-2 border text-left">云平台</th>
                      <th className="px-3 py-2 border text-left">配置</th>
                      <th className="px-3 py-2 border text-left">位置</th>
                      <th className="px-3 py-2 border text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50 text-sm">
                        <td className="px-3 py-2 border">
                          <div className="font-medium">{asset.name}</div>
                          {asset.department && (
                            <div className="text-xs text-gray-500">{asset.department}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 border">
                          <span className="font-mono text-sm">{asset.ip || '-'}</span>
                          {asset.ssh_port && asset.ssh_port !== 22 && (
                            <span className="text-xs text-gray-500 ml-1">:{asset.ssh_port}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border">{TYPE_LABELS[asset.type] || asset.type}</td>
                        <td className="px-3 py-2 border">{renderStatusBadge(asset.status)}</td>
                        <td className="px-3 py-2 border">
                          {asset.cloud_platform ? CLOUD_PLATFORM_LABELS[asset.cloud_platform] || asset.cloud_platform : '-'}
                        </td>
                        <td className="px-3 py-2 border">
                          <div className="text-xs space-y-0.5">
                            {asset.os && <div>OS: {asset.os}</div>}
                            {asset.cpu && <div>CPU: {asset.cpu}</div>}
                            {asset.memory && <div>内存: {asset.memory}</div>}
                            {asset.disk && <div>磁盘: {asset.disk}</div>}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-xs">{asset.location || '-'}</td>
                        <td className="px-3 py-2 border">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingAsset(asset)
                                setShowForm(true)
                              }}
                              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                              title={`编辑资产: ${asset.name}`}
                            >
                              ✏️ 编辑
                            </button>
                            <button
                              onClick={() => navigate(`/assets/${asset.id}/permissions`)}
                              className="px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs transition-colors"
                              title={`管理 ${asset.name} 的访问权限`}
                            >
                              🔒 权限
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="text-sm">
                  <th className="px-3 py-2 border text-left">名称</th>
                  <th className="px-3 py-2 border text-left">IP</th>
                  <th className="px-3 py-2 border text-left">类型</th>
                  <th className="px-3 py-2 border text-left">状态</th>
                  <th className="px-3 py-2 border text-left">项目</th>
                  <th className="px-3 py-2 border text-left">云平台</th>
                  <th className="px-3 py-2 border text-left">配置</th>
                  <th className="px-3 py-2 border text-left">位置</th>
                  <th className="px-3 py-2 border text-left">部门</th>
                  <th className="px-3 py-2 border text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 text-sm">
                    <td className="px-3 py-2 border font-medium">{asset.name}</td>
                    <td className="px-3 py-2 border">
                      <span className="font-mono">{asset.ip || '-'}</span>
                      {asset.ssh_port && asset.ssh_port !== 22 && (
                        <span className="text-xs text-gray-500 ml-1">:{asset.ssh_port}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border">{TYPE_LABELS[asset.type] || asset.type}</td>
                    <td className="px-3 py-2 border">{renderStatusBadge(asset.status)}</td>
                    <td className="px-3 py-2 border">{asset.project?.name || '-'}</td>
                    <td className="px-3 py-2 border">
                      {asset.cloud_platform ? CLOUD_PLATFORM_LABELS[asset.cloud_platform] || asset.cloud_platform : '-'}
                    </td>
                    <td className="px-3 py-2 border">
                      <div className="text-xs">
                        {asset.os && <span className="mr-2">OS: {asset.os}</span>}
                        {asset.cpu && <span className="mr-2">CPU: {asset.cpu}</span>}
                        {asset.memory && <span className="mr-2">内存: {asset.memory}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 border text-xs">{asset.location || '-'}</td>
                    <td className="px-3 py-2 border text-xs">{asset.department || '-'}</td>
                    <td className="px-3 py-2 border">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingAsset(asset)
                            setShowForm(true)
                          }}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                          title={`编辑资产: ${asset.name}`}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => navigate(`/assets/${asset.id}/permissions`)}
                          className="px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs transition-colors"
                          title={`管理 ${asset.name} 的访问权限`}
                        >
                          🔒 权限
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
            <div>
              共 {total} 条记录，第 {page} 页
            </div>
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
    </div>
  )
}
