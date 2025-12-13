import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Typography, Alert, Checkbox, Space } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Title, Text, Link } = Typography

interface LoginForm {
  username: string
  password: string
  remember: boolean
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', values)
      const { access_token, refresh_token } = response.data

      if (!access_token || !refresh_token) {
        setError('登录响应格式错误，请检查后端配置')
        setLoading(false)
        return
      }

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      window.dispatchEvent(new Event('authStateChange'))
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string }
      setError(error.response?.data?.error || error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f0f2f5',
      }}
    >
      {/* 左侧品牌区域 */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 50%, #0050b3 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰图案 */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }} />

        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          {/* Logo */}
          <div style={{
            width: 80,
            height: 80,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: 40, fontWeight: 'bold', color: '#fff' }}>K</span>
          </div>

          <Title level={1} style={{ color: '#fff', marginBottom: 16, fontWeight: 300 }}>
            KMDB
          </Title>
          <Title level={3} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400, marginBottom: 24 }}>
            DevOps 资产管理平台
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.8 }}>
            一站式 DevOps 资产管理解决方案，
            <br />
            帮助您高效管理服务器、项目和团队资源。
          </Text>

          <div style={{ marginTop: 48, display: 'flex', gap: 32, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: '#fff' }}>500+</div>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>服务器资产</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: '#fff' }}>100+</div>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>活跃项目</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: '#fff' }}>99.9%</div>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>系统可用性</div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div
        style={{
          width: 480,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 64px',
          background: '#fff',
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            欢迎回来
          </Title>
          <Text type="secondary">
            请输入您的账号信息登录系统
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              placeholder="请输入用户名"
              autoComplete="username"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <Link style={{ color: '#1890ff' }}>忘记密码？</Link>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space direction="vertical" size={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              演示账号：<Text code>admin</Text> / <Text code>Admin123</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              © 2025 KMDB DevOps 资产管理平台
            </Text>
          </Space>
        </div>
      </div>
    </div>
  )
}
