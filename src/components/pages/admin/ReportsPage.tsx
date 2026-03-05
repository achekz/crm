import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Empty, Spin, DatePicker, Button, Space, Table, Tag } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  DollarOutlined, 
  UserOutlined, 
  FileTextOutlined,
  CalendarOutlined,
  MessageOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { 
  getDashboardStats, 
  getFinancialReports, 
  getClientReports, 
  getAppointmentReports,
  DashboardStats,
  FinancialReports,
  ClientReports,
  AppointmentReports
} from '../../../services/reportService';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

dayjs.locale('fr');

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [financialReports, setFinancialReports] = useState<FinancialReports | null>(null);
  const [clientReports, setClientReports] = useState<ClientReports | null>(null);
  const [appointmentReports, setAppointmentReports] = useState<AppointmentReports | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const [dashboard, financial, clients, appointments] = await Promise.all([
        getDashboardStats(),
        getFinancialReports(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
        getClientReports(),
        getAppointmentReports(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'))
      ]);

      setDashboardStats(dashboard);
      setFinancialReports(financial);
      setClientReports(clients);
      setAppointmentReports(appointments);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
    if (dates) {
      setDateRange(dates);
    } else {
      setDateRange([
        dayjs().startOf('year'),
        dayjs().endOf('year')
      ]);
    }
  };

  const handleRefresh = () => {
    fetchAllReports();
  };

  const handleExport = () => {
    // Generate and download report
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: dateRange[0].format('YYYY-MM-DD'),
        end: dateRange[1].format('YYYY-MM-DD')
      },
      dashboard: dashboardStats,
      financial: financialReports,
      clients: clientReports,
      appointments: appointmentReports
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-report-${dayjs().format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Dashboard Overview Cards
  const overviewCards = dashboardStats ? [
    {
      title: 'Total Clients',
      value: dashboardStats.clients.total,
      icon: <UserOutlined />,
      color: '#1890ff',
      trend: dashboardStats.clients.active > 0 ? 'up' : 'down'
    },
    {
      title: 'Total Revenue',
      value: `€${dashboardStats.invoices.totalAmount.toLocaleString()}`,
      icon: <DollarOutlined />,
      color: '#52c41a',
      trend: 'up'
    },
    {
      title: 'Pending Amount',
      value: `€${dashboardStats.invoices.pendingAmount.toLocaleString()}`,
      icon: <FileTextOutlined />,
      color: '#faad14',
      trend: 'down'
    },
    {
      title: 'Scheduled Appointments',
      value: dashboardStats.appointments.scheduled,
      icon: <CalendarOutlined />,
      color: '#722ed1',
      trend: 'up'
    }
  ] : [];

  // Recent Activity Table Columns
  const recentActivityColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'invoice' ? 'blue' : 'green'}>
          {type === 'invoice' ? '📄 Invoice' : '💳 Payment'}
        </Tag>
      )
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `€${amount.toLocaleString()}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'paid' ? 'green' : status === 'sent' ? 'blue' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY')
    }
  ];

  // Combine recent invoices and payments
  const recentActivity = [
    ...(dashboardStats?.recentActivity.invoices || []).map((item: any) => ({
      ...item,
      type: 'invoice',
      key: `invoice-${item.id}`
    })),
    ...(dashboardStats?.recentActivity.payments || []).map((item: any) => ({
      ...item,
      type: 'payment',
      key: `payment-${item.id}`
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <MessageOutlined /> Reports & Analytics
            </Title>
            <Text type="secondary">Comprehensive business insights and analytics</Text>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="MMM DD, YYYY"
              />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Overview Cards */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {overviewCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
                suffix={card.trend === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Section */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {/* Monthly Revenue Trend */}
        <Col span={12}>
          <Card title="Monthly Revenue Trend" style={{ height: '400px' }}>
            {financialReports?.revenueByPeriod && financialReports.revenueByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialReports.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={(item) => `${item.period.month}/${item.period.year}`} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No revenue data available" />
            )}
          </Card>
        </Col>

        {/* Payment Methods Distribution */}
        <Col span={12}>
          <Card title="Payment Methods" style={{ height: '400px' }}>
            {financialReports?.paymentMethods && financialReports.paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financialReports.paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, percent }) => `${method} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalAmount"
                  >
                    {financialReports.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`€${Number(value).toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No payment method data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Client & Appointment Analytics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {/* Client Acquisition */}
        <Col span={12}>
          <Card title="Client Acquisition" style={{ height: '400px' }}>
            {clientReports?.acquisition && clientReports.acquisition.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientReports.acquisition}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={(item) => `${item.month}/${item.year}`} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newClients" fill="#82ca9d" name="New Clients" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No client acquisition data available" />
            )}
          </Card>
        </Col>

        {/* Appointment Types */}
        <Col span={12}>
          <Card title="Appointment Types" style={{ height: '400px' }}>
            {appointmentReports?.byType && appointmentReports.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentReports.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#ffc658" name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No appointment data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Activity Table */}
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Recent Activity">
            {recentActivity.length > 0 ? (
              <Table
                columns={recentActivityColumns}
                dataSource={recentActivity}
                pagination={{ pageSize: 10 }}
                rowKey="key"
              />
            ) : (
              <Empty description="No recent activity available" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportsPage;
