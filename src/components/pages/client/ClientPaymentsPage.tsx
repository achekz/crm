import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Typography,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Payment } from '../../../store/slices/paymentsSlice';

const { Title, Text } = Typography;
const { Search } = Input;

const ClientPaymentsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { payments } = useSelector((state: RootState) => state.payments);
  const { invoices } = useSelector((state: RootState) => state.invoices);
  const [searchText, setSearchText] = useState('');

  // Filtrer les paiements pour le client connecté
  const clientPayments = payments && Array.isArray(payments) && user
    ? payments.filter(pay => pay.clientId === user.id)
    : [];
    
  const clientInvoices = invoices && Array.isArray(invoices) && user
    ? invoices.filter(inv => inv.clientId === user.id)
    : [];

  const filteredPayments = clientPayments && Array.isArray(clientPayments)
    ? clientPayments.filter(payment =>
        (payment.reference && payment.reference.toLowerCase().includes(searchText.toLowerCase()))
      )
    : [];

  const getMethodIcon = (method: string) => {
    const icons = {
      bank_transfer: <BankOutlined />,
      check: <WalletOutlined />,
      cash: <DollarOutlined />,
      card: <CreditCardOutlined />,
    };
    return icons[method as keyof typeof icons];
  };

  const getMethodText = (method: string) => {
    const texts = {
      bank_transfer: 'Virement bancaire',
      check: 'Chèque',
      cash: 'Espèces',
      card: 'Carte bancaire',
    };
    return texts[method as keyof typeof texts];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'orange',
      completed: 'green',
      failed: 'red',
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusText = (status: string) => {
    const texts = {
      pending: 'En cours',
      completed: 'Complété',
      failed: 'Échoué',
    };
    return texts[status as keyof typeof texts];
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Payment, b: Payment) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Facture',
      dataIndex: 'invoiceId',
      key: 'invoiceId',
      render: (invoiceId: string) => {
        if (!invoices || !Array.isArray(invoices)) return '-';
        const invoice = invoices.find(inv => inv.id === invoiceId);
        return invoice ? invoice.number : '-';
      },
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} TND
        </Text>
      ),
      sorter: (a: Payment, b: Payment) => a.amount - b.amount,
    },
    {
      title: 'Méthode',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Space>
          {getMethodIcon(method)}
          {getMethodText(method)}
        </Space>
      ),
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      render: (reference: string) => reference || '-',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
  ];

  // Calculs des statistiques
  const totalPaid = clientPayments && Array.isArray(clientPayments)
    ? clientPayments.reduce((sum, p) => sum + p.amount, 0)
    : 0;
    
  const completedPayments = clientPayments && Array.isArray(clientPayments)
    ? clientPayments.filter(p => p.status === 'completed')
    : [];
    
  const pendingPayments = clientPayments && Array.isArray(clientPayments)
    ? clientPayments.filter(p => p.status === 'pending')
    : [];
    
  const totalInvoices = clientInvoices && Array.isArray(clientInvoices)
    ? clientInvoices.reduce((sum, inv) => sum + inv.total, 0)
    : 0;
    
  const remainingAmount = totalInvoices - totalPaid;

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Mes paiements</Title>
        <Text type="secondary">Historique de vos paiements</Text>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Payé" 
              value={totalPaid} 
              suffix="TND"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Paiements complétés" 
              value={completedPayments.length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="En cours" 
              value={pendingPayments.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Reste à payer" 
              value={remainingAmount} 
              suffix="TND"
              valueStyle={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Rechercher par référence..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          
          <Text type="secondary">
            {filteredPayments.length} paiement(s) trouvé(s)
          </Text>
        </Space>

        <Table
          dataSource={filteredPayments}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} paiements`,
          }}
        />
      </Card>
    </div>
  );
};

export default ClientPaymentsPage;