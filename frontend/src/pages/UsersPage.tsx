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
  Select,
  message,
  Typography,
  Avatar,
  Tooltip,
  Dropdown
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UserOutlined,
  SearchOutlined,
  MoreOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography

interface User {
  id: string
  username: string
  email: string
  status: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/users?limit=1000')
      setUsers(response.data.data || [])
    } catch {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values: { username: string; email: string; password: string; status: string }) => {
    setCreateLoading(true)
    try {
      await api.post('/users', values)
      message.success('用户创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchUsers()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (values: { username: string; email: string; status: string }) => {
    if (!selectedUser) return
    setEditLoading(true)
    try {
      await api.put(`/users/${selectedUser.id}`, values)
      message.success('用户更新成功')
      setEditModalOpen(false)
      editForm.resetFields()
      setSelectedUser(null)
      fetchUsers()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (user: User) => {
    try {
      await api.delete(`/users/${user.id}`)
      message.success('用户删除成功')
      fetchUsers()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const handleChangePassword = async (values: { new_password: string; confirm_password: string }) => {
    if (!selectedUser) return
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的密码不一致')
      return
    }
    setPasswordLoading(true)
    try {
      await api.patch(`/users/${selectedUser.id}/password`, {
        new_password: values.new_password,
      })
      message.success('密码修改成功')
      setPasswordModalOpen(false)
      passwordForm.resetFields()
      setSelectedUser(null)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '修改密码失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      status: user.status,
    })
    setEditModalOpen(true)
  }

  const openPasswordModal = (user: User) => {
    setSelectedUser(user)
    setPasswordModalOpen(true)
  }

  const getAvatarColor = (username: string) => {
    const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2']
    const index = username.charCodeAt(0) % colors.length
    return colors[index]
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: getAvatarColor(record.username) }}>
            {record.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div><Text strong>{record.username}</Text></div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'error'}>
          {status === 'active' ? '活跃' : '禁用'}
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
      width: 150,
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
          <Dropdown
            menu={{
              items: [
                {
                  key: 'password',
                  icon: <KeyOutlined />,
                  label: '修改密码',
                  onClick: () => openPasswordModal(record),
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除用户',
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除用户 "${record.username}" 吗？`,
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => handleDelete(record),
                    })
                  },
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>用户管理</Title>
            <Text type="secondary">管理系统用户账号</Text>
          </div>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索用户名或邮箱"
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
              新建用户
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建用户 Modal */}
      <Modal
        title="新建用户"
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
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少为6位' },
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} placeholder="密码（至少6位）" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
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

      {/* 编辑用户 Modal */}
      <Modal
        title="编辑用户"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          editForm.resetFields()
          setSelectedUser(null)
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalOpen(false)
                editForm.resetFields()
                setSelectedUser(null)
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

      {/* 修改密码 Modal */}
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false)
          passwordForm.resetFields()
          setSelectedUser(null)
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' },
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} placeholder="新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} placeholder="确认新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setPasswordModalOpen(false)
                passwordForm.resetFields()
                setSelectedUser(null)
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={passwordLoading}>
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
