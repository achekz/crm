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
  Spin,
  Alert,
  Menu,
  Tooltip,
  Switch,
  Radio,
  Statistic,
  Descriptions,
  Grid,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  FileTextOutlined,
  SendOutlined,
  DownloadOutlined,
  BellOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  Invoice,
  InvoiceItem,
  fetchAllInvoices,
  createNewInvoice,
  updateExistingInvoice,
  removeInvoice,
  selectInvoice
} from '../../../store/slices/invoicesSlice';
import { fetchClients } from '../../../store/slices/clientsSlice';
import { generateInvoicePdf } from '../../../services/invoiceService';
import dayjs from 'dayjs';
import * as simpleGoogleCalendarService from '../../../services/simpleGoogleCalendarService';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

const InvoicesPage: React.FC = () => {
  const { invoices, loading, error } = useSelector((state: RootState) => state.invoices);
  const { clients, loading: clientsLoading, error: clientsError } = useSelector((state: RootState) => state.clients);
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [calendarAuthStatus, setCalendarAuthStatus] = useState<boolean>(false);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const screens = useBreakpoint();
  const isMobile: boolean = !screens.md;

  // Fetch invoices when component mounts
  useEffect(() => {
    dispatch(fetchAllInvoices());
    dispatch(fetchClients()); // Fetch clients when component mounts
    checkCalendarAuth(); // Check Google Calendar auth status
  }, [dispatch]);





  // Simple Google Calendar integration functions
  const checkCalendarAuth = async () => {
    try {
      setCalendarLoading(true);
      const authorized = await simpleGoogleCalendarService.checkGoogleLoginStatus();
      setCalendarAuthStatus(authorized);
      if (authorized) {
        message.success('Google Calendar accessible');
      } else {
        message.info('Connectez-vous à Google pour utiliser le calendrier');
      }
    } catch (error) {
      console.error('Calendar auth check error:', error);
      setCalendarAuthStatus(false);
    } finally {
      setCalendarLoading(false);
    }
  };

  const openGoogleCalendar = () => {
    simpleGoogleCalendarService.openGoogleCalendar();
    message.info('Google Calendar ouvert dans un nouvel onglet');
  };

  const addInvoiceToCalendar = async (invoiceData: any) => {
    try {
      setCalendarLoading(true);
      simpleGoogleCalendarService.openGoogleCalendarWithEvent(invoiceData);
      message.success('Google Calendar ouvert avec les détails de la facture');
    } catch (error: any) {
      console.error('Calendar add error:', error);
      message.error(`Erreur lors de l'ouverture de Google Calendar: ${error.message}`);
    } finally {
      setCalendarLoading(false);
    }
  };

  const downloadCalendarFile = async (invoiceData: any) => {
    try {
      simpleGoogleCalendarService.downloadGoogleCalendarFile(invoiceData);
      message.success('Fichier calendrier téléchargé');
    } catch (error) {
      console.error('Calendar file download error:', error);
      message.error('Erreur lors du téléchargement du fichier calendrier');
    }
  };

  const filteredInvoices = invoices && Array.isArray(invoices)
    ? invoices.filter(invoice =>
        invoice.number.toLowerCase().includes(searchText.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchText.toLowerCase())
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
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée',
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
          <FileTextOutlined style={{ color: '#1890ff' }} />
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
      title: 'Échéance',
      dataIndex: 'dueDate',
      key: 'dueDate',
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
      render: (record: Invoice) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: (
                  <Button type="text" icon={<EyeOutlined />} style={{ width: '100%', textAlign: 'left' }}>
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
                      setEditingInvoice(record);
                      setModalVisible(true);
                      form.setFieldsValue({
                        ...record,
                        date: dayjs(record.date),
                        dueDate: dayjs(record.dueDate),
                        taxRate: (record.taxRate || 0.19) * 100, // Convert decimal to percentage for display
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
                    onClick={() => {
                      dispatch(updateExistingInvoice({ id: record.id, data: { status: 'sent' } }));
                      message.success('Facture marquée comme envoyée');
                    }}
                  >
                    Marquer comme envoyée
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
                        const pdfBlob = await generateInvoicePdf(record.id);
                        const url = window.URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `facture-${record.number}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        message.success('PDF téléchargé avec succès');
                      } catch (error) {
                        message.error('Erreur lors du téléchargement du PDF');
                      }
                    }}
                  >
                    Télécharger PDF
                  </Button>
                ),
              },
              {
                key: 'calendar',
                label: (
                  <Button
                    type="text"
                    icon={<CalendarOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      addInvoiceToCalendar({
                        number: record.number,
                        clientName: record.clientName,
                        dueDate: record.dueDate,
                        total: record.total,
                        description: record.notes
                      });
                    }}
                  >
                    Ajouter au Calendrier
                  </Button>
                ),
              },
              {
                key: 'calendar-file',
                label: (
                  <Button
                    type="text"
                    icon={<CalendarOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      downloadCalendarFile({
                        number: record.number,
                        clientName: record.clientName,
                        dueDate: record.dueDate,
                        total: record.total,
                        description: record.notes
                      });
                    }}
                  >
                    Télécharger .ics
                  </Button>
                ),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                danger: true,
                label: (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Supprimer la facture',
                        content: 'Êtes-vous sûr de vouloir supprimer cette facture ?',
                        onOk: () => {
                          dispatch(removeInvoice(record.id));
                          message.success('Facture supprimée');
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
      // Check if clients have been loaded
      if (!clients || !Array.isArray(clients) || clients.length === 0) {
        message.error("Aucun client disponible. Veuillez attendre que les clients soient chargés ou créer des clients.");
        return;
      }

      // Ensure we have valid items
      const items: InvoiceItem[] = (values.items || []).map((item: any, index: number) => ({
        id: index.toString(),
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      }));

      if (items.length === 0) {
        message.error('Une facture doit contenir au moins un élément');
        return;
      }

      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      // Apply the selected tax rate (convert from percentage to decimal)
      const taxRatePercent = parseFloat(values.taxRate?.toString() || '19');
      const taxRate = taxRatePercent / 100; // Convert percentage to decimal (e.g., 19% -> 0.19)
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      // Find client
      const selectedClient = clients && Array.isArray(clients)
        ? clients.find(c => c.id === values.clientId)
        : undefined;

      if (!selectedClient) {
        console.error('Client not found. Available clients:', clients);
        message.error(`Client avec ID ${values.clientId} introuvable. Veuillez sélectionner un client valide.`);
        return;
      }

      const invoiceData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        dueDate: values.dueDate.format('YYYY-MM-DD'),
        clientName: selectedClient.name,
        items,
        subtotal,
        taxRate,
        tax,
        total,
        sendNotification: values.sendNotification || false,
      };

      if (editingInvoice) {
        await dispatch(updateExistingInvoice({ id: editingInvoice.id, data: invoiceData })).unwrap();
        message.success('Facture mise à jour avec succès');
      } else {
        const newInvoice = {
          ...invoiceData,
          number: values.number || `FAC-${new Date().getFullYear()}-${String((invoices && Array.isArray(invoices) ? invoices.length : 0) + 1).padStart(3, '0')}`,
          status: 'draft',
        };

        console.log('Creating invoice with data:', newInvoice);
        await dispatch(createNewInvoice(newInvoice)).unwrap();
        message.success('Facture créée avec succès');

        // Add to Google Calendar if authorized
        if (calendarAuthStatus && values.addToCalendar) {
          try {
            await addInvoiceToCalendar({
              ...newInvoice,
              clientName: selectedClient.name
            });
          } catch (error) {
            console.error('Failed to add to calendar:', error);
            // Don't fail the invoice creation if calendar fails
          }
        }

        if (values.sendNotification) {
          message.info('Notification envoyée au client');
        }
      }
      setModalVisible(false);
      setEditingInvoice(null);
      form.resetFields();
    } catch (error: any) {
      console.error('Error creating/updating invoice:', error);
      const errorMessage = error?.message || error || 'Une erreur est survenue';
      message.error(`Erreur: ${errorMessage}`);
    }
  };

  // Show loading state for invoices
  if (loading && (!invoices || !invoices.length)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Show loading state for clients


  if (clientsLoading) {
    return (
      <div>
        <div className="page-header">
          <Title level={2}>Gestion des factures</Title>
          <Text type="secondary">Chargement des données clients...</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spin size="large" style={{ marginBottom: '20px' }} />
          <Text type="secondary" style={{ marginBottom: '20px' }}>Chargement des clients...</Text>
          {clientsError && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Alert
                message="Erreur lors du chargement des clients"
                description={clientsError}
                type="error"
                showIcon
                style={{ marginBottom: '20px', maxWidth: '500px' }}
              />
              <Space>
                <Button
                  type="primary"
                  onClick={() => dispatch(fetchClients())}
                >
                  Réessayer
                </Button>
              </Space>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (error && (!invoices || !invoices.length)) {
    return (
      <Alert
        message="Erreur"
        description={`Impossible de charger les factures: ${error}`}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Gestion des factures</Title>
        <Text type="secondary">Créez et gérez vos factures</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        {/* Desktop View */}
        <div style={{ display: 'none' }} className="invoices-desktop-view">
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Search
              placeholder="Rechercher une facture..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />

            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingInvoice(null);
                  setModalVisible(true);
                  form.resetFields();
                  
                  // Debug info about clients
                  console.log('Opening invoice form. Available clients:', clients);
                  if (!clients || !Array.isArray(clients) || clients.length === 0) {
                    message.warning('Aucun client disponible. La création de facture nécessite au moins un client.');
                    // Try to fetch clients again if none are available
                    dispatch(fetchClients());
                  }
                }}
              >
                Nouvelle facture
              </Button>

              <Button 
                onClick={checkCalendarAuth}
                loading={calendarLoading}
                icon={<CalendarOutlined />}
                type={calendarAuthStatus ? 'primary' : 'default'}
              >
                {calendarAuthStatus ? 'Calendrier Connecté' : 'Vérifier Calendrier'}
              </Button>
              {!calendarAuthStatus && (
                <Button 
                  onClick={openGoogleCalendar}
                  loading={calendarLoading}
                  icon={<CalendarOutlined />}
                >
                  Ouvrir Google Calendar
                </Button>
              )}
              {calendarAuthStatus && (
                <Button 
                  onClick={openGoogleCalendar}
                  loading={calendarLoading}
                  icon={<CalendarOutlined />}
                >
                  Ouvrir Calendrier
                </Button>
              )}
            </Space>
          </Space>
        </div>

        {/* Mobile View */}
        <div style={{ display: 'none' }} className="invoices-mobile-view">
          {!searchExpanded ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: 16, width: '100%', flexWrap: 'wrap' }}>
              {/* Search icon button */}
              <Button
                style={{ flex: 1 }}
                icon={<SearchOutlined />}
                onClick={() => setSearchExpanded(true)}
              >
                Chercher
              </Button>
              
              {/* Nouvelle facture button */}
              <Button
                type="primary"
                style={{ flex: 1 }}
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingInvoice(null);
                  setModalVisible(true);
                  form.resetFields();
                  console.log('Opening invoice form. Available clients:', clients);
                  if (!clients || !Array.isArray(clients) || clients.length === 0) {
                    message.warning('Aucun client disponible. La création de facture nécessite au moins un client.');
                    dispatch(fetchClients());
                  }
                }}
              >
                Nouveau
              </Button>

              {/* Calendar buttons - show as icons only on mobile */}
              <Button 
                style={{ flex: 1 }}
                onClick={checkCalendarAuth}
                loading={calendarLoading}
                icon={<CalendarOutlined />}
                type={calendarAuthStatus ? 'primary' : 'default'}
                size="small"
              >
                {calendarAuthStatus ? 'Cal.' : 'Vér.'}
              </Button>
              
              <Button 
                style={{ flex: 1 }}
                onClick={openGoogleCalendar}
                loading={calendarLoading}
                icon={<CalendarOutlined />}
                size="small"
              >
                {calendarAuthStatus ? 'Cal.' : 'G.Cal'}
              </Button>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="Rechercher une facture..."
                allowClear
                onChange={(e) => setSearchText(e.target.value)}
                onBlur={() => setSearchExpanded(false)}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        {/* Responsive CSS */}
        <style>{`
          @media (max-width: 1005px) {
            .invoices-desktop-view {
              display: none !important;
            }
            .invoices-mobile-view {
              display: block !important;
            }
          }
          @media (min-width: 1006px) {
            .invoices-desktop-view {
              display: block !important;
            }
            .invoices-mobile-view {
              display: none !important;
            }
          }
        `}</style>

        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
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
            style={{ minWidth: '900px' }}
          />
        </div>
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingInvoice(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
            dueDate: dayjs().add(30, 'day'),
            items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
            taxRate: 19, // Default to 19% (entered as percentage, will be converted to decimal)
            sendNotification: true,
            number: `FAC-${new Date().getFullYear()}-${String((invoices && Array.isArray(invoices) ? invoices.length : 0) + 1).padStart(3, '0')}`,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="number"
                label={
                  <Space>
                    <span>Numéro de facture</span>
                    <Tooltip title="Numéro unique de la facture">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Le numéro est requis' }]}
              >
                <Input prefix={<FileTextOutlined />} placeholder="ex: FAC-2023-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="clientId"
                label={
                  <Space>
                    <span>Client</span>
                    <Tooltip title="Sélectionnez le client pour cette facture">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Le client est requis' }]}
              >
                <Select
                  placeholder="Sélectionner un client"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children?.toString() || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  suffixIcon={<UserOutlined />}
                  notFoundContent={
                    <div style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ marginBottom: '10px' }}>Aucun client trouvé</div>
                      <Button
                        type="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropdown from closing
                          dispatch(fetchClients());
                          message.info('Tentative de rechargement des clients...');
                        }}
                      >
                        Actualiser les clients
                      </Button>
                    </div>
                  }
                  loading={!clients || clients.length === 0}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            message.info('Fonctionnalité à implémenter: Ajouter un client');
                            // Implement client creation logic here
                          }}
                          block
                        >
                          Ajouter un client
                        </Button>
                      </Space>
                    </>
                  )}
                >
                  {clients && Array.isArray(clients) && clients.length > 0 ? (
                    clients.map(client => (
                      <Option key={client.id} value={client.id}>
                        {client.name} - {client.company || ''}
                      </Option>
                    ))
                  ) : (
                    <Option disabled value="">Chargement des clients...</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="date"
                label={
                  <Space>
                    <span>Date</span>
                    <Tooltip title="Date d'émission de la facture">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'La date est requise' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" suffixIcon={<CalendarOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="dueDate"
                label={
                  <Space>
                    <span>Échéance</span>
                    <Tooltip title="Date d'échéance du paiement">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'L\'échéance est requise' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" suffixIcon={<CalendarOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="taxRate"
                label={
                  <Space>
                    <span>Taux de TVA (%)</span>
                    <Tooltip title="Saisissez le taux de TVA en pourcentage (ex: 19 pour 19%)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                initialValue={19}
                rules={[
                  { required: true, message: 'Le taux de TVA est requis' },
                  { type: 'number', min: 0, max: 100, message: 'Le taux doit être entre 0 et 100%' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={2}
                  addonAfter="%"
                  style={{ width: '100%' }}
                  placeholder="Ex: 19"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>
            <Space>
              <CalculatorOutlined />
              Lignes de facturation
            </Space>
          </Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    style={{ marginBottom: 16 }}
                    size="small"
                    bordered
                    className="invoice-item-card"
                  >
                    <Row gutter={16} align="middle">
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          rules={[{ required: true, message: 'Description requise' }]}
                          label="Description"
                        >
                          <Input placeholder="Description du produit ou service" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Quantité requise' }]}
                          label="Quantité"
                        >
                          <InputNumber placeholder="Qté" min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitPrice']}
                          rules={[{ required: true, message: 'Prix unitaire requis' }]}
                          label="Prix unitaire"
                        >
                          <InputNumber
                            placeholder="Prix unitaire"
                            min={0}
                            style={{ width: '100%' }}
                            prefix={<DollarOutlined />}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item dependencies={[name]} label="Total">
                          {() => {
                            const items = form.getFieldValue('items') || [];
                            const item = items[name];
                            const total = (item?.quantity || 0) * (item?.unitPrice || 0);
                            return (
                              <Statistic
                                value={total}
                                suffix="TND"
                                precision={2}
                                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
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
                          icon={<DeleteOutlined />}
                          shape="circle"
                          style={{ marginTop: 28 }}
                        />
                      </Col>
                    </Row>
                  </Card>
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

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Notes ou conditions particulières" />
              </Form.Item>

              <Form.Item 
                name="sendNotification" 
                valuePropName="checked"
                label={
                  <Space>
                    <span>Envoyer une notification</span>
                    <Tooltip title="Envoyer une notification au client lors de la création">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Switch 
                  checkedChildren="Oui" 
                  unCheckedChildren="Non" 
                  defaultChecked 
                />
              </Form.Item>

              <Form.Item 
                name="addToCalendar" 
                valuePropName="checked"
                label={
                  <Space>
                    <CalendarOutlined />
                    <span>Ajouter au calendrier Google</span>
                    <Tooltip title="Ajouter la date d'échéance au calendrier Google">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Switch 
                  checkedChildren="Oui" 
                  unCheckedChildren="Non" 
                  disabled={!calendarAuthStatus}
                />
              </Form.Item>
              {!calendarAuthStatus && (
                <Alert
                  message="Google Calendar non connecté"
                  description="Connectez-vous à Google Calendar pour ajouter automatiquement les échéances de factures."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </Col>
            <Col span={8}>
              <Card title="Résumé" size="small">
                <Form.Item dependencies={['items', 'taxRate']}>
                  {() => {
                    const items = form.getFieldValue('items') || [];
                    const taxRatePercent = form.getFieldValue('taxRate') || 19;
                    const taxRate = taxRatePercent / 100; // Convert percentage to decimal
                    const subtotal = items.reduce(
                      (sum: number, item: any) => sum + ((item?.quantity || 0) * (item?.unitPrice || 0)),
                      0
                    );
                    const tax = subtotal * taxRate;
                    const total = subtotal + tax;

                    return (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Sous-total">{subtotal.toLocaleString()} TND</Descriptions.Item>
                        <Descriptions.Item label={`TVA (${taxRatePercent}%)`}>{tax.toLocaleString()} TND</Descriptions.Item>
                        <Descriptions.Item label="Total" className="invoice-total">
                          <Statistic
                            value={total}
                            suffix="TND"
                            precision={2}
                            valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                          />
                        </Descriptions.Item>
                      </Descriptions>
                    );
                  }}
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoicesPage;