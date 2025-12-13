import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  FolderOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography

interface ScopedPermission {
  id: string
  subject_type: string
  subject_id: string
  resource_type: string
  resource_id: string
  permission: string
  created_at: string
  subject_name?: string
  resource_name?: string
}

interface User {
  id: string
  username: string
}

interface Team {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
}

const SUBJECT_TYPES = [
  { value: 'user', label: '用户', icon: <UserOutlined /> },
  { value: 'team', label: '团队', icon: <TeamOutlined /> },
]

const RESOURCE_TYPES = [
  { value: 'project', label: '项目', icon: <FolderOutlined /> },
  { value: 'asset', label: '资产', icon: <DatabaseOutlined /> },
]

const PERMISSIONS = [
  { value: 'read', label: '读取' },
  { value: 'write', label: '写入' },
  { value: 'admin', label: '管理' },
  { value: 'connect', label: '连接' },
]

export default function ScopedPermissionsPage() {
  const [permissions, setPermissions] = useState<ScopedPermission[]>([])
  const [loading, setLoading] = useState(true)

  // 选项数据
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)

  // 表单动态选项
  const subjectType = Form.useWatch('subject_type', createForm)
  const resourceType = Form.useWatch('resource_type', createForm)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [permRes, usersRes, teamsRes, projectsRes, assetsRes] = await Promise.all([
        api.get('/scoped-permissions?limit=1000'),
        api.get('/users?limit=1000'),
        api.get('/teams?limit=1000'),
        api.get('/projects?limit=1000'),
        api.get('/assets?limit=1000'),
      ])
      setPermissions(permRes.data.data || [])
      setUsers(usersRes.data.data || [])
      setTeams(teamsRes.data.data || [])
      setProjects(projectsRes.data.data || [])
      setAssets(assetsRes.data.data || [])
    } catch {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values: {
    subject_type: string
    subject_id: string
    resource_type: string
    resource_id: string
    permission: string
  }) => {
    setCreateLoading(true)
    try {
      await api.post('/scoped-permissions', values)
      message.success('权限授予成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '授权失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (permission: ScopedPermission) => {
    try {
      await api.delete(`/scoped-permissions/${permission.id}`)
      message.success('权限已撤销')
      fetchAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '撤销失败')
    }
  }

  const getSubjectName = (perm: ScopedPermission) => {
    if (perm.subject_name) return perm.subject_name
    switch (perm.subject_type) {
      case 'user':
        return users.find((u) => u.id === perm.subject_id)?.username || perm.subject_id.slice(0, 8)
      case 'team':
        return teams.find((t) => t.id === perm.subject_id)?.name || perm.subject_id.slice(0, 8)
      default:
        return perm.subject_id.slice(0, 8)
    }
  }

  const getResourceName = (perm: ScopedPermission) => {
    if (perm.resource_name) return perm.resource_name
    switch (perm.resource_type) {
      case 'project':
        return projects.find((p) => p.id === perm.resource_id)?.name || perm.resource_id.slice(0, 8)
      case 'asset':
        return assets.find((a) => a.id === perm.resource_id)?.name || perm.resource_id.slice(0, 8)
      default:
        return perm.resource_id.slice(0, 8)
    }
  }

  const getSubjectIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserOutlined />
      case 'team': return <TeamOutlined />
      default: return <UserOutlined />
    }
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderOutlined />
      case 'asset': return <DatabaseOutlined />
      default: return <FolderOutlined />
    }
  }

  const getPermissionColor = (perm: string) => {
    switch (perm) {
      case 'read': return 'blue'
      case 'write': return 'green'
      case 'admin': return 'red'
      case 'connect': return 'cyan'
      default: return 'default'
    }
  }

  // 获取主体选项
  const getSubjectOptions = () => {
    switch (subjectType) {
      case 'user':
        return users.map((u) => ({ value: u.id, label: u.username }))
      case 'team':
        return teams.map((t) => ({ value: t.id, label: t.name }))
      default:
        return []
    }
  }

  // 获取资源选项
  const getResourceOptions = () => {
    switch (resourceType) {
      case 'project':
        return projects.map((p) => ({ value: p.id, label: p.name }))
      case 'asset':
        return assets.map((a) => ({ value: a.id, label: a.name }))
      default:
        return []
    }
  }

  const columns: ColumnsType<ScopedPermission> = [
    {
      title: '主体',
      key: 'subject',
      render: (_, record) => (
        <Space>
          {getSubjectIcon(record.subject_type)}
          <div>
            <Tag>{SUBJECT_TYPES.find((t) => t.value === record.subject_type)?.label || record.subject_type}</Tag>
            <Text strong>{getSubjectName(record)}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '资源',
      key: 'resource',
      render: (_, record) => (
        <Space>
          {getResourceIcon(record.resource_type)}
          <div>
            <Tag>{RESOURCE_TYPES.find((t) => t.value === record.resource_type)?.label}</Tag>
            <Text strong>{getResourceName(record)}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      width: 100,
      render: (perm: string) => (
        <Tag color={getPermissionColor(perm)}>
          {PERMISSIONS.find((p) => p.value === perm)?.label || perm}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Tooltip title="撤销权限">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确认撤销',
                content: '确定要撤销此权限吗？',
                okText: '撤销',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => handleDelete(record),
              })
            }}
          />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>权限管理</Title>
            <Text type="secondary">管理用户、团队对项目和资产的访问权限</Text>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            授予权限
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 授予权限 Modal */}
      <Modal
        title="授予权限"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="subject_type"
            label="主体类型"
            rules={[{ required: true, message: '请选择主体类型' }]}
          >
            <Select placeholder="选择主体类型">
              {SUBJECT_TYPES.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <Space>{type.icon} {type.label}</Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="subject_id"
            label="主体"
            rules={[{ required: true, message: '请选择主体' }]}
          >
            <Select
              placeholder="选择主体"
              showSearch
              optionFilterProp="label"
              options={getSubjectOptions()}
              disabled={!subjectType}
            />
          </Form.Item>
          <Form.Item
            name="resource_type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="选择资源类型">
              {RESOURCE_TYPES.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <Space>{type.icon} {type.label}</Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="resource_id"
            label="资源"
            rules={[{ required: true, message: '请选择资源' }]}
          >
            <Select
              placeholder="选择资源"
              showSearch
              optionFilterProp="label"
              options={getResourceOptions()}
              disabled={!resourceType}
            />
          </Form.Item>
          <Form.Item
            name="permission"
            label="权限"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select placeholder="选择权限">
              {PERMISSIONS.map((perm) => (
                <Select.Option key={perm.value} value={perm.value}>
                  <Tag color={getPermissionColor(perm.value)}>{perm.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalOpen(false)
                createForm.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                授予
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
