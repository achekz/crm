import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Progress, Button } from 'antd';
import { 
  DollarOutlined, 
  UserOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

const { Title, Text } = Typography;

const AdminDashboard: React.FC = () => {
  const { clients } = useSelector((state: RootState) => state.clients);
  const { invoices } = useSelector((state: RootState) => state.invoices);
  const { payments } = useSelector((state: RootState) => state.payments);

  // Calculs des statistiques
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalClients = clients.length;
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;

  // Données pour les graphiques
  const revenueData = [
    { month: 'Jan', revenue: 32000 },
    { month: 'Fév', revenue: 28000 },
    { month: 'Mar', revenue: 35000 },
    { month: 'Avr', revenue: 42000 },
    { month: 'Mai', revenue: 38000 },
    { month: 'Juin', revenue: 45000 },
  ];

  const clientsData = [
    { month: 'Jan', clients: 12 },
    { month: 'Fév', clients: 15 },
    { month: 'Mar', clients: 18 },
    { month: 'Avr', clients: 22 },
    { month: 'Mai', clients: 25 },
    { month: 'Juin', clients: 28 },
  ];

  // Factures récentes
  const recentInvoices = invoices.slice(0, 5);

  const invoiceColumns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Montant',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number) => `${amount.toLocaleString()} TND`,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = {
          draft: 'default',
          sent: 'blue',
          paid: 'green',
          overdue: 'red',
          cancelled: 'red',
        }[status];
        const text = {
          draft: 'Brouillon',
          sent: 'Envoyée',
          paid: 'Payée',
          overdue: 'En retard',
          cancelled: 'Annulée',
        }[status];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="link" icon={<EyeOutlined />}>
          Voir
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Tableau de bord</Title>
        <Text type="secondary">Vue d'ensemble de votre activité</Text>
      </div>

      {/* Statistiques principales */}
      <div className="stats-grid">
        <Card className="stat-card revenue">
          <Statistic
            title="Chiffre d'affaires"
            value={revenueData.reduce((sum, d) => sum + d.revenue, 0)}
            prefix={<RiseOutlined />}
            suffix="TND"
            valueStyle={{ color: '#3f8600' }}
          />
          <div className="stat-change">
            <ArrowUpOutlined /> +12.5% ce mois
          </div>
        </Card>

        <Card className="stat-card clients">
          <Statistic
            title={<span className="stat-title">Clients actifs</span>}
            value={totalClients}
            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<UserOutlined />}
          />
          <div className="stat-change">
            <ArrowUpOutlined /> +3 nouveaux
          </div>
        </Card>

        <Card className="stat-card invoices">
          <Statistic
            title={<span className="stat-title">Factures émises</span>}
            value={totalInvoices}
            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<FileTextOutlined />}
          />
          <div className="stat-change">
            <ArrowUpOutlined /> +2 cette semaine
          </div>
        </Card>

        <Card className="stat-card pending">
          <Statistic
            title={<span className="stat-title">En attente</span>}
            value={pendingInvoices}
            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<ClockCircleOutlined />}
          />
          <div className="stat-change">
            <ArrowDownOutlined /> -1 depuis hier
          </div>
        </Card>
      </div>

      {/* Graphiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Évolution du chiffre d'affaires" className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} TND`, 'Chiffre d\'affaires']} />
                <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Nouveaux clients" className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}`, 'Nouveaux clients']} />
                <Bar dataKey="clients" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Activité récente */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Factures récentes" extra={<Button type="link">Voir tout</Button>}>
            <Table
              dataSource={recentInvoices}
              columns={invoiceColumns}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Taux de conversion">
            <div style={{ marginBottom: 16 }}>
              <Text strong>Devis → Factures</Text>
              <Progress percent={85} status="active" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Factures → Paiements</Text>
              <Progress percent={92} status="active" />
            </div>
            <div>
              <Text strong>Satisfaction client</Text>
              <Progress percent={96} status="active" strokeColor="#52c41a" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;