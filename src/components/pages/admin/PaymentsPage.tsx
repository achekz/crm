import React, { useState, useEffect } from 'react';
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
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  message,
  Spin,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { 
  Payment, 
  fetchAllPayments,
  createNewPayment,
  updateExistingPayment,
  removePayment
} from '../../../store/slices/paymentsSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const PaymentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { payments, loading, error } = useSelector((state: RootState) => state.payments);
  const { invoices } = useSelector((state: RootState) => state.invoices);
  const { clients } = useSelector((state: RootState) => state.clients);
  const auth = useSelector((state: RootState) => state.auth);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch payments when component mounts
  useEffect(() => {
    dispatch(fetchAllPayments());
  }, [dispatch]);





  const filteredPayments = payments && Array.isArray(payments)
    ? payments.filter(payment =>
        payment.clientName.toLowerCase().includes(searchText.toLowerCase()) ||
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
      bank_transfer: 'Virement',
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
      pending: 'En attente',
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
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
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
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
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
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Payment) => (
        <Space>
          <Button 
            type="text" 
            onClick={() => {
              Modal.confirm({
                title: 'Marquer comme complété',
                content: 'Confirmer que ce paiement a été reçu ?',
                onOk: () => {
                  dispatch(updateExistingPayment({ 
                    id: record.id, 
                    data: { status: 'completed' } 
                  }));
                  message.success('Paiement marqué comme complété');
                }
              });
            }}
            disabled={record.status === 'completed'}
          >
            Valider
          </Button>
          <Button
            type="text"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Supprimer le paiement',
                content: 'Êtes-vous sûr de vouloir supprimer ce paiement ?',
                onOk: () => {
                  dispatch(removePayment(record.id));
                  message.success('Paiement supprimé');
                }
              });
            }}
          >
            Supprimer
          </Button>
        </Space>
      )
    }
  ];

  const handleSubmit = async (values: any) => {
    try {
      if (!invoices || !Array.isArray(invoices)) {
        message.error('Erreur: Données des factures non disponibles');
        return;
      }
      
      const selectedInvoice = invoices.find(inv => inv.id === values.invoiceId);
      const selectedClient = clients && Array.isArray(clients) ? 
        clients.find(c => c.id === selectedInvoice?.clientId) : undefined;

      if (!selectedInvoice || !selectedClient) {
        message.error('Erreur: Facture ou client non trouvé');
        return;
      }

      const paymentData = {
        invoiceId: values.invoiceId,
        clientId: selectedInvoice.clientId,
        clientName: selectedClient.name,
        amount: values.amount,
        date: values.date.format('YYYY-MM-DD'),
        method: values.method,
        status: values.status || 'completed',
        reference: values.reference,
        notes: values.notes,
      };

      await dispatch(createNewPayment(paymentData)).unwrap();
      message.success('Paiement enregistré avec succès');
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error || 'Une erreur est survenue lors de l\'enregistrement du paiement');
    }
  };

  // Statistiques
  const totalPayments = payments && Array.isArray(payments)
    ? payments.reduce((sum, p) => sum + p.amount, 0)
    : 0;
    
  const completedPayments = payments && Array.isArray(payments)
    ? payments.filter(p => p.status === 'completed')
    : [];
    
  const pendingPayments = payments && Array.isArray(payments)
    ? payments.filter(p => p.status === 'pending')
    : [];
    
  const thisMonthPayments = payments && Array.isArray(payments)
    ? payments.filter(p => dayjs(p.date).isSame(dayjs(), 'month'))
            .reduce((sum, p) => sum + p.amount, 0)
    : 0;

  // Show loading state
  if (loading && payments.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Show error state
  if (error && payments.length === 0) {
    return (
      <Alert 
        message="Erreur" 
        description={`Impossible de charger les paiements: ${error}`}
        type="error" 
        showIcon 
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Gestion des paiements</Title>
        <Text type="secondary">Suivez vos encaissements</Text>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total encaissé" 
              value={totalPayments} 
              suffix="TND"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Ce mois" 
              value={thisMonthPayments} 
              suffix="TND"
              valueStyle={{ color: '#1890ff' }}
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
              title="En attente" 
              value={pendingPayments.length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Rechercher un paiement..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setModalVisible(true);
              form.resetFields();
            }}
          >
            Nouveau paiement
          </Button>

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
          loading={loading}
        />
      </Card>

      {/* Modal de création */}
      <Modal
        title="Enregistrer un paiement"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
            status: 'completed',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="invoiceId"
                label="Facture"
                rules={[{ required: true, message: 'La facture est requise' }]}
              >
                <Select placeholder="Sélectionner une facture">
                  {invoices && Array.isArray(invoices) ? invoices.filter(inv => inv.status !== 'paid').map(invoice => (
                    <Option key={invoice.id} value={invoice.id}>
                      {invoice.number} - {invoice.clientName} ({invoice.total.toLocaleString()} TND)
                    </Option>
                  )) : null}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date de paiement"
                rules={[{ required: true, message: 'La date est requise' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Montant"
                rules={[{ required: true, message: 'Le montant est requis' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="TND"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="method"
                label="Méthode de paiement"
                rules={[{ required: true, message: 'La méthode est requise' }]}
              >
                <Select placeholder="Sélectionner une méthode">
                  <Option value="bank_transfer">Virement bancaire</Option>
                  <Option value="check">Chèque</Option>
                  <Option value="cash">Espèces</Option>
                  <Option value="card">Carte bancaire</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reference" label="Référence">
                <Input placeholder="Numéro de référence" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Statut">
                <Select>
                  <Option value="completed">Complété</Option>
                  <Option value="pending">En attente</Option>
                  <Option value="failed">Échoué</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Notes ou commentaires" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;