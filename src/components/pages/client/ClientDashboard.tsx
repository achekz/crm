import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag, Button, Progress } from 'antd';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  RiseOutlined,
  CreditCardOutlined,
  UserOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { invoices } = useSelector((state: RootState) => state.invoices);
  const { payments } = useSelector((state: RootState) => state.payments);

  // Filtrer les données pour le client connecté
  const clientInvoices = invoices.filter(inv => inv.clientId === user?.id);
  const clientPayments = payments.filter(pay => pay.clientId === user?.id);

  // Calculs des statistiques
  const totalInvoices = clientInvoices.length;
  const paidInvoices = clientInvoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = clientInvoices.filter(inv => inv.status === 'sent').length;
  const totalAmount = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  // Factures récentes
  const recentInvoices = clientInvoices.slice(0, 5);

  // Prochains rendez-vous (mock data)
  const upcomingAppointments = [
    {
      id: '1',
      title: 'Réunion projet Q1',
      date: '2024-01-25',
      time: '14:00',
      type: 'Présentiel',
      location: 'Bureau Paris',
    },
    {
      id: '2',
      title: 'Suivi mensuel',
      date: '2024-02-01',
      time: '10:30',
      type: 'Visioconférence',
      location: 'En ligne',
    },
    {
      id: '3',
      title: 'Formation équipe',
      date: '2024-02-05',
      time: '09:00',
      type: 'Présentiel',
      location: 'Centre formation',
    },
  ];

  return (
    <div className="fade-in">
      {/* Welcome Section */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <Title level={1} style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'Merriweather, serif' }}>
              Bienvenue, {user?.name}
            </Title>
            <Text type="secondary" style={{ fontSize: '1.1rem', marginTop: '8px', display: 'block' }}>
              Voici un aperçu de votre compte chez {user?.company}
            </Text>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <Text type="secondary" style={{ fontSize: '0.9rem' }}>Dernière connexion</Text>
              <br />
              <Text strong>Aujourd'hui, 09:30</Text>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
              <UserOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="stats-grid">
        <Card className="stat-card metric-card-primary">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-title">Total factures</div>
              <div className="stat-value">{totalInvoices}</div>
              <div className="stat-change">
                <ArrowUpOutlined /> +2 ce mois
              </div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
              <FileTextOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        </Card>

        <Card className="stat-card metric-card-success">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-title">Factures payées</div>
              <div className="stat-value">{paidInvoices}</div>
              <div className="stat-change">
                <CheckCircleOutlined /> Excellent taux
              </div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircleOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        </Card>

        <Card className="stat-card metric-card-warning">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-title">En attente</div>
              <div className="stat-value">{pendingInvoices}</div>
              <div className="stat-change">
                <ClockCircleOutlined /> À traiter
              </div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <ClockCircleOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        </Card>

        <Card className="stat-card metric-card-danger">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-title">À payer</div>
              <div className="stat-value">{pendingAmount.toLocaleString()} TND</div>
              <div className="stat-change">
                <DollarOutlined /> Échéances proches
              </div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <DollarOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        </Card>
      </div>

      <Row gutter={[24, 24]}>
        {/* Factures récentes */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <FileTextOutlined className="text-teal-600" />
                <span>Factures récentes</span>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/client/invoices')}
                className="text-teal-600 hover:text-teal-700"
              >
                Voir toutes
              </Button>
            }
            className="slide-up"
          >
            <List
              dataSource={recentInvoices}
              renderItem={(invoice, index) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors duration-200 rounded-lg px-4 py-2"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  actions={[
                    <Tag 
                      color={invoice.status === 'paid' ? 'success' : 'warning'}
                      className="rounded-full"
                    >
                      {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                    </Tag>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <FileTextOutlined style={{ color: 'white', fontSize: '16px' }} />
                      </div>
                    }
                    title={
                      <div className="flex items-center justify-between">
                        <Text strong className="text-gray-800">{invoice.number}</Text>
                        <Text strong className="text-teal-600 text-lg">
                          {invoice.total.toLocaleString()} TND
                        </Text>
                      </div>
                    }
                    description={
                      <div className="text-gray-600">
                        <div>Émise le {invoice.date}</div>
                        <div>Échéance: {invoice.dueDate}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Prochains rendez-vous */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <CalendarOutlined className="text-teal-600" />
                <span>Prochains rendez-vous</span>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/client/appointments')}
                className="text-teal-600 hover:text-teal-700"
              >
                Planifier
              </Button>
            }
            className="slide-up"
          >
            <List
              dataSource={upcomingAppointments}
              renderItem={(appointment, index) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors duration-200 rounded-lg px-4 py-2"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  actions={[
                    <Button 
                      size="small" 
                      type="primary"
                      icon={<CalendarOutlined />}
                      className="rounded-lg"
                    >
                      {appointment.type === 'Visioconférence' ? 'Rejoindre' : 'Détails'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <CalendarOutlined style={{ color: 'white', fontSize: '16px' }} />
                      </div>
                    }
                    title={<Text strong className="text-gray-800">{appointment.title}</Text>}
                    description={
                      <div className="text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>{appointment.date} à {appointment.time}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Tag color="blue" className="rounded-full text-xs">
                            {appointment.type}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {appointment.location}
                          </Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Progression des paiements */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <RiseOutlined className="text-teal-600" />
                <span>Progression des paiements</span>
              </div>
            }
            className="slide-up"
          >
            <div style={{ marginBottom: 24 }}>
              <div className="flex justify-between items-center mb-2">
                <Text className="text-gray-600">Montant payé</Text>
                <Text strong className="text-teal-600">
                  {paidAmount.toLocaleString()} TND / {totalAmount.toLocaleString()} TND
                </Text>
              </div>
              <Progress 
                percent={Math.round((paidAmount / totalAmount) * 100)} 
                status="active"
                strokeColor={{
                  '0%': '#0d9488',
                  '100%': '#14b8a6',
                }}
                trailColor="#f1f5f9"
                strokeWidth={8}
                className="rounded-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Text className="text-gray-600">Factures traitées</Text>
                <Text strong className="text-green-600">
                  {paidInvoices} / {totalInvoices}
                </Text>
              </div>
              <Progress 
                percent={Math.round((paidInvoices / totalInvoices) * 100)} 
                status="active"
                strokeColor={{
                  '0%': '#4CAF50',
                  '100%': '#66bb6a',
                }}
                trailColor="#f1f5f9"
                strokeWidth={8}
                className="rounded-full"
              />
            </div>
          </Card>
        </Col>

        {/* Actions rapides */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <CreditCardOutlined className="text-teal-600" />
                <span>Actions rapides</span>
              </div>
            }
            className="slide-up"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/client/invoices')}
                  className="h-16 rounded-xl font-medium"
                >
                  Mes factures
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  size="large"
                  icon={<DollarOutlined />}
                  onClick={() => navigate('/client/payments')}
                  className="h-16 rounded-xl font-medium border-teal-200 text-teal-600 hover:bg-teal-50"
                >
                  Mes paiements
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  size="large"
                  icon={<CalendarOutlined />}
                  onClick={() => navigate('/client/appointments')}
                  className="h-16 rounded-xl font-medium border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  Rendez-vous
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/client/documents')}
                  className="h-16 rounded-xl font-medium border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Documents
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ClientDashboard;