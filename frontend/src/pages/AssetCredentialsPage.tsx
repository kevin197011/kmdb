import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Radio,
  message,
  Typography,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  KeyOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface AssetCredential {
  id: string
  name: string
  username: string
  auth_type: string
  description?: string
  created_at: string
}

export default function AssetCredentialsPage() {
  const [credentials, setCredentials] = useState<AssetCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<AssetCredential | null>(null)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    setLoading(true)
    try {
      const response = await api.get('/asset-credentials?limit=1000')
      setCredentials(response.data.data || [])
    } catch {
      message.error('加载凭证列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values: Record<string, unknown>) => {
    setCreateLoading(true)
    try {
      await api.post('/asset-credentials', values)
      message.success('凭证创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchCredentials()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (values: Record<string, unknown>) => {
    if (!selectedCredential) return
    setEditLoading(true)
    try {
      await api.put(`/asset-credentials/${selectedCredential.id}`, values)
      message.success('凭证更新成功')
      setEditModalOpen(false)
      editForm.resetFields()
      setSelectedCredential(null)
      fetchCredentials()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (credential: AssetCredential) => {
    try {
      await api.delete(`/asset-credentials/${credential.id}`)
      message.success('凭证删除成功')
      fetchCredentials()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const openEditModal = (credential: AssetCredential) => {
    setSelectedCredential(credential)
    editForm.setFieldsValue({
      name: credential.name,
      username: credential.username,
      auth_type: credential.auth_type,
      description: credential.description,
    })
    setEditModalOpen(true)
  }

  const filteredCredentials = credentials.filter(
    (cred) =>
      cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: ColumnsType<AssetCredential> = [
    {
      title: '凭证名称',
      key: 'name',
      render: (_, record) => (
        <Space>
          <KeyOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          <div>
            <div><Text strong>{record.name}</Text></div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '认证类型',
      dataIndex: 'auth_type',
      key: 'auth_type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'key' ? 'blue' : 'green'}>
          {type === 'key' ? '密钥认证' : '密码认证'}
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
      width: 120,
      render: (_, record) => (
        <Space size="small">
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
                  content: `确定要删除凭证 "${record.name}" 吗？`,
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

  const renderCredentialForm = (form: typeof createForm, onFinish: (values: Record<string, unknown>) => void, loading: boolean, isEdit: boolean) => {
    const authType = Form.useWatch('auth_type', form)

    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ auth_type: 'password' }}
      >
        <Form.Item
          name="name"
          label="凭证名称"
          rules={[{ required: true, message: '请输入凭证名称' }]}
        >
          <Input placeholder="凭证名称" />
        </Form.Item>
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="SSH用户名" />
        </Form.Item>
        <Form.Item name="auth_type" label="认证类型">
          <Radio.Group>
            <Radio value="password">密码认证</Radio>
            <Radio value="key">密钥认证</Radio>
          </Radio.Group>
        </Form.Item>
        {authType === 'password' ? (
          <Form.Item
            name="password"
            label="密码"
            rules={isEdit ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder={isEdit ? "留空则不修改密码" : "SSH密码"} />
          </Form.Item>
        ) : (
          <Form.Item
            name="private_key"
            label="私钥"
            rules={isEdit ? [] : [{ required: true, message: '请输入私钥' }]}
          >
            <TextArea
              rows={6}
              placeholder={isEdit ? "留空则不修改私钥" : "SSH私钥内容（包含 -----BEGIN ... -----END ...）"}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        )}
        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="凭证描述（可选）" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => {
              isEdit ? setEditModalOpen(false) : setCreateModalOpen(false)
              form.resetFields()
              setSelectedCredential(null)
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
  }

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>主机密钥</Title>
            <Text type="secondary">管理SSH登录凭证</Text>
          </div>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索凭证"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              新建凭证
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredCredentials}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建凭证 Modal */}
      <Modal
        title="新建凭证"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        {renderCredentialForm(createForm, handleCreate, createLoading, false)}
      </Modal>

      {/* 编辑凭证 Modal */}
      <Modal
        title="编辑凭证"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          editForm.resetFields()
          setSelectedCredential(null)
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        {renderCredentialForm(editForm, handleEdit, editLoading, true)}
      </Modal>
    </div>
  )
}
