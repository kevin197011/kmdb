import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface DashboardStats {
  overview: {
    total_assets: number
    total_users: number
    total_projects: number
    total_groups: number
    total_roles: number
  }
  assets_by_status: {
    active: number
    inactive: number
    maintenance: number
  }
  assets_by_type: Record<string, number>
  project_distribution: Record<string, number>
  recent_activities: Array<{
    id: string
    module: string
    action: string
    user_id: string
    resource_id: string
    details: string
    created_at: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      toast({ title: '错误', description: '加载统计数据失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '运行中'
      case 'inactive':
        return '已停止'
      case 'maintenance':
        return '维护中'
      default:
        return status
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      server: '服务器',
      vm: '虚拟机',
      network_device: '网络设备',
      application: '应用',
    }
    return labels[type] || type
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      connect: '连接',
      view: '查看',
    }
    return labels[action] || action
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-red-500">加载统计数据失败</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">仪表盘</h1>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">资产总数</p>
              <p className="text-3xl font-bold text-blue-600">{stats.overview.total_assets}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">用户总数</p>
              <p className="text-3xl font-bold text-green-600">{stats.overview.total_users}</p>
            </div>
            <div className="text-4xl">👤</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">项目总数</p>
              <p className="text-3xl font-bold text-purple-600">{stats.overview.total_projects}</p>
            </div>
            <div className="text-4xl">📁</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">用户群组</p>
              <p className="text-3xl font-bold text-orange-600">{stats.overview.total_groups}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">角色总数</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.overview.total_roles}</p>
            </div>
            <div className="text-4xl">🔐</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 资产状态分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">资产状态分布</h2>
          <div className="space-y-3">
            {Object.entries(stats.assets_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded border text-sm font-medium ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'active'
                          ? 'bg-green-500'
                          : status === 'inactive'
                          ? 'bg-gray-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{
                        width: `${
                          stats.overview.total_assets > 0
                            ? (count / stats.overview.total_assets) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-lg font-semibold w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 资产类型分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">资产类型分布</h2>
          <div className="space-y-3">
            {Object.entries(stats.assets_by_type)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getTypeLabel(type)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            stats.overview.total_assets > 0
                              ? (count / stats.overview.total_assets) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-lg font-semibold w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {Object.keys(stats.assets_by_type).length === 0 && (
              <p className="text-gray-500 text-center py-4">暂无数据</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目资产分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">项目资产分布</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(stats.project_distribution)
              .sort((a, b) => b[1] - a[1])
              .map(([project, count]) => (
                <div key={project} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm font-medium">{project}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${
                            stats.overview.total_assets > 0
                              ? (count / stats.overview.total_assets) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-lg font-semibold w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {Object.keys(stats.project_distribution).length === 0 && (
              <p className="text-gray-500 text-center py-4">暂无数据</p>
            )}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">最近活动</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recent_activities && stats.recent_activities.length > 0 ? (
              stats.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {activity.module}
                        </span>
                        <span className="text-sm font-medium">{getActionLabel(activity.action)}</span>
                      </div>
                      {activity.details && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{activity.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">暂无活动</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

