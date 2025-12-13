import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import {
  Card,
  List,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Tabs,
  Modal,
  Form,
  message,
  Typography,
  Empty,
  Tooltip,
  Badge
} from 'antd'
import {
  SearchOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  DesktopOutlined,
  CloudServerOutlined
} from '@ant-design/icons'
import api from '../services/api'

const { Text } = Typography

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
  type: string
  status: string
  ip_address: string
  port: number
  project_id?: string
  project?: Project
}

interface Credential {
  id: string
  name: string
  username: string
  auth_type: string
}

interface Session {
  id: string
  assetId: string
  assetName: string
  assetIp?: string
  terminal: Terminal
  fitAddon: FitAddon
  ws: WebSocket | null
  connected: boolean
  sessionIndex: number
  credentialId?: string
  username?: string
}

export default function WebSSHPage() {
  const [searchParams] = useSearchParams()
  const preselectedAssetId = searchParams.get('asset_id')

  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // 连接对话框
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [connectForm] = Form.useForm()
  const [connecting, setConnecting] = useState(false)

  const terminalContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (preselectedAssetId && assets.length > 0) {
      const asset = assets.find((a) => a.id === preselectedAssetId)
      if (asset) {
        openConnectModal(asset)
      }
    }
  }, [preselectedAssetId, assets])

  const loadData = async () => {
    try {
      const [assetsRes, projectsRes, credentialsRes, favoritesRes] = await Promise.all([
        api.get('/assets?limit=1000'),
        api.get('/projects?limit=1000'),
        api.get('/asset-credentials?limit=1000'),
        api.get('/favorites').catch(() => ({ data: [] })),
      ])
      setAssets(assetsRes.data.data || [])
      setProjects(projectsRes.data.data || [])
      setCredentials(credentialsRes.data.data || [])
      setFavorites(new Set((favoritesRes.data || []).map((a: Asset) => a.id)))
    } catch {
      message.error('加载数据失败')
    }
  }

  const toggleFavorite = async (assetId: string) => {
    try {
      const isFavorite = favorites.has(assetId)
      if (isFavorite) {
        await api.delete(`/assets/${assetId}/favorite`)
        setFavorites((prev) => {
          const newSet = new Set(prev)
          newSet.delete(assetId)
          return newSet
        })
      } else {
        await api.post(`/assets/${assetId}/favorite`)
        setFavorites((prev) => new Set(prev).add(assetId))
      }
    } catch {
      message.error('操作失败')
    }
  }

  const openConnectModal = (asset: Asset) => {
    setSelectedAsset(asset)
    connectForm.resetFields()
    setConnectModalOpen(true)
  }

  const handleConnect = async (values: { credential_id?: string; username?: string; password?: string }) => {
    if (!selectedAsset) return

    setConnecting(true)
    try {
      const credential = values.credential_id ? credentials.find((c) => c.id === values.credential_id) : null

      const requestBody: Record<string, unknown> = {
        asset_id: selectedAsset.id,
        cols: 120,
        rows: 30,
      }

      if (credential) {
        requestBody.credential_id = credential.id
      } else if (values.username && values.password) {
        requestBody.username = values.username
        requestBody.password = values.password
        requestBody.auth_type = 'password'
      } else {
        message.error('请选择凭证或输入用户名密码')
        setConnecting(false)
        return
      }

      const response = await api.post('/webssh/connect', requestBody)
      const sessionId = response.data.session_id

      // 创建终端
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
        },
      })
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      // 计算同一主机的会话编号
      const existingSessions = sessions.filter((s) => s.assetId === selectedAsset.id)
      const sessionIndex = existingSessions.length + 1

      const newSession: Session = {
        id: sessionId,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        assetIp: selectedAsset.ip_address,
        terminal,
        fitAddon,
        ws: null,
        connected: false,
        sessionIndex,
        credentialId: credential?.id,
        username: credential?.username || values.username,
      }

      setSessions((prev) => [...prev, newSession])
      setActiveSessionId(sessionId)
      setConnectModalOpen(false)
      message.success('连接成功')

      // 建立 WebSocket 连接
      setTimeout(() => connectWebSocket(newSession), 100)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '连接失败')
    } finally {
      setConnecting(false)
    }
  }

  const connectWebSocket = (session: Session) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.hostname
    const wsPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    const token = localStorage.getItem('access_token')
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/api/v1/webssh/ws/${session.id}?token=${token}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, ws, connected: true } : s))
      )

      if (terminalContainerRef.current && activeSessionId === session.id) {
        const container = terminalContainerRef.current
        container.innerHTML = ''
        session.terminal.open(container)
        session.fitAddon.fit()
      }
    }

    ws.onmessage = (event) => {
      session.terminal.write(event.data)
    }

    ws.onclose = () => {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, connected: false } : s))
      )
      session.terminal.write('\r\n\x1b[31m连接已断开\x1b[0m\r\n')
    }

    ws.onerror = () => {
      message.error('WebSocket连接错误')
    }

    session.terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })
  }

  const closeSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      session.ws?.close()
      session.terminal.dispose()
      api.delete(`/webssh/${sessionId}`).catch(() => {})
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId)
      setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    }
  }

  const cloneSession = (session: Session) => {
    const asset = assets.find((a) => a.id === session.assetId)
    if (asset) {
      setSelectedAsset(asset)
      if (session.credentialId) {
        connectForm.setFieldsValue({ credential_id: session.credentialId })
      }
      setConnectModalOpen(true)
    }
  }

  // 切换会话时挂载终端
  useEffect(() => {
    if (activeSessionId && terminalContainerRef.current) {
      const session = sessions.find((s) => s.id === activeSessionId)
      if (session && session.connected) {
        const container = terminalContainerRef.current
        container.innerHTML = ''
        session.terminal.open(container)
        session.fitAddon.fit()
        session.terminal.focus()
      }
    }
  }, [activeSessionId, sessions])

  // 窗口大小变化时调整终端
  useEffect(() => {
    const handleResize = () => {
      const session = sessions.find((s) => s.id === activeSessionId)
      if (session && session.connected) {
        session.fitAddon.fit()
        const dims = session.fitAddon.proposeDimensions()
        if (dims) {
          api.post(`/webssh/${session.id}/resize`, { height: dims.rows, width: dims.cols }).catch(() => {})
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeSessionId, sessions])

  const filteredAssets = assets.filter((asset) => {
    const matchSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.ip_address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchProject = !filterProject || asset.project_id === filterProject
    const matchFavorite = !showFavoritesOnly || favorites.has(asset.id)
    return matchSearch && matchProject && matchFavorite && asset.status === 'active'
  })

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '-'
    return projects.find((p) => p.id === projectId)?.name || '-'
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 16 }}>
      {/* 左侧主机列表 */}
      <Card
        title="主机列表"
        size="small"
        style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
        extra={
          <Tooltip title={showFavoritesOnly ? '显示全部' : '只看收藏'}>
            <Button
              type="text"
              size="small"
              icon={showFavoritesOnly ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            />
          </Tooltip>
        }
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Input
              placeholder="搜索主机"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              allowClear
            />
            <Select
              placeholder="筛选项目"
              value={filterProject || undefined}
              onChange={(v) => setFilterProject(v || '')}
              size="small"
              style={{ width: '100%' }}
              allowClear
            >
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Space>
        </div>
        <List
          size="small"
          dataSource={filteredAssets}
          locale={{ emptyText: <Empty description="暂无可用主机" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          renderItem={(asset) => (
            <List.Item
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => openConnectModal(asset)}
              actions={[
                <Button
                  key="fav"
                  type="text"
                  size="small"
                  icon={favorites.has(asset.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(asset.id)
                  }}
                />
              ]}
            >
              <List.Item.Meta
                avatar={<CloudServerOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                title={
                  <Space size={4}>
                    <Text strong ellipsis style={{ maxWidth: 120 }}>{asset.name}</Text>
                    <Tag color="green" style={{ marginRight: 0 }}>在线</Tag>
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{asset.ip_address}:{asset.port}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{getProjectName(asset.project_id)}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 右侧终端区域 */}
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {sessions.length > 0 ? (
          <>
            {/* 会话标签 */}
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={activeSessionId || undefined}
              onChange={setActiveSessionId}
              onEdit={(targetKey, action) => {
                if (action === 'remove') closeSession(targetKey as string)
              }}
              size="small"
              style={{ marginBottom: 0 }}
              items={sessions.map((session) => ({
                key: session.id,
                label: (
                  <Space size={4}>
                    <Badge status={session.connected ? 'success' : 'error'} />
                    <span>{session.assetName}</span>
                    {session.sessionIndex > 1 && <Tag style={{ marginRight: 0 }}>#{session.sessionIndex}</Tag>}
                    <Tooltip title="克隆会话">
                      <CopyOutlined
                        style={{ fontSize: 12, marginLeft: 4 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          cloneSession(session)
                        }}
                      />
                    </Tooltip>
                  </Space>
                ),
              }))}
            />
            {/* 终端容器 */}
            <div
              ref={terminalContainerRef}
              style={{
                flex: 1,
                backgroundColor: '#1e1e1e',
                padding: 8,
                borderRadius: '0 0 8px 8px',
              }}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty
              image={<DesktopOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
              description="从左侧列表选择主机开始连接"
            />
          </div>
        )}
      </Card>

      {/* 连接对话框 */}
      <Modal
        title={`连接到 ${selectedAsset?.name}`}
        open={connectModalOpen}
        onCancel={() => setConnectModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={connectForm} layout="vertical" onFinish={handleConnect}>
          {credentials.length > 0 && (
            <Form.Item name="credential_id" label="选择凭证">
              <Select placeholder="选择已保存的凭证" allowClear>
                {credentials.map((cred) => (
                  <Select.Option key={cred.id} value={cred.id}>
                    <Space>
                      {cred.name}
                      <Tag>{cred.auth_type === 'key' ? '密钥' : '密码'}</Tag>
                      <Text type="secondary">@{cred.username}</Text>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            或手动输入凭证：
          </Text>
          <Form.Item name="username" label="用户名">
            <Input placeholder="SSH用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password placeholder="SSH密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConnectModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={connecting}>
                连接
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
