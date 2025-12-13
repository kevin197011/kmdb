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
  DatePicker,
  message,
  Typography,
  Tooltip,
  Alert
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
  CopyOutlined,
  ApiOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../services/api'

const { Title, Text, Paragraph } = Typography

interface APIToken {
  id: string
  name: string
  token?: string
  expires_at: string
  last_used_at?: string
  is_revoked: boolean
  created_at: string
}

export default function APITokensPage() {
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)

  // Modal 状态
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [tokenResultModalOpen, setTokenResultModalOpen] = useState(false)
  const [newToken, setNewToken] = useState('')

  const [createForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api-tokens/my')
      setTokens(response.data.data || [])
    } catch {
      message.error('加载Token列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values: { name: string; expires_at?: dayjs.Dayjs }) => {
    setCreateLoading(true)
    try {
      const payload: { name: string; expires_at?: string } = { name: values.name }
      if (values.expires_at) {
        payload.expires_at = values.expires_at.toISOString()
      }
      const response = await api.post('/api-tokens', payload)
      message.success('Token创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      setNewToken(response.data.token)
      setTokenResultModalOpen(true)
      fetchTokens()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRevoke = async (token: APIToken) => {
    try {
      await api.post(`/api-tokens/${token.id}/revoke`)
      message.success('Token已撤销')
      fetchTokens()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '撤销失败')
    }
  }

  const handleDelete = async (token: APIToken) => {
    try {
      await api.delete(`/api-tokens/${token.id}`)
      message.success('Token已删除')
      fetchTokens()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '删除失败')
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getStatusTag = (token: APIToken) => {
    if (token.is_revoked) {
      return <Tag color="error">已撤销</Tag>
    }
    if (isExpired(token.expires_at)) {
      return <Tag color="warning">已过期</Tag>
    }
    return <Tag color="success">有效</Tag>
  }

  const columns: ColumnsType<APIToken> = [
    {
      title: 'Token名称',
      key: 'name',
      render: (_, record) => (
        <Space>
          <ApiOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          <Text strong>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record),
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
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
          {!record.is_revoked && !isExpired(record.expires_at) && (
            <Tooltip title="撤销">
              <Button
                type="text"
                size="small"
                icon={<StopOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '确认撤销',
                    content: `确定要撤销Token "${record.name}" 吗？撤销后无法恢复。`,
                    okText: '撤销',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => handleRevoke(record),
                  })
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: `确定要删除Token "${record.name}" 吗？`,
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

  // 统计
  const activeCount = tokens.filter(t => !t.is_revoked && !isExpired(t.expires_at)).length
  const revokedCount = tokens.filter(t => t.is_revoked).length
  const expiredCount = tokens.filter(t => !t.is_revoked && isExpired(t.expires_at)).length

  return (
    <div>
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>API Token</Title>
            <Text type="secondary">管理API访问令牌</Text>
          </div>
        }
        extra={
          <Space>
            <Tag color="success">有效: {activeCount}</Tag>
            <Tag color="warning">过期: {expiredCount}</Tag>
            <Tag color="error">撤销: {revokedCount}</Tag>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              创建Token
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={tokens}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建Token Modal */}
      <Modal
        title="创建API Token"
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
            label="Token名称"
            rules={[{ required: true, message: '请输入Token名称' }]}
          >
            <Input placeholder="Token名称，例如：CI/CD Pipeline" />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label="过期时间"
            rules={[{ required: true, message: '请选择过期时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择过期时间"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
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

      {/* Token结果 Modal */}
      <Modal
        title="Token创建成功"
        open={tokenResultModalOpen}
        onCancel={() => {
          setTokenResultModalOpen(false)
          setNewToken('')
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setTokenResultModalOpen(false)
            setNewToken('')
          }}>
            我已保存
          </Button>
        ]}
        closable={false}
        maskClosable={false}
      >
        <Alert
          message="请立即保存此Token"
          description="Token只会显示一次，关闭此对话框后将无法再次查看完整Token。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>API Token:</Text>
            <Paragraph
              copyable={{
                text: newToken,
                icon: <CopyOutlined />,
                tooltips: ['复制', '已复制'],
              }}
              style={{ margin: 0, wordBreak: 'break-all' }}
            >
              <code style={{ fontSize: 12 }}>{newToken}</code>
            </Paragraph>
          </Space>
        </div>
      </Modal>
    </div>
  )
}
