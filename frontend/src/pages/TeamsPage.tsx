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
  message,
  Typography,
  Tooltip,
  Avatar,
  List,
  Select
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: string
  user?: {
    id: string
    username: string
    email: string
  }
}

interface User {
  id: string
  username: string
  email: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchTeams()
    fetchUsers()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const response = await api.get('/teams?limit=1000')
      setTeams(response.data.data || [])
    } catch {
      message.error('加载团队列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?limit=1000')
      setUsers(response.data.data || [])
    } catch {
      console.error('加载用户失败')
    }
  }

  const fetchTeamMembers = async (teamId: string) => {
    setMembersLoading(true)
    try {
      const response = await api.get(`/teams/${teamId}/members`)
      setTeamMembers(response.data || [])
    } catch {
      message.error('加载团队成员失败')
    } finally {
      setMembersLoading(false)
    }
  }

  const handleCreate = async (values: { name: string; description?: string }) => {
    setCreateLoading(true)
    try {
      await api.post('/teams', values)
      message.success('团队创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchTeams()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (values: { name: string; description?: string }) => {
    if (!selectedTeam) return
    setEditLoading(true)
    try {
      await api.put(`/teams/${selectedTeam.id}`, values)
      message.success('团队更新成功')
      setEditModalOpen(false)
      editForm.resetFields()
      setSelectedTeam(null)
      fetchTeams()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (team: Team) => {
    try {
      await api.delete(`/teams/${team.id}`)
      message.success('团队删除成功')
      fetchTeams()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return
    try {
      await api.post(`/teams/${selectedTeam.id}/members`, { user_id: userId, role: 'member' })
      message.success('成员添加成功')
      fetchTeamMembers(selectedTeam.id)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '添加失败')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return
    try {
      await api.delete(`/teams/${selectedTeam.id}/members/${userId}`)
      message.success('成员移除成功')
      fetchTeamMembers(selectedTeam.id)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '移除失败')
    }
  }

  const openEditModal = (team: Team) => {
    setSelectedTeam(team)
    editForm.setFieldsValue({
      name: team.name,
      description: team.description,
    })
    setEditModalOpen(true)
  }

  const openMembersModal = (team: Team) => {
    setSelectedTeam(team)
    setMembersModalOpen(true)
    fetchTeamMembers(team.id)
  }

  const getAvatarColor = (username: string) => {
    const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2']
    const index = username.charCodeAt(0) % colors.length
    return colors[index]
  }

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: ColumnsType<Team> = [
    {
      title: '团队名称',
      key: 'name',
      render: (_, record) => (
        <Space>
          <TeamOutlined style={{ fontSize: 18, color: '#1890ff' }} />
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="管理成员">
            <Button
              type="text"
              size="small"
              icon={<UserOutlined />}
              onClick={() => openMembersModal(record)}
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
                  content: `确定要删除团队 "${record.name}" 吗？`,
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

  // 获取未加入团队的用户
  const availableUsers = users.filter(
    (user) => !teamMembers.find((m) => m.user_id === user.id)
  )

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>团队管理</Title>
            <Text type="secondary">管理团队和团队成员</Text>
          </div>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索团队"
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
              新建团队
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredTeams}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建团队 Modal */}
      <Modal
        title="新建团队"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="团队名称"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="团队名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="团队描述（可选）" />
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

      {/* 编辑团队 Modal */}
      <Modal
        title="编辑团队"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          editForm.resetFields()
          setSelectedTeam(null)
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="name"
            label="团队名称"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="团队名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="团队描述（可选）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalOpen(false)
                editForm.resetFields()
                setSelectedTeam(null)
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

      {/* 成员管理 Modal */}
      <Modal
        title={`团队成员 - ${selectedTeam?.name}`}
        open={membersModalOpen}
        onCancel={() => {
          setMembersModalOpen(false)
          setSelectedTeam(null)
          setTeamMembers([])
        }}
        footer={[
          <Button key="close" onClick={() => {
            setMembersModalOpen(false)
            setSelectedTeam(null)
            setTeamMembers([])
          }}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              placeholder="选择用户添加到团队"
              style={{ flex: 1 }}
              showSearch
              optionFilterProp="children"
                onChange={(value) => value && handleAddMember(value)}
                value={undefined as string | undefined}
            >
              {availableUsers.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </Select.Option>
              ))}
            </Select>
          </Space.Compact>
        </div>

        <List
          loading={membersLoading}
          dataSource={teamMembers}
          renderItem={(member) => (
            <List.Item
              actions={[
                <Tag key="role" color="blue">{member.role}</Tag>,
                <Button
                  key="remove"
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveMember(member.user_id)}
                >
                  移除
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: getAvatarColor(member.user?.username || '') }}>
                    {member.user?.username?.charAt(0)?.toUpperCase()}
                  </Avatar>
                }
                title={member.user?.username}
                description={member.user?.email}
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无成员' }}
        />
      </Modal>
    </div>
  )
}
