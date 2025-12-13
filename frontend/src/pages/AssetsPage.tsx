import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Descriptions,
  Drawer
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CodeOutlined,
  EyeOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface Asset {
  id: string
  name: string
  type: string
  ip_address: string
  port: number
  status: string
  project_id: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
}

const ASSET_TYPES = [
  { value: 'server', label: '服务器' },
  { value: 'vm', label: '虚拟机' },
  { value: 'container', label: '容器' },
  { value: 'network_device', label: '网络设备' },
  { value: 'database', label: '数据库' },
  { value: 'application', label: '应用' },
]

export default function AssetsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')

  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState(projectIdFromUrl || '')
  const [filterStatus, setFilterStatus] = useState('')

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchAssets()
  }, [])

  useEffect(() => {
    if (projectIdFromUrl) {
      setFilterProject(projectIdFromUrl)
    }
  }, [projectIdFromUrl])

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
      const response = await api.get('/assets?limit=1000')
      setAssets(response.data.data || [])
    } catch {
      message.error('加载资产列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values: Record<string, unknown>) => {
    setCreateLoading(true)
    try {
      await api.post('/assets', values)
      message.success('资产创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchAssets()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (values: Record<string, unknown>) => {
    if (!selectedAsset) return
    setEditLoading(true)
    try {
      await api.put(`/assets/${selectedAsset.id}`, values)
      message.success('资产更新成功')
      setEditModalOpen(false)
      editForm.resetFields()
      setSelectedAsset(null)
      fetchAssets()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (asset: Asset) => {
    try {
      await api.delete(`/assets/${asset.id}`)
      message.success('资产删除成功')
      fetchAssets()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset)
    editForm.setFieldsValue({
      name: asset.name,
      type: asset.type,
      ip_address: asset.ip_address,
      port: asset.port,
      status: asset.status,
      project_id: asset.project_id,
      description: asset.description,
    })
    setEditModalOpen(true)
  }

  const openDetailDrawer = (asset: Asset) => {
    setSelectedAsset(asset)
    setDetailDrawerOpen(true)
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <Tag color="success">运行中</Tag>
      case 'inactive':
        return <Tag color="default">已停止</Tag>
      case 'maintenance':
        return <Tag color="warning">维护中</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getTypeLabel = (type: string) => {
    return ASSET_TYPES.find((t) => t.value === type)?.label || type
  }

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || '-'
  }

  const filteredAssets = assets.filter((asset) => {
    const matchSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.ip_address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchProject = !filterProject || asset.project_id === filterProject
    const matchStatus = !filterStatus || asset.status === filterStatus
    return matchSearch && matchProject && matchStatus
  })

  const columns: ColumnsType<Asset> = [
    {
      title: '资产名称',
      key: 'name',
      render: (_, record) => (
        <Space>
          <DatabaseOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          <div>
            <div><Text strong>{record.name}</Text></div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.ip_address}:{record.port}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{getTypeLabel(type)}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '所属项目',
      dataIndex: 'project_id',
      key: 'project_id',
      width: 150,
      render: (projectId: string) => (
        <Text type="secondary">{getProjectName(projectId)}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetailDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="SSH连接">
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              onClick={() => navigate(`/webssh?asset_id=${record.id}`)}
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
                  content: `确定要删除资产 "${record.name}" 吗？`,
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

  const renderAssetForm = (form: typeof createForm, onFinish: (values: Record<string, unknown>) => void, loading: boolean, isEdit: boolean) => (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ status: 'active', port: 22, type: 'server' }}
    >
      <Form.Item
        name="name"
        label="资产名称"
        rules={[{ required: true, message: '请输入资产名称' }]}
      >
        <Input placeholder="资产名称" />
      </Form.Item>
      <Form.Item
        name="type"
        label="类型"
        rules={[{ required: true, message: '请选择类型' }]}
      >
        <Select placeholder="选择类型">
          {ASSET_TYPES.map((type) => (
            <Select.Option key={type.value} value={type.value}>
              {type.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        name="ip_address"
        label="IP地址"
        rules={[{ required: true, message: '请输入IP地址' }]}
      >
        <Input placeholder="IP地址" />
      </Form.Item>
      <Form.Item
        name="port"
        label="端口"
        rules={[{ required: true, message: '请输入端口' }]}
      >
        <Input type="number" placeholder="端口" />
      </Form.Item>
      <Form.Item
        name="project_id"
        label="所属项目"
        rules={[{ required: true, message: '请选择项目' }]}
      >
        <Select placeholder="选择项目">
          {projects.map((project) => (
            <Select.Option key={project.id} value={project.id}>
              {project.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="status" label="状态">
        <Select>
          <Select.Option value="active">运行中</Select.Option>
          <Select.Option value="inactive">已停止</Select.Option>
          <Select.Option value="maintenance">维护中</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="description" label="描述">
        <TextArea rows={3} placeholder="资产描述（可选）" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={() => {
            isEdit ? setEditModalOpen(false) : setCreateModalOpen(false)
            form.resetFields()
            setSelectedAsset(null)
          }}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>资产管理</Title>
            <Text type="secondary">管理服务器、虚拟机等IT资产</Text>
          </div>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索资产名称或IP"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="筛选项目"
              value={filterProject || undefined}
              onChange={(value) => setFilterProject(value || '')}
              style={{ width: 150 }}
              allowClear
            >
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="筛选状态"
              value={filterStatus || undefined}
              onChange={(value) => setFilterStatus(value || '')}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="active">运行中</Select.Option>
              <Select.Option value="inactive">已停止</Select.Option>
              <Select.Option value="maintenance">维护中</Select.Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              新建资产
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredAssets}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建资产 Modal */}
      <Modal
        title="新建资产"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        {renderAssetForm(createForm, handleCreate, createLoading, false)}
      </Modal>

      {/* 编辑资产 Modal */}
      <Modal
        title="编辑资产"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          editForm.resetFields()
          setSelectedAsset(null)
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        {renderAssetForm(editForm, handleEdit, editLoading, true)}
      </Modal>

      {/* 资产详情 Drawer */}
      <Drawer
        title="资产详情"
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false)
          setSelectedAsset(null)
        }}
        width={500}
        extra={
          <Space>
            <Button
              icon={<CodeOutlined />}
              onClick={() => {
                setDetailDrawerOpen(false)
                navigate(`/webssh?asset_id=${selectedAsset?.id}`)
              }}
            >
              SSH连接
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailDrawerOpen(false)
                if (selectedAsset) openEditModal(selectedAsset)
              }}
            >
              编辑
            </Button>
          </Space>
        }
      >
        {selectedAsset && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="资产名称">{selectedAsset.name}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag>{getTypeLabel(selectedAsset.type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(selectedAsset.status)}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedAsset.ip_address}</Descriptions.Item>
            <Descriptions.Item label="端口">{selectedAsset.port}</Descriptions.Item>
            <Descriptions.Item label="所属项目">{getProjectName(selectedAsset.project_id)}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedAsset.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedAsset.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedAsset.updated_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selectedAsset.metadata && Object.keys(selectedAsset.metadata).length > 0 && (
              <Descriptions.Item label="元数据">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(selectedAsset.metadata, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
