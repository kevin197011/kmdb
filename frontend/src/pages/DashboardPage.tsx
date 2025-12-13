import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress, List, Tag, Spin, Empty, Typography, Space } from 'antd'
import {
  DatabaseOutlined,
  UserOutlined,
  FolderOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  GlobalOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import api from '../services/api'

const { Text } = Typography

interface DashboardStats {
  overview: {
    total_assets: number
    total_users: number
    total_projects: number
    total_groups: number
  }
  assets_by_status: {
    active: number
    inactive: number
    maintenance: number
  }
  assets_by_type: Record<string, number>
  project_distribution: Record<string, number>
  recent_activities: Array<{
    id: string
    module: string
    action: string
    user_id: string
    resource_id: string
    details: string
    created_at: string
  }>
}

// 统计卡片配置
const statCardConfigs = [
  {
    key: 'total_assets',
    title: '资产总数',
    icon: <DatabaseOutlined />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea'
  },
  {
    key: 'total_users',
    title: '用户总数',
    icon: <UserOutlined />,
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#11998e'
  },
  {
    key: 'total_projects',
    title: '项目总数',
    icon: <FolderOutlined />,
    gradient: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    color: '#fc4a1a'
  },
  {
    key: 'total_groups',
    title: '团队总数',
    icon: <TeamOutlined />,
    gradient: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)',
    color: '#00b4db'
  }
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#52c41a'
      case 'inactive': return '#d9d9d9'
      case 'maintenance': return '#faad14'
      default: return '#d9d9d9'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '运行中'
      case 'inactive': return '已停止'
      case 'maintenance': return '维护中'
      default: return status
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      server: '服务器',
      vm: '虚拟机',
      network_device: '网络设备',
      application: '应用',
    }
    return labels[type] || type
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'server': return <CloudServerOutlined />
      case 'vm': return <DesktopOutlined />
      case 'network_device': return <GlobalOutlined />
      case 'application': return <AppstoreOutlined />
      default: return <DatabaseOutlined />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'green'
      case 'update': return 'blue'
      case 'delete': return 'red'
      case 'connect': return 'cyan'
      default: return 'default'
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      connect: '连接',
      view: '查看',
    }
    return labels[action] || action
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!stats) {
    return <Empty description="加载统计数据失败" />
  }

  const totalStatusAssets = Object.values(stats.assets_by_status).reduce((a, b) => a + b, 0)

  return (
    <div className="fade-in">
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
          工作台
        </Text>
        <Text type="secondary" style={{ marginLeft: 12 }}>
          欢迎使用 KMDB DevOps 资产管理平台
        </Text>
      </div>

      {/* 概览统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCardConfigs.map((config) => (
          <Col xs={24} sm={12} md={12} lg={8} xl={4.8} key={config.key} style={{ flex: 1 }}>
            <Card
              bordered={false}
              style={{
                borderRadius: 8,
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>{config.title}</Text>
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <Statistic
                      value={stats.overview[config.key as keyof typeof stats.overview]}
                      valueStyle={{ fontSize: 28, fontWeight: 600, color: config.color }}
                    />
                  </div>
                  <Space size={4}>
                    <RiseOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: '#52c41a' }}>较昨日持平</Text>
                  </Space>
                </div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  background: config.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: '#fff',
                  boxShadow: `0 4px 12px ${config.color}40`
                }}>
                  {config.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 资产状态分布 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <div style={{
                  width: 4,
                  height: 16,
                  background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)',
                  borderRadius: 2
                }} />
                <span>资产状态分布</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            {Object.entries(stats.assets_by_status).map(([status, count]) => (
              <div key={status} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Space>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: getStatusColor(status)
                    }} />
                    <Text>{getStatusLabel(status)}</Text>
                  </Space>
                  <Space>
                    <Text strong>{count}</Text>
                    <Text type="secondary">
                      ({totalStatusAssets > 0 ? Math.round((count / totalStatusAssets) * 100) : 0}%)
                    </Text>
                  </Space>
                </div>
                <Progress
                  percent={totalStatusAssets > 0 ? Math.round((count / totalStatusAssets) * 100) : 0}
                  strokeColor={getStatusColor(status)}
                  showInfo={false}
                  strokeWidth={8}
                  style={{ marginBottom: 0 }}
                />
              </div>
            ))}
          </Card>
        </Col>

        {/* 资产类型分布 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <div style={{
                  width: 4,
                  height: 16,
                  background: 'linear-gradient(180deg, #722ed1 0%, #531dab 100%)',
                  borderRadius: 2
                }} />
                <span>资产类型分布</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            {Object.entries(stats.assets_by_type).length > 0 ? (
              <Row gutter={[16, 16]}>
                {Object.entries(stats.assets_by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <Col span={12} key={type}>
                      <div style={{
                        padding: 16,
                        background: '#f5f7fa',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: '#722ed1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 18
                        }}>
                          {getTypeIcon(type)}
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{getTypeLabel(type)}</Text>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>{count}</div>
                        </div>
                      </div>
                    </Col>
                  ))
                }
              </Row>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 项目资产分布 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <div style={{
                  width: 4,
                  height: 16,
                  background: 'linear-gradient(180deg, #fa8c16 0%, #d46b08 100%)',
                  borderRadius: 2
                }} />
                <span>项目资产分布</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
            bodyStyle={{ maxHeight: 320, overflowY: 'auto' }}
          >
            {Object.entries(stats.project_distribution).length > 0 ? (
              Object.entries(stats.project_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([project, count], index) => (
                  <div key={project} style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    background: index % 2 === 0 ? '#fafafa' : '#fff',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Space>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: `hsl(${(index * 40) % 360}, 70%, 60%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {index + 1}
                      </div>
                      <Text ellipsis style={{ maxWidth: 200 }}>{project}</Text>
                    </Space>
                    <Tag color="orange">{count} 个资产</Tag>
                  </div>
                ))
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <div style={{
                  width: 4,
                  height: 16,
                  background: 'linear-gradient(180deg, #13c2c2 0%, #08979c 100%)',
                  borderRadius: 2
                }} />
                <span>最近活动</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
            bodyStyle={{ maxHeight: 320, overflowY: 'auto', padding: 0 }}
          >
            {stats.recent_activities && stats.recent_activities.length > 0 ? (
              <List
                size="small"
                dataSource={stats.recent_activities}
                renderItem={(activity) => (
                  <List.Item style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ marginBottom: 8 }}>
                        <Tag color="processing">{activity.module}</Tag>
                        <Tag color={getActionColor(activity.action)}>{getActionLabel(activity.action)}</Tag>
                      </div>
                      {activity.details && (
                        <Text ellipsis style={{
                          display: 'block',
                          marginBottom: 8,
                          color: 'rgba(0,0,0,0.65)'
                        }}>
                          {activity.details}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                        {new Date(activity.created_at).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无活动" style={{ padding: 48 }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
