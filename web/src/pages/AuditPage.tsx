import { useState, useEffect } from 'react'
import api from '../services/api'

interface User {
  id: string
  username: string
}

interface AuditLog {
  id: string
  resource_type: string
  resource_id: string
  resource_name: string
  action: string
  user_id: string
  username: string
  details: Record<string, unknown>
  created_at: string
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: '创建', color: 'text-green-700', bg: 'bg-green-100' },
  update: { label: '更新', color: 'text-blue-700', bg: 'bg-blue-100' },
  delete: { label: '删除', color: 'text-red-700', bg: 'bg-red-100' },
  login: { label: '登录', color: 'text-purple-700', bg: 'bg-purple-100' },
  logout: { label: '登出', color: 'text-gray-700', bg: 'bg-gray-100' },
  connect: { label: '连接', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  disconnect: { label: '断开', color: 'text-orange-700', bg: 'bg-orange-100' },
}

const RESOURCE_CONFIG: Record<string, { label: string; icon: string }> = {
  asset: { label: '资产', icon: '📦' },
  project: { label: '项目', icon: '📁' },
  user: { label: '用户', icon: '👤' },
  role: { label: '角色', icon: '🔐' },
  team: { label: '团队', icon: '👥' },
  credential: { label: '凭证', icon: '🔑' },
  webssh: { label: 'WebSSH', icon: '💻' },
  token: { label: 'Token', icon: '🎫' },
  permission: { label: '权限', icon: '🛡️' },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    username: '',
  })
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadUsers = async () => {
    try {
      const response = await api.get('/audit-logs/users')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.action) params.append('action', filters.action)
      if (filters.username) params.append('username', filters.username)

      const response = await api.get(`/audit-logs?${params.toString()}`)
      setLogs(response.data.data || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error('加载审计日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action] || { label: action, color: 'text-gray-700', bg: 'bg-gray-100' }
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getResourceInfo = (resourceType: string) => {
    const config = RESOURCE_CONFIG[resourceType] || { label: resourceType, icon: '📄' }
    return config
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(1)
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">审计日志</h1>
          <p className="text-gray-500 mt-1">查看系统操作记录，追踪用户行为</p>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">资源类型</label>
              <select
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部类型</option>
                {Object.entries(RESOURCE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部操作</option>
                {Object.entries(ACTION_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">操作用户</label>
              <select
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部用户</option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
            {(filters.resource_type || filters.action || filters.username) && (
              <button
                onClick={() => {
                  setFilters({ resource_type: '', action: '', username: '' })
                  setPage(1)
                }}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-gray-900">{total}</span> 条记录，第 {page} 页
          </span>
          <div className="flex gap-3 text-xs">
            {Object.entries(ACTION_CONFIG).slice(0, 5).map(([key, config]) => (
              <span key={key} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${config.bg}`} />
                {config.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <div>加载中...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <div className="text-5xl mb-4">📋</div>
          <div className="text-gray-500">暂无审计日志记录</div>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">时间</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">资源类型</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">资源名称</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作用户</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, index) => {
                  const resourceInfo = getResourceInfo(log.resource_type)
                  const isExpanded = expandedLog === log.id

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600">{formatDate(log.created_at)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{resourceInfo.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{resourceInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{getActionBadge(log.action)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-gray-900">
                          {log.resource_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {log.username?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {log.username || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {isExpanded ? '收起 ▲' : '展开 ▼'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <pre className="text-xs text-gray-700 overflow-auto max-w-md whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分页 */}
      {!loading && logs.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            共 {total} 条记录，第 {page} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
