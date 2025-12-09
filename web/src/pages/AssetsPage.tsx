import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'
import { useConfirm } from '../hooks/use-confirm'
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'active': { label: '运行中', color: 'text-green-700', bg: 'bg-green-100' },
  'inactive': { label: '已停止', color: 'text-gray-600', bg: 'bg-gray-100' },
  'maintenance': { label: '维护中', color: 'text-yellow-700', bg: 'bg-yellow-100' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  'server': { label: '服务器', icon: '🖥️' },
  'vm': { label: '虚拟机', icon: '💻' },
  'network_device': { label: '网络设备', icon: '🔌' },
  'application': { label: '应用', icon: '📱' },
}

export default function AssetsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ type: '', status: '', project_id: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  useEffect(() => {
    fetchProjects()
    fetchAssets()
  }, [filters])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?limit=1000')
      setProjects(response.data.data || [])
    } catch {
      console.error('加载项目失败')
    }
  }

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      })
      const response = await api.get(`/assets?${params}`)
      setAssets(response.data.data || [])
    } catch {
      toast({ title: '加载失败', description: '无法加载资产列表', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 搜索过滤
  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm.trim()) return true
    const keyword = searchTerm.toLowerCase().trim()
    return (
      asset.name?.toLowerCase().includes(keyword) ||
      asset.ip?.toLowerCase().includes(keyword) ||
      asset.remark?.toLowerCase().includes(keyword)
    )
  })

  const handleDelete = async (asset: Asset) => {
    const confirmed = await confirm('确认删除', `确定要删除资产 "${asset.name}" 吗？此操作不可恢复。`)
    if (!confirmed) return
    try {
      await api.delete(`/assets/${asset.id}`)
      toast({ title: '成功', description: '资产已删除' })
      fetchAssets()
    } catch {
      toast({ title: '删除失败', description: '无法删除资产', variant: 'error' })
    }
  }

  const handleShowDetail = (asset: Asset) => {
    setDetailAsset(asset)
    setShowDetailModal(true)
  }

  const renderStatus = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
        {config.label}
      </span>
    )
  }

  const renderType = (type: string) => {
    const config = TYPE_CONFIG[type] || { label: type, icon: '📦' }
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  return (
    <div className="container mx-auto p-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">资产管理</h1>
          <p className="text-gray-500 mt-1">管理服务器、虚拟机、网络设备等 IT 资产</p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setShowForm(true) }}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          + 新建资产
        </button>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex gap-4 flex-wrap items-center">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索主机名、IP 或备注..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>

            {/* 项目过滤 */}
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">📁 所有项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* 类型过滤 */}
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">🖥️ 所有类型</option>
              <option value="server">服务器</option>
              <option value="vm">虚拟机</option>
              <option value="network_device">网络设备</option>
              <option value="application">应用</option>
            </select>

            {/* 状态过滤 */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">🔄 所有状态</option>
              <option value="active">运行中</option>
              <option value="inactive">已停止</option>
              <option value="maintenance">维护中</option>
            </select>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-gray-900">{filteredAssets.length}</span> 个资产
            {searchTerm && <span className="text-blue-600 ml-2">· 匹配 "{searchTerm}"</span>}
          </span>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              运行中 {filteredAssets.filter(a => a.status === 'active').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              维护中 {filteredAssets.filter(a => a.status === 'maintenance').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              已停止 {filteredAssets.filter(a => a.status === 'inactive').length}
            </span>
          </div>
        </div>
      </div>

      {/* 资产表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <div>加载中...</div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <div className="text-5xl mb-4">📦</div>
          <div className="text-gray-500 mb-4">暂无资产数据</div>
          <button
            onClick={() => { setEditingAsset(null); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建第一个资产
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">资产名称</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP 地址</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">类型</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">所属项目</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">云平台</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">配置</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">位置</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.map((asset, index) => (
                  <tr
                    key={asset.id}
                    className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    {/* 资产名称 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                          asset.type === 'server' ? 'bg-blue-100' :
                          asset.type === 'vm' ? 'bg-purple-100' :
                          asset.type === 'network_device' ? 'bg-green-100' :
                          'bg-orange-100'
                        }`}>
                          {TYPE_CONFIG[asset.type]?.icon || '📦'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{asset.name}</div>
                          {asset.department && (
                            <div className="text-xs text-gray-500">{asset.department}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP 地址 */}
                    <td className="px-4 py-3.5">
                      {asset.ip ? (
                        <div className="font-mono text-sm">
                          <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">{asset.ip}</span>
                          {asset.ssh_port && asset.ssh_port !== 22 && (
                            <span className="text-gray-400 ml-1">:{asset.ssh_port}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* 类型 */}
                    <td className="px-4 py-3.5">
                      {renderType(asset.type)}
                    </td>

                    {/* 状态 */}
                    <td className="px-4 py-3.5">
                      {renderStatus(asset.status)}
                    </td>

                    {/* 所属项目 */}
                    <td className="px-4 py-3.5">
                      {asset.project ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                          📁 {asset.project.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">未分配</span>
                      )}
                    </td>

                    {/* 云平台 */}
                    <td className="px-4 py-3.5">
                      {asset.cloud_platform ? (
                        <span className="text-sm text-gray-700">
                          {CLOUD_PLATFORM_LABELS[asset.cloud_platform] || asset.cloud_platform}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* 配置 */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {asset.os && <div className="truncate max-w-[120px]" title={asset.os}>{asset.os}</div>}
                        {asset.cpu && <div>{asset.cpu}</div>}
                        {asset.memory && <div>{asset.memory}</div>}
                        {!asset.os && !asset.cpu && !asset.memory && <span className="text-gray-400">-</span>}
                      </div>
                    </td>

                    {/* 位置 */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{asset.location || '-'}</span>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleShowDetail(asset)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          👁️
                        </button>
                        {asset.ip && (
                          <button
                            onClick={() => navigate('/webssh')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="SSH 连接"
                          >
                            💻
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingAsset(asset); setShowForm(true) }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(asset)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建/编辑表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">
                {editingAsset ? '编辑资产' : '新建资产'}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <AssetForm
                asset={editingAsset || undefined}
                onSuccess={() => {
                  setShowForm(false)
                  setEditingAsset(null)
                  fetchAssets()
                  toast({ title: '成功', description: editingAsset ? '资产已更新' : '资产已创建' })
                }}
                onCancel={() => {
                  setShowForm(false)
                  setEditingAsset(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 资产详情弹窗 */}
      {showDetailModal && detailAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{TYPE_CONFIG[detailAsset.type]?.icon || '📦'}</span>
                  <span>{detailAsset.name}</span>
                </h2>
                {renderStatus(detailAsset.status)}
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* 基本信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">资产名称</div>
                    <div className="font-medium text-gray-900">{detailAsset.name}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">资产类型</div>
                    <div className="font-medium text-gray-900">{renderType(detailAsset.type)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">所属项目</div>
                    <div className="font-medium text-gray-900">
                      {detailAsset.project ? (
                        <span className="inline-flex items-center gap-1 text-blue-700">
                          📁 {detailAsset.project.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">未分配</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <div className="font-medium">{renderStatus(detailAsset.status)}</div>
                  </div>
                </div>
              </div>

              {/* 网络信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">网络信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">IP 地址</div>
                    <div className="font-medium text-gray-900 font-mono">
                      {detailAsset.ip ? (
                        <span className="bg-gray-200 px-2 py-0.5 rounded">{detailAsset.ip}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">SSH 端口</div>
                    <div className="font-medium text-gray-900 font-mono">
                      {detailAsset.ssh_port || 22}
                    </div>
                  </div>
                </div>
              </div>

              {/* 硬件配置 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">硬件配置</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">操作系统</div>
                    <div className="font-medium text-gray-900">{detailAsset.os || <span className="text-gray-400">-</span>}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">CPU</div>
                    <div className="font-medium text-gray-900">{detailAsset.cpu || <span className="text-gray-400">-</span>}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">内存</div>
                    <div className="font-medium text-gray-900">{detailAsset.memory || <span className="text-gray-400">-</span>}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">磁盘</div>
                    <div className="font-medium text-gray-900">{detailAsset.disk || <span className="text-gray-400">-</span>}</div>
                  </div>
                </div>
              </div>

              {/* 位置信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">位置信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">云平台</div>
                    <div className="font-medium text-gray-900">
                      {detailAsset.cloud_platform ? CLOUD_PLATFORM_LABELS[detailAsset.cloud_platform] || detailAsset.cloud_platform : <span className="text-gray-400">-</span>}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">物理位置</div>
                    <div className="font-medium text-gray-900">{detailAsset.location || <span className="text-gray-400">-</span>}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">所属部门</div>
                    <div className="font-medium text-gray-900">{detailAsset.department || <span className="text-gray-400">-</span>}</div>
                  </div>
                </div>
              </div>

              {/* 备注 */}
              {detailAsset.remark && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">备注</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-700 whitespace-pre-wrap">{detailAsset.remark}</div>
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">时间信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">创建时间</div>
                    <div className="font-medium text-gray-900 text-sm">{formatDate(detailAsset.created_at)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">更新时间</div>
                    <div className="font-medium text-gray-900 text-sm">{formatDate(detailAsset.updated_at)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
              <div className="flex gap-2">
                {detailAsset.ip && (
                  <button
                    onClick={() => { setShowDetailModal(false); navigate('/webssh') }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    💻 SSH 连接
                  </button>
                )}
                <button
                  onClick={() => { setShowDetailModal(false); setEditingAsset(detailAsset); setShowForm(true) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  ✏️ 编辑
                </button>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
