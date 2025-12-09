import { useState, useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
  type: string
  status: string
  project_id?: string
  project?: Project
  ssh_port?: number
  ip?: string
  os?: string
  cpu?: string
  memory?: string
  disk?: string
  location?: string
  department?: string
  cloud_platform?: string
  remark?: string
}

interface Credential {
  id: string
  asset_id?: string
  name: string
  username: string
  auth_type: string
}

interface Session {
  id: string
  assetId: string
  assetName: string
  terminal: Terminal
  fitAddon: FitAddon
  ws: WebSocket | null
  connected: boolean
}

export default function WebSSHPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showHostList, setShowHostList] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [projects, setProjects] = useState<string[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'project' | 'favorite'>('none')
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [connectForm, setConnectForm] = useState({ username: '', password: '', credential_id: '' })
  const [availableCredentials, setAvailableCredentials] = useState<Credential[]>([])
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAssets()
    loadFavorites()
    loadCredentials()
  }, [])

  const loadFavorites = async () => {
    try {
      const response = await api.get('/favorites')
      const favoriteAssets = response.data || []
      setFavorites(new Set(favoriteAssets.map((a: Asset) => a.id)))
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '加载收藏失败', variant: 'error' })
    }
  }

  const handleToggleFavorite = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '操作失败', variant: 'error' })
    }
  }

  useEffect(() => {
    if (activeSessionId && terminalContainerRef.current) {
      const session = sessions.find((s) => s.id === activeSessionId)
      if (session) {
        terminalContainerRef.current.innerHTML = ''
        session.terminal.open(terminalContainerRef.current)

        // 关键修复：确保终端完全渲染后再调整大小
        requestAnimationFrame(() => {
          session.fitAddon.fit()

          // 立即发送调整后的尺寸到后端
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            const cols = session.terminal.cols
            const rows = session.terminal.rows
            if (cols > 0 && rows > 0) {
              session.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
            }
          }
        })
      }
    }
  }, [activeSessionId, sessions])

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
      resizeTimer = setTimeout(() => {
        if (activeSessionId) {
          const session = sessions.find((s) => s.id === activeSessionId)
          if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.fitAddon.fit()
            const cols = session.terminal.cols
            const rows = session.terminal.rows
            if (cols > 0 && rows > 0) {
              try {
                session.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
              } catch (error) {
                console.error('Resize failed:', error)
              }
            }
          }
        }
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
    }
  }, [activeSessionId, sessions])

  const loadCredentials = async () => {
    try {
      const response = await api.get('/asset-credentials')
      const creds = response.data || []
      setAvailableCredentials(creds)
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '加载凭证失败', variant: 'error' })
    }
  }

  const loadAssets = async () => {
    try {
      const response = await api.get('/assets?page=1&limit=1000')
      const assetsData = response.data.data || []
      setAssets(assetsData)
      const projectSet = new Set<string>()
      assetsData.forEach((asset: Asset) => {
        if (asset.project?.name) projectSet.add(asset.project.name)
      })
      setProjects(Array.from(projectSet).sort())
    } catch (error: any) {
      toast({ title: '错误', description: error.response?.data?.error || '加载资产失败', variant: 'error' })
    }
  }

  const handleConnect = async (asset: Asset) => {
    setSelectedAsset(asset)
    setConnectForm({ username: '', password: '', credential_id: '' })
    setSelectedCredential(null)
    setShowConnectDialog(true)
  }

  const handleConnectSubmit = async () => {
    if (!selectedAsset) {
      toast({ title: '错误', description: '未选择主机', variant: 'error' })
      return
    }

    if (!connectForm.credential_id && !connectForm.username) {
      toast({ title: '验证失败', description: '请选择凭证或输入用户名', variant: 'error' })
      return
    }

    if (!connectForm.credential_id) {
      if (!connectForm.username.trim()) {
        toast({ title: '验证失败', description: '请输入用户名', variant: 'error' })
        return
      }
      if (!connectForm.password) {
        toast({ title: '验证失败', description: '请输入密码', variant: 'error' })
        return
      }
    }

    toast({ title: '正在连接', description: `正在连接到 ${selectedAsset.name}...`, variant: 'default' })

    try {
      let username = connectForm.username
      let password = connectForm.password

      if (connectForm.credential_id && selectedCredential) {
        username = selectedCredential.username
        if (selectedCredential.auth_type === 'key') {
          password = ''
        }
      }

      // 创建终端实例
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        lineHeight: 1.0, // 使用标准行高，避免显示错位
        allowProposedApi: true,
        scrollback: 1000,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
        },
      })

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      // 先附加终端到 DOM，确保可以正确计算尺寸
      if (terminalContainerRef.current) {
        terminalContainerRef.current.innerHTML = ''
        terminal.open(terminalContainerRef.current)
        // 等待 DOM 完全渲染
        await new Promise(resolve => setTimeout(resolve, 100))
        // 调整终端大小
        fitAddon.fit()
      }

      // 获取终端尺寸
      const cols = terminal.cols || 80
      const rows = terminal.rows || 24

      // 建立 SSH 连接，传递终端尺寸给后端
      const response = await api.post('/webssh/connect', {
        asset_id: selectedAsset.id,
        username: username,
        password: password || undefined,
        credential_id: connectForm.credential_id || undefined,
        cols: cols,
        rows: rows,
      })

      const { session_id, ws_url } = response.data

      // 创建 WebSocket 连接
      const token = localStorage.getItem('access_token')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${ws_url}?token=${encodeURIComponent(token || '')}`
      const ws = new WebSocket(wsUrl)

      // 发送终端大小的辅助函数
      const sendResize = () => {
        if (ws.readyState === WebSocket.OPEN) {
          const currentCols = terminal.cols
          const currentRows = terminal.rows
          if (currentCols > 0 && currentRows > 0) {
            ws.send(JSON.stringify({ type: 'resize', cols: currentCols, rows: currentRows }))
          }
        }
      }

      ws.onopen = () => {
        setSessions((prev) =>
          prev.map((s) => (s.id === session_id ? { ...s, connected: true } : s))
        )
        toast({ title: '连接成功', description: `已连接到 ${selectedAsset.name}`, variant: 'success' })

        // 连接建立后发送终端尺寸（虽然后端已经使用了正确尺寸，但这确保同步）
        setTimeout(() => sendResize(), 100)
      }

      let lastStatusUpdate = 0
      const STATUS_UPDATE_INTERVAL = 1000

      ws.onmessage = async (event) => {
        const now = Date.now()
        if (now - lastStatusUpdate > STATUS_UPDATE_INTERVAL) {
          setSessions((prev) => {
            const session = prev.find((s) => s.id === session_id)
            if (session && !session.connected) {
              lastStatusUpdate = now
              return prev.map((s) => (s.id === session_id ? { ...s, connected: true } : s))
            }
            return prev
          })
        }

        let data: string = ''
        try {
          if (event.data instanceof Blob) {
            const buffer = await event.data.arrayBuffer()
            data = new TextDecoder('utf-8').decode(buffer)
          } else if (typeof event.data === 'string') {
            data = event.data
          } else if (event.data instanceof ArrayBuffer) {
            data = new TextDecoder('utf-8').decode(event.data)
          } else {
            data = String(event.data)
          }

          if (data) {
            terminal.write(data)
          }
        } catch (error) {
          console.error('处理 WebSocket 消息失败:', error)
        }
      }

      ws.onerror = () => {
        setSessions((prev) =>
          prev.map((s) => (s.id === session_id ? { ...s, connected: false, ws: null } : s))
        )
        toast({ title: '连接错误', description: 'WebSocket 连接失败，请检查网络连接', variant: 'error' })
        terminal.writeln('\r\n\x1b[31m连接错误\x1b[0m')
      }

      ws.onclose = (event) => {
        setSessions((prev) =>
          prev.map((s) => (s.id === session_id ? { ...s, connected: false, ws: null } : s))
        )

        if (event.code !== 1000) {
          toast({ title: '连接断开', description: 'SSH 连接已断开', variant: 'error' })
          terminal.writeln('\r\n\x1b[31m连接已断开\x1b[0m')
        } else {
          terminal.writeln('\r\n\x1b[33m连接已关闭\x1b[0m')
        }
      }

      terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        } else {
          setSessions((prev) =>
            prev.map((s) => (s.id === session_id ? { ...s, connected: false, ws: null } : s))
          )
        }
      })

      const newSession: Session = {
        id: session_id,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        terminal,
        fitAddon,
        ws,
        connected: false, // 初始为 false，onopen 时设为 true
      }

      setSessions((prev) => [...prev, newSession])
      setActiveSessionId(session_id)
      setShowConnectDialog(false)
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '连接失败'
      toast({ title: '连接失败', description: errorMsg, variant: 'error' })
    }
  }

  const handleCloseSession = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      if (session.ws) {
        session.ws.close()
      }
      session.terminal.dispose()
      try {
        await api.delete(`/webssh/${sessionId}`)
      } catch (error: any) {
        toast({ title: '警告', description: error.response?.data?.error || '关闭会话失败', variant: 'error' })
      }
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    if (activeSessionId === sessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id)
      } else {
        setActiveSessionId(null)
        if (terminalContainerRef.current) {
          terminalContainerRef.current.innerHTML = ''
        }
      }
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !filterProject || asset.project?.name === filterProject
    const matchesFavorites = !showFavoritesOnly || favorites.has(asset.id)
    return matchesSearch && matchesProject && matchesFavorites
  })

  const groupedAssets = () => {
    if (groupBy === 'none') {
      return { '全部': filteredAssets }
    }

    const groups: Record<string, Asset[]> = {}
    filteredAssets.forEach((asset) => {
      let key = '其他'
      if (groupBy === 'type') {
        key = asset.type || '其他'
      } else if (groupBy === 'project') {
        key = asset.project?.name || '未分类'
      } else if (groupBy === 'favorite') {
        key = favorites.has(asset.id) ? '收藏' : '未收藏'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(asset)
    })

    return groups
  }

  return (
    <div className="flex h-screen -m-6 overflow-hidden">
        {showHostList && (
          <div className="w-80 bg-white border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">主机清单</h2>
                <button
                  onClick={() => setShowHostList(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="搜索主机..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">所有项目</option>
                  {projects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavoritesOnly}
                    onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">仅显示收藏</span>
                </label>
                <div>
                  <label className="block mb-1 text-sm">分组方式</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="none">不分组</option>
                    <option value="type">按类型</option>
                    <option value="project">按项目</option>
                    <option value="favorite">按收藏</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {Object.entries(groupedAssets()).map(([groupName, groupAssets]) => (
                  <div key={groupName} className="mb-4">
                    {groupBy !== 'none' && (
                      <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
                        {groupName} ({groupAssets.length})
                      </div>
                    )}
                    <div className="space-y-1">
                      {groupAssets.map((asset) => {
                  const session = sessions.find((s) => s.assetId === asset.id)
                  return (
                    <div
                      key={asset.id}
                      className={`p-3 rounded cursor-pointer hover:bg-gray-50 ${
                        activeSessionId === session?.id ? 'bg-blue-50 border border-blue-300' : ''
                      }`}
                      onClick={() => {
                        if (session) {
                          setActiveSessionId(session.id)
                        } else {
                          handleConnect(asset)
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="font-medium text-sm"
                              title={asset.ip ? `IP: ${asset.ip}${asset.ssh_port && asset.ssh_port !== 22 ? `:${asset.ssh_port}` : ''}` : '未设置 IP'}
                            >
                              {asset.name}
                            </div>
                            <button
                              onClick={(e) => handleToggleFavorite(asset.id, e)}
                              className={`text-sm ${
                                favorites.has(asset.id)
                                  ? 'text-yellow-500'
                                  : 'text-gray-400 hover:text-yellow-500'
                              }`}
                            >
                              ★
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {asset.type} {asset.project?.name && `• ${asset.project.name}`}
                          </div>
                          {session && (
                            <div className="text-xs mt-1">
                              <span
                                className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                  session.connected ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                              />
                              {session.connected ? '已连接' : '已断开'}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {session && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCloseSession(session.id)
                              }}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              断开
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                      )
                    })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {sessions.length > 0 && (
            <div className="bg-gray-100 border-b flex items-center px-4">
              {!showHostList && (
                <button
                  onClick={() => setShowHostList(true)}
                  className="mr-2 px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
                >
                  主机清单
                </button>
              )}
              <div className="flex-1 flex overflow-x-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`px-4 py-2 cursor-pointer border-b-2 ${
                      activeSessionId === session.id
                        ? 'border-blue-500 bg-white'
                        : 'border-transparent hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{session.assetName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseSession(session.id)
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 bg-black p-2 overflow-hidden">
            {activeSessionId ? (
              <div ref={terminalContainerRef} className="h-full w-full" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                {sessions.length === 0 ? (
                  <div className="text-center">
                    <p className="mb-4">没有活动的终端会话</p>
                    <button
                      onClick={() => setShowHostList(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      从主机清单连接
                    </button>
                  </div>
                ) : (
                  <div>选择一个会话或创建新连接</div>
                )}
              </div>
            )}
          </div>
        </div>

        {showConnectDialog && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">
                连接到 {selectedAsset.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm">选择凭证（可选）</label>
                  <select
                    value={connectForm.credential_id}
                    onChange={(e) => {
                      const credId = e.target.value
                      const selectedCred = availableCredentials.find(c => c.id === credId)
                      setSelectedCredential(selectedCred || null)
                      setConnectForm({
                        ...connectForm,
                        credential_id: credId,
                        username: selectedCred ? selectedCred.username : connectForm.username,
                        password: '',
                      })
                    }}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">手动输入</option>
                    {availableCredentials
                      .filter(cred => !cred.asset_id)
                      .map((cred) => (
                        <option key={cred.id} value={cred.id}>
                          {cred.name} ({cred.username}) - {cred.auth_type === 'key' ? '密钥' : '密码'}
                        </option>
                      ))}
                  </select>
                </div>
                {!connectForm.credential_id && (
                  <div>
                    <label className="block mb-1 text-sm">用户名</label>
                    <input
                      type="text"
                      value={connectForm.username}
                      onChange={(e) =>
                        setConnectForm({ ...connectForm, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="root"
                      autoFocus
                    />
                  </div>
                )}
                {selectedCredential?.auth_type !== 'key' && (
                  <div>
                    <label className="block mb-1 text-sm">
                      {connectForm.credential_id ? '密码（如凭证有密码）' : '密码'}
                    </label>
                    <input
                      type="password"
                      value={connectForm.password}
                      onChange={(e) =>
                        setConnectForm({ ...connectForm, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder={connectForm.credential_id ? '可选，如果凭证需要密码' : '输入密码'}
                    />
                  </div>
                )}
                {selectedCredential?.auth_type === 'key' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    🔑 将使用密钥认证,需输入密码
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleConnectSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  连接
                </button>
                <button
                  onClick={() => setShowConnectDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}