import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Select,
  Space,
  Tag,
  Typography,
  Avatar,
  Button
} from 'antd'
import {
  DatabaseOutlined,
  FolderOutlined,
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
  KeyOutlined,
  CodeOutlined,
  ApiOutlined,
  LockOutlined,
  FileOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography

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

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  create: { label: '创建', color: 'green' },
  update: { label: '更新', color: 'blue' },
  delete: { label: '删除', color: 'red' },
  login: { label: '登录', color: 'purple' },
  logout: { label: '登出', color: 'default' },
  connect: { label: '连接', color: 'cyan' },
  disconnect: { label: '断开', color: 'orange' },
}

const RESOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  asset: { label: '资产', icon: <DatabaseOutlined /> },
  project: { label: '项目', icon: <FolderOutlined /> },
  user: { label: '用户', icon: <UserOutlined /> },
  role: { label: '角色', icon: <SafetyOutlined /> },
  team: { label: '团队', icon: <TeamOutlined /> },
  credential: { label: '凭证', icon: <KeyOutlined /> },
  webssh: { label: 'WebSSH', icon: <CodeOutlined /> },
  token: { label: 'Token', icon: <ApiOutlined /> },
  permission: { label: '权限', icon: <LockOutlined /> },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    username: '',
  })
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [page, pageSize, filters])

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
        limit: pageSize.toString(),
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(1)
  }

  const getResourceInfo = (resourceType: string) => {
    return RESOURCE_CONFIG[resourceType] || { label: resourceType, icon: <FileOutlined /> }
  }

  const getAvatarColor = (username: string) => {
    if (!username) return '#d9d9d9'
    const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2']
    const index = username.charCodeAt(0) % colors.length
    return colors[index]
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (
        <Text type="secondary">{new Date(text).toLocaleString('zh-CN')}</Text>
      ),
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 120,
      render: (type: string) => {
        const info = getResourceInfo(type)
        return (
          <Space>
            {info.icon}
            <span>{info.label}</span>
          </Space>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => {
        const config = ACTION_CONFIG[action] || { label: action, color: 'default' }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '资源名称',
      dataIndex: 'resource_name',
      key: 'resource_name',
      ellipsis: true,
      render: (name: string) => <Text strong>{name || '-'}</Text>,
    },
    {
      title: '操作用户',
      key: 'user',
      width: 150,
      render: (_, record) => (
        <Space>
          <Avatar
            size="small"
            style={{ backgroundColor: getAvatarColor(record.username) }}
          >
            {record.username?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Text>{record.username || '-'}</Text>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>审计日志</Title>
            <Text type="secondary">查看系统操作记录，追踪用户行为</Text>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setFilters({ resource_type: '', action: '', username: '' })
              setPage(1)
            }}
          >
            重置筛选
          </Button>
        }
      >
        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="资源类型"
            value={filters.resource_type || undefined}
            onChange={(value) => handleFilterChange('resource_type', value || '')}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(RESOURCE_CONFIG).map(([value, config]) => (
              <Select.Option key={value} value={value}>
                <Space>{config.icon} {config.label}</Space>
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="操作类型"
            value={filters.action || undefined}
            onChange={(value) => handleFilterChange('action', value || '')}
            style={{ width: 120 }}
            allowClear
          >
            {Object.entries(ACTION_CONFIG).map(([value, config]) => (
              <Select.Option key={value} value={value}>
                <Tag color={config.color}>{config.label}</Tag>
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="操作用户"
            value={filters.username || undefined}
            onChange={(value) => handleFilterChange('username', value || '')}
            style={{ width: 150 }}
            allowClear
            showSearch
          >
            {users.map((user) => (
              <Select.Option key={user.id} value={user.username}>
                {user.username}
              </Select.Option>
            ))}
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <pre style={{
                margin: 0,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 4,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 200
              }}>
                {JSON.stringify(record.details, null, 2)}
              </pre>
            ),
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>
    </div>
  )
}
