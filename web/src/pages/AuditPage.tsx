import { useState, useEffect } from 'react'
import api from '../services/api'

interface AuditLog {
  id: string
  resource_type: string
  resource_id: string
  action: string
  user_id: string
  details: Record<string, any>
  created_at: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    user_id: '',
  })

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.action) params.append('action', filters.action)
      if (filters.user_id) params.append('user_id', filters.user_id)

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

  return (
    <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">审计日志</h1>

        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-lg font-semibold mb-4">筛选条件</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm">资源类型</label>
              <input
                type="text"
                value={filters.resource_type}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例如: asset, relation"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">操作</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例如: create, update, delete"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">用户ID</label>
              <input
                type="text"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="用户UUID"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <>
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      资源类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.resource_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <pre className="text-xs bg-gray-50 p-2 rounded max-w-md overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                共 {total} 条记录，第 {page} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(page + 1)}
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

