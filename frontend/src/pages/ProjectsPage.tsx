import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Tooltip,
  Badge
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FolderOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

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
  const [searchTerm, setSearchTerm] = useState('')
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({})

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

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
      message.error('加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssetCounts = async () => {
    try {
      const response = await api.get('/assets/stats/project')
      const counts: Record<string, number> = {}
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((item: { project_id: string; count: number }) => {
          counts[item.project_id] = item.count
        })
      }
      setAssetCounts(counts)
    } catch {
      console.error('获取资产统计失败')
    }
  }

  const handleCreate = async (values: { name: string; description?: string; status: string }) => {
    setCreateLoading(true)
    try {
      await api.post('/projects', values)
      message.success('项目创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchProjects()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (values: { name: string; description?: string; status: string }) => {
    if (!selectedProject) return
    setEditLoading(true)
    try {
      await api.put(`/projects/${selectedProject.id}`, values)
      message.success('项目更新成功')
      setEditModalOpen(false)
      editForm.resetFields()
      setSelectedProject(null)
      fetchProjects()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (project: Project) => {
    try {
      await api.delete(`/projects/${project.id}`)
      message.success('项目删除成功')
      fetchProjects()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const openEditModal = (project: Project) => {
    setSelectedProject(project)
    editForm.setFieldsValue({
      name: project.name,
      description: project.description,
      status: project.status,
    })
    setEditModalOpen(true)
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <Tag color="success">活跃</Tag>
      case 'inactive':
        return <Tag color="default">停用</Tag>
      case 'archived':
        return <Tag color="error">归档</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: ColumnsType<Project> = [
    {
      title: '项目名称',
      key: 'name',
      render: (_, record) => (
        <Space>
          <FolderOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          <div>
            <div><Text strong>{record.name}</Text></div>
            {record.description && (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1 }}
                style={{ fontSize: 12, marginBottom: 0 }}
              >
                {record.description}
              </Paragraph>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '资产数量',
      key: 'assetCount',
      width: 120,
      render: (_, record) => (
        <Badge
          count={assetCounts[record.id] || 0}
          showZero
          style={{ backgroundColor: assetCounts[record.id] > 0 ? '#1890ff' : '#d9d9d9' }}
        />
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看资产">
            <Button
              type="text"
              size="small"
              icon={<DatabaseOutlined />}
              onClick={() => navigate(`/assets?project_id=${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: `确定要删除项目 "${record.name}" 吗？`,
                  okText: '删除',
                  okType: 'danger',
                  cancelText: '取消',
                  onOk: () => handleDelete(record),
                })
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>项目管理</Title>
            <Text type="secondary">管理项目和关联的资产</Text>
          </div>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索项目名称或描述"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              新建项目
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建项目 Modal */}
      <Modal
        title="新建项目"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="项目名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="项目描述（可选）" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
              <Select.Option value="archived">归档</Select.Option>
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
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑项目 Modal */}
      <Modal
        title="编辑项目"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          editForm.resetFields()
          setSelectedProject(null)
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="项目名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="项目描述（可选）" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
              <Select.Option value="archived">归档</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalOpen(false)
                editForm.resetFields()
                setSelectedProject(null)
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
