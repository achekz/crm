import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Typography,
  Card,
  Modal,
  Descriptions,
  Divider,
  message,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { Invoice, fetchAllInvoices } from '../../../store/slices/invoicesSlice';
import { generateInvoicePdf } from '../../../services/invoiceService';
import OnlinePaymentModal from './OnlinePaymentModal';

const { Title, Text } = Typography;
const { Search } = Input;

const ClientInvoicesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { invoices, loading } = useSelector((state: RootState) => state.invoices);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Fetch invoices when component mounts
  useEffect(() => {
    dispatch(fetchAllInvoices());
  }, [dispatch]);

  // Filtrer les factures pour le client connecté
  const clientInvoices = invoices && Array.isArray(invoices) && user
    ? invoices.filter(inv => inv.clientId === user.id)
    : [];

  const filteredInvoices = clientInvoices && Array.isArray(clientInvoices)
    ? clientInvoices.filter(invoice =>
        invoice.number.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      paid: 'green',
      overdue: 'red',
      cancelled: 'red',
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Brouillon',
      sent: 'En attente',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée',
    };
    return texts[status as keyof typeof texts];
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const pdfBlob = await generateInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('PDF téléchargé avec succès');
    } catch (error) {
      message.error('Erreur lors du téléchargement du PDF');
    }
  };

  const handlePaymentSuccess = (result: any) => {
    message.success('Paiement effectué avec succès');
    setPaymentModalVisible(false);
    // Reload invoices to reflect new payment status
    dispatch(fetchAllInvoices());
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (number: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <Text strong>{number}</Text>
        </Space>
      ),
    },
    {
      title: 'Date d\'émission',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Invoice, b: Invoice) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Date d\'échéance',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: (a: Invoice, b: Invoice) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    },
    {
      title: 'Montant HT',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (amount: number) => (
        <Text>{amount.toLocaleString()} TND</Text>
      ),
    },
    {
      title: 'TVA',
      dataIndex: 'tax',
      key: 'tax',
      render: (amount: number) => (
        <Text>{amount.toLocaleString()} TND</Text>
      ),
    },
    {
      title: 'Total TTC',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
          {amount.toLocaleString()} TND
        </Text>
      ),
      sorter: (a: Invoice, b: Invoice) => a.total - b.total,
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
      render: (record: Invoice) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedInvoice(record);
              setModalVisible(true);
            }}
          >
            Voir
          </Button>
          <Button 
            type="text" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadPdf(record)}
          >
            PDF
          </Button>
          {record.status === 'sent' && (
            <Button 
              type="primary" 
              size="small"
              icon={<CreditCardOutlined />}
              onClick={() => {
                setSelectedInvoice(record);
                setPaymentModalVisible(true);
              }}
            >
              Payer
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Mes factures</Title>
        <Text type="secondary">Consultez et gérez vos factures</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Rechercher une facture..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          
          <Text type="secondary">
            {filteredInvoices.length} facture(s) trouvée(s)
          </Text>
        </Space>

        <Table
          dataSource={filteredInvoices}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} factures`,
          }}
          loading={loading}
        />
      </Card>

      {/* Modal de détail de facture */}
      <Modal
        title={`Facture ${selectedInvoice?.number}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={[
          <Button 
            key="download" 
            icon={<DownloadOutlined />}
            onClick={() => selectedInvoice && handleDownloadPdf(selectedInvoice)}
          >
            Télécharger PDF
          </Button>,
          selectedInvoice?.status === 'sent' && (
            <Button 
              key="pay" 
              type="primary" 
              icon={<CreditCardOutlined />}
              onClick={() => {
                setModalVisible(false);
                setPaymentModalVisible(true);
              }}
            >
              Payer maintenant
            </Button>
          ),
          <Button key="close" onClick={() => setModalVisible(false)}>
            Fermer
          </Button>,
        ]}
        width={700}
      >
        {selectedInvoice && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro">{selectedInvoice.number}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={getStatusColor(selectedInvoice.status)}>
                  {getStatusText(selectedInvoice.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date d'émission">{selectedInvoice.date}</Descriptions.Item>
              <Descriptions.Item label="Date d'échéance">{selectedInvoice.dueDate}</Descriptions.Item>
              <Descriptions.Item label="Client" span={2}>{selectedInvoice.clientName}</Descriptions.Item>
            </Descriptions>

            <Divider>Détail des prestations</Divider>

            <Table
              dataSource={selectedInvoice.items}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Description',
                  dataIndex: 'description',
                  key: 'description',
                },
                {
                  title: 'Quantité',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 100,
                },
                {
                  title: 'Prix unitaire',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  width: 120,
                  render: (price: number) => `${price.toLocaleString()} TND`,
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  width: 120,
                  render: (total: number) => `${total.toLocaleString()} TND`,
                },
              ]}
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space direction="vertical" size="small" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Text>Sous-total HT: <strong>{selectedInvoice.subtotal.toLocaleString()} TND</strong></Text>
                <Text>TVA (20%): <strong>{selectedInvoice.tax.toLocaleString()} TND</strong></Text>
                <Text style={{ fontSize: '18px' }}>
                  Total TTC: <strong style={{ color: '#52c41a' }}>{selectedInvoice.total.toLocaleString()} TND</strong>
                </Text>
              </Space>
            </div>

            {selectedInvoice.notes && (
              <>
                <Divider>Notes</Divider>
                <Text>{selectedInvoice.notes}</Text>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de paiement en ligne */}
      {selectedInvoice && (
        <OnlinePaymentModal
          visible={paymentModalVisible}
          invoice={selectedInvoice}
          onCancel={() => setPaymentModalVisible(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ClientInvoicesPage;