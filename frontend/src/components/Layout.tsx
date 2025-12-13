import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Button,
  Space,
  Typography,
  Breadcrumb,
  theme
} from 'antd'
import {
  DashboardOutlined,
  FolderOutlined,
  DatabaseOutlined,
  KeyOutlined,
  CodeOutlined,
  UserOutlined,
  TeamOutlined,
  LockOutlined,
  ApiOutlined,
  AuditOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import api from '../services/api'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface CurrentUser {
  id: string
  username: string
  email: string
  avatar?: string
}

type MenuItem = Required<MenuProps>['items'][number]

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { key, icon, children, label } as MenuItem
}

// 路由标题映射
const routeTitles: Record<string, { title: string; parent?: string }> = {
  '/dashboard': { title: '仪表盘' },
  '/projects': { title: '项目管理', parent: '资产管理' },
  '/assets': { title: '资产管理', parent: '资产管理' },
  '/asset-credentials': { title: '主机密钥', parent: '资产管理' },
  '/webssh': { title: 'WebSSH', parent: '资产管理' },
  '/users': { title: '用户管理', parent: '用户与权限' },
  '/teams': { title: '团队管理', parent: '用户与权限' },
  '/scoped-permissions': { title: '权限管理', parent: '用户与权限' },
  '/api-tokens': { title: 'API Token', parent: '系统管理' },
  '/audit': { title: '审计日志', parent: '系统管理' },
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordForm] = Form.useForm()
  const { token } = theme.useToken()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setCurrentUser(response.data)
    } catch (error) {
      console.error('获取当前用户信息失败:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    message.success('已退出登录')
    navigate('/login')
  }

  const handleChangePassword = async (values: { old_password: string; new_password: string; confirm_password: string }) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的密码不一致')
      return
    }
    if (values.new_password.length < 6) {
      message.error('密码长度至少为6位')
      return
    }

    setPasswordLoading(true)
    try {
      await api.patch(`/users/${currentUser?.id}/password`, {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      message.success('密码修改成功')
      setPasswordModalOpen(false)
      passwordForm.resetFields()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      message.error(err.response?.data?.error || '密码修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  // 侧边栏菜单项
  const menuItems: MenuItem[] = [
    getItem('仪表盘', '/dashboard', <DashboardOutlined />),

    getItem('资产管理', 'assets-group', <DatabaseOutlined />, [
      getItem('项目管理', '/projects', <FolderOutlined />),
      getItem('资产管理', '/assets', <DatabaseOutlined />),
      getItem('主机密钥', '/asset-credentials', <KeyOutlined />),
      getItem('WebSSH', '/webssh', <CodeOutlined />),
    ]),

    getItem('用户与权限', 'users-group', <TeamOutlined />, [
      getItem('用户管理', '/users', <UserOutlined />),
      getItem('团队管理', '/teams', <TeamOutlined />),
      getItem('权限管理', '/scoped-permissions', <LockOutlined />),
    ]),

    getItem('系统管理', 'system-group', <SettingOutlined />, [
      getItem('API Token', '/api-tokens', <ApiOutlined />),
      getItem('审计日志', '/audit', <AuditOutlined />),
    ]),
  ]

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => setProfileModalOpen(true),
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密码',
      onClick: () => setPasswordModalOpen(true),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ]

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [location.pathname]
  }

  // 获取当前展开的菜单
  const getOpenKeys = () => {
    const path = location.pathname
    if (['/projects', '/assets', '/asset-credentials', '/webssh'].includes(path)) {
      return ['assets-group']
    }
    if (['/users', '/teams', '/scoped-permissions'].includes(path)) {
      return ['users-group']
    }
    if (['/api-tokens', '/audit'].includes(path)) {
      return ['system-group']
    }
    return []
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (!key.endsWith('-group')) {
      navigate(key)
    }
  }

  // 生成面包屑
  const getBreadcrumbItems = () => {
    const routeInfo = routeTitles[location.pathname]
    const items: Array<{ title: React.ReactNode; onClick?: () => void; className?: string }> = [
      {
        title: <><HomeOutlined /> 首页</>,
        onClick: () => navigate('/dashboard'),
        className: 'cursor-pointer',
      },
    ]
    if (routeInfo?.parent) {
      items.push({ title: routeInfo.parent })
    }
    if (routeInfo?.title) {
      items.push({ title: routeInfo.title })
    }
    return items
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 深色侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0 8px' : '0 24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(24, 144, 255, 0.5)',
          }}>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>K</span>
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 12 }}>
              <div style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.2,
                letterSpacing: 1
              }}>
                KMDB
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.2 }}>
                DevOps 资产管理
              </div>
            </div>
          )}
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 0,
            marginTop: 8,
          }}
        />
      </Sider>

      {/* 主内容区域 */}
      <Layout style={{
        marginLeft: collapsed ? 80 : 256,
        transition: 'margin-left 0.2s',
        background: '#f5f7fa',
      }}>
        {/* 顶部导航栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 56,
          }}
        >
          <Space size={16}>
            {/* 折叠按钮 */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            {/* 面包屑 */}
            <Breadcrumb items={getBreadcrumbItems()} />
          </Space>

          {/* 右侧用户区域 */}
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <div style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 20,
              transition: 'background 0.2s',
            }}
            className="user-dropdown-trigger"
            >
              <Avatar
                size={32}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  marginRight: 8
                }}
              >
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Text strong style={{ marginRight: 4 }}>{currentUser?.username || '用户'}</Text>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区域 */}
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* 个人信息弹窗 */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>个人信息</span>
          </Space>
        }
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setProfileModalOpen(false)}>
            关闭
          </Button>,
        ]}
        centered
        width={480}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Avatar
            size={80}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
          >
            {currentUser?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
            {currentUser?.username}
          </div>
          <div style={{ color: token.colorTextSecondary }}>
            {currentUser?.email}
          </div>
        </div>
        <Descriptions
          column={1}
          bordered
          size="small"
          labelStyle={{ width: 100, background: '#fafafa' }}
        >
          <Descriptions.Item label="用户名">{currentUser?.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{currentUser?.email}</Descriptions.Item>
          <Descriptions.Item label="用户ID">
            <Text code copyable={{ text: currentUser?.id }} style={{ fontSize: 12 }}>
              {currentUser?.id}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>修改密码</span>
          </Space>
        }
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false)
          passwordForm.resetFields()
        }}
        footer={null}
        centered
        width={420}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" size="large" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" size="large" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
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
            <Input.Password placeholder="请再次输入新密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button size="large" onClick={() => {
                setPasswordModalOpen(false)
                passwordForm.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={passwordLoading}>
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
