import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Dropdown, 
  Modal, 
  Form, 
  Typography,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  InputNumber,
  Divider,
  message,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  SendOutlined,
  DownloadOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { Quote, addQuote, updateQuote, deleteQuote, setQuotes, setLoading } from '../../../store/slices/quotesSlice';
import { fetchQuotes, generateQuotePdf, convertQuoteToInvoice, updateQuote as updateQuoteAPI, deleteQuote as deleteQuoteAPI, createQuote } from '../../../services/quoteService';
import { fetchClients } from '../../../store/slices/clientsSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const QuotesPage: React.FC = () => {
  const dispatch = useDispatch();
  const { quotes, loading } = useSelector((state: RootState) => state.quotes);
  const { clients } = useSelector((state: RootState) => state.clients);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [form] = Form.useForm();

  // Fetch quotes from backend when component mounts
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        dispatch(setLoading(true));
        const fetchedQuotes = await fetchQuotes();
        dispatch(setQuotes(fetchedQuotes));
      } catch (error) {
        message.error('Erreur lors du chargement des devis');
        console.error('Error loading quotes:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadQuotes();
    dispatch(fetchClients()); // Fetch clients as well
  }, [dispatch]);

  const filteredQuotes = quotes.filter(quote =>
    quote.number.toLowerCase().includes(searchText.toLowerCase()) ||
    quote.clientName.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      accepted: 'green',
      rejected: 'red',
      expired: 'orange',
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Rejeté',
      expired: 'Expiré',
    };
    return texts[status as keyof typeof texts];
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (number: string) => (
        <Space>
          <FileOutlined style={{ color: '#1890ff' }} />
          <Text strong>{number}</Text>
        </Space>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Valide jusqu\'au',
      dataIndex: 'validUntil',
      key: 'validUntil',
    },
    {
      title: 'Montant',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} TND
        </Text>
      ),
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
      render: (record: Quote) => (
        <Dropdown
          dropdownRender={(menu) => (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '8px',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                minWidth: '180px',
              }}
            >
              {menu}
            </div>
          )}
          menu={{
            items: [
              {
                key: 'view',
                label: (
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setViewingQuote(record);
                      setViewModalVisible(true);
                    }}
                  >
                    Voir
                  </Button>
                ),
              },
              {
                key: 'edit',
                label: (
                  <Button 
                    type="text" 
                    icon={<EditOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setEditingQuote(record);
                      setModalVisible(true);
                      form.setFieldsValue({
                        ...record,
                        date: dayjs(record.date),
                        validUntil: dayjs(record.validUntil),
                      });
                    }}
                  >
                    Modifier
                  </Button>
                ),
              },
              {
                key: 'send',
                label: (
                  <Button 
                    type="text" 
                    icon={<SendOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        await updateQuoteAPI(record.id, { status: 'sent' });
                        const fetchedQuotes = await fetchQuotes();
                        dispatch(setQuotes(fetchedQuotes));
                        message.success('Devis envoyé avec succès');
                      } catch (error) {
                        message.error('Erreur lors de l\'envoi du devis');
                      }
                    }}
                  >
                    Envoyer
                  </Button>
                ),
              },
              {
                key: 'convert',
                label: (
                  <Button 
                    type="text" 
                    icon={<CheckOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        await convertQuoteToInvoice(record.id);
                        const fetchedQuotes = await fetchQuotes();
                        dispatch(setQuotes(fetchedQuotes));
                        message.success('Devis converti en facture avec succès');
                      } catch (error) {
                        message.error('Erreur lors de la conversion du devis');
                      }
                    }}
                  >
                    Convertir en facture
                  </Button>
                ),
              },
              {
                key: 'download',
                label: (
                  <Button 
                    type="text" 
                    icon={<DownloadOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        const pdfBlob = await generateQuotePdf(record.id);
                        const url = window.URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `devis-${record.number}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        message.success('PDF téléchargé avec succès');
                      } catch (error) {
                        message.error('Erreur lors du téléchargement du PDF');
                      }
                    }}
                  >
                    Télécharger
                  </Button>
                ),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: (
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Supprimer le devis',
                        content: 'Êtes-vous sûr de vouloir supprimer ce devis ?',
                        onOk: async () => {
                          try {
                            await deleteQuoteAPI(record.id);
                            const fetchedQuotes = await fetchQuotes();
                            dispatch(setQuotes(fetchedQuotes));
                            message.success('Devis supprimé avec succès');
                          } catch (error) {
                            message.error('Erreur lors de la suppression du devis');
                          }
                        },
                      });
                    }}
                  >
                    Supprimer
                  </Button>
                ),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    try {
      const items = values.items || [];
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
      const tax = subtotal * 0.2;
      const total = subtotal + tax;

      const quoteData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        validUntil: values.validUntil.format('YYYY-MM-DD'),
        clientName: clients.find(c => c.id === values.clientId)?.name || '',
        items,
        subtotal,
        tax,
        total,
      };

      if (editingQuote) {
        await updateQuoteAPI(editingQuote.id, quoteData);
        message.success('Devis mis à jour');
      } else {
        await createQuote({
          ...quoteData,
          number: `DEV-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`,
          status: 'draft',
        });
        message.success('Devis créé');
      }
      
      // Reload quotes from backend
      const fetchedQuotes = await fetchQuotes();
      dispatch(setQuotes(fetchedQuotes));
      
      setModalVisible(false);
      setEditingQuote(null);
      form.resetFields();
    } catch (error) {
      message.error('Erreur lors de la sauvegarde du devis');
    }
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Gestion des devis</Title>
        <Text type="secondary">Créez et gérez vos devis</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Rechercher un devis..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingQuote(null);
              setModalVisible(true);
              form.resetFields();
            }}
          >
            Nouveau devis
          </Button>
        </Space>

        <Table
          dataSource={filteredQuotes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} devis`,
          }}
        />
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={editingQuote ? 'Modifier le devis' : 'Nouveau devis'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingQuote(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
            validUntil: dayjs().add(30, 'day'),
            items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="clientId"
                label="Client"
                rules={[{ required: true, message: 'Le client est requis' }]}
              >
                <Select placeholder="Sélectionner un client">
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name} - {client.company}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'La date est requise' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="validUntil"
                label="Valide jusqu'au"
                rules={[{ required: true, message: 'La date de validité est requise' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Lignes du devis</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Description requise' }]}
                      >
                        <Input placeholder="Description" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Quantité requise' }]}
                      >
                        <InputNumber placeholder="Qté" min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unitPrice']}
                        rules={[{ required: true, message: 'Prix unitaire requis' }]}
                      >
                        <InputNumber 
                          placeholder="Prix unitaire" 
                          min={0} 
                          style={{ width: '100%' }}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item dependencies={[name]}>
                        {() => {
                          const items = form.getFieldValue('items') || [];
                          const item = items[name];
                          const total = (item?.quantity || 0) * (item?.unitPrice || 0);
                          return (
                            <Input 
                              value={`${total.toLocaleString()} TND`} 
                              disabled 
                              style={{ textAlign: 'right' }}
                            />
                          );
                        }}
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button 
                        type="text" 
                        danger 
                        onClick={() => remove(name)}
                      >
                        ×
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<PlusOutlined />}
                  >
                    Ajouter une ligne
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Notes ou conditions particulières" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de visualisation */}
      <Modal
        title={`Devis ${viewingQuote?.number}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingQuote(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setViewingQuote(null);
          }}>
            Fermer
          </Button>
        ]}
        width={800}
      >
        {viewingQuote && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Numéro">{viewingQuote.number}</Descriptions.Item>
            <Descriptions.Item label="Client">{viewingQuote.clientName}</Descriptions.Item>
            <Descriptions.Item label="Date">{viewingQuote.date}</Descriptions.Item>
            <Descriptions.Item label="Valide jusqu'au">{viewingQuote.validUntil}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={getStatusColor(viewingQuote.status)}>
                {getStatusText(viewingQuote.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Montant total">
              <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                {viewingQuote.total.toLocaleString()} TND
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Sous-total" span={2}>
              {viewingQuote.subtotal.toLocaleString()} TND
            </Descriptions.Item>
            <Descriptions.Item label="TVA" span={2}>
              {viewingQuote.tax.toLocaleString()} TND
            </Descriptions.Item>
            <Descriptions.Item label="Articles" span={2}>
              <Table
                dataSource={viewingQuote.items}
                columns={[
                  { title: 'Description', dataIndex: 'description', key: 'description' },
                  { title: 'Quantité', dataIndex: 'quantity', key: 'quantity', align: 'center' },
                  { title: 'Prix unitaire', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', render: (val) => `${val.toLocaleString()} TND` },
                  { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (val) => `${val.toLocaleString()} TND` },
                ]}
                pagination={false}
                size="small"
              />
            </Descriptions.Item>
            {viewingQuote.notes && (
              <Descriptions.Item label="Notes" span={2}>
                {viewingQuote.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default QuotesPage;