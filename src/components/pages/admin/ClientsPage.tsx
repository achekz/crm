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
  Statistic,
  Upload,
  message,
  Avatar,
  Spin,
  Select,
  Empty,
  Radio,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  UploadOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  LockOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { Client, fetchClients, updateClientThunk, deleteClientThunk } from '../../../store/slices/clientsSlice';
import axios from 'axios';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

type ClientNature = "personne_physique" | "personne_morale";

type RegimeFiscal =
  | "regime_reel"
  | "regime_reel_simplifie"
  | "forfait_assiette"
  | "forfaitaire";

interface Gerant {
  email: string;
  phone: string;
}

interface CreateClientData {
  name: string;
  email: string;
  password: string;

  company?: string;
  phone?: string;
  address?: string;
  avatar?: string;

  tax_number?: string;
  cnss?: string;

  nature: ClientNature;

  regime_fiscal?: RegimeFiscal; // only if personne_physique

  gerants: Gerant[]; // 1 or many

  dossier_number: string;
}


const ClientsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading, error } = useSelector((state: RootState) => state.clients);
  const { token } = useSelector((state: RootState) => state.auth);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [form] = Form.useForm();
  const [clientNature, setClientNature] = useState<ClientNature | undefined>(undefined);
  
  // Watch the nature field to update state
  const natureValue = Form.useWatch('nature', form);
  
  useEffect(() => {
    if (natureValue) {
      setClientNature(natureValue);
    } else {
      setClientNature(undefined);
    }
  }, [natureValue]);

  // Fetch clients on component mount
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  // Display error message if API request fails
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchText.toLowerCase()) ||
    client.email.toLowerCase().includes(searchText.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        message.info(`${jsonData.length} clients trouvés. La fonctionnalité d'import est désactivée.`);
      } catch (error) {
        message.error('Erreur lors de l\'importation du fichier Excel');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  // Custom avatar upload handler
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    // Check file size - limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      message.error('Image size should be less than 2MB!');
      onError('Image size should be less than 2MB!');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      message.error('You can only upload image files!');
      onError('You can only upload image files!');
      return;
    }
    
    // Simulate success for now
    setTimeout(() => {
      onSuccess("ok");
    }, 500);
  };

  const resizeImage = (file: File, maxWidth = 300, maxHeight = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create image object
      const img = new Image();
      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image on canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Failed to get canvas context');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
      
      // Load image from file
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'uploading') {
      setUploadLoading(true);
      return;
    }
    
    if (info.file.status === 'done') {
      setUploadLoading(true);
      
      // Resize and compress image
      resizeImage(info.file.originFileObj)
        .then((resizedImageData) => {
          setAvatarUrl(resizedImageData);
          form.setFieldsValue({ avatar: resizedImageData });
          setUploadLoading(false);
          message.success(`${info.file.name} uploaded and processed successfully`);
        })
        .catch((error) => {
          console.error('Error resizing image:', error);
          setUploadLoading(false);
          message.error('Failed to process image');
        });
    } else if (info.file.status === 'error') {
      setUploadLoading(false);
      message.error(`${info.file.name} upload failed.`);
    }
  };

  const createClient = async (values: CreateClientData) => {
    try {
      // Make a copy of values to avoid modifying the original form values
      const clientData = { ...values };
      
      // Convert the avatar if it exists and is too large
      if (clientData.avatar && typeof clientData.avatar === 'string' && clientData.avatar.length > 1000000) {
        // Avatar is likely too large, we'll omit it for now
        message.warning('Avatar image is too large and has been omitted. Please use a smaller image.');
        delete clientData.avatar;
      }

      await axios.post('http://localhost:5000/api/auth/admin/register', {
        ...clientData,
        role: 'client',
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      message.success('Client créé avec succès');
      setModalVisible(false);
      form.resetFields();
      setAvatarUrl('');
      setIsCreating(false);
      
      // Refresh client list
      dispatch(fetchClients());
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erreur lors de la création du client');
    }
  };

  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (record: Client) => (
        <Space>
          {record.avatar ? (
            <Avatar src={record.avatar} />
          ) : (
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          )}
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.company}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Client) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            <MailOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
            <Text>{record.email}</Text>
          </div>
          <div>
            <PhoneOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
            <Text>{record.phone || 'N/A'}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'CA Total',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {amount.toLocaleString()} TND
        </Text>
      ),
    },
    {
      title: 'En attente',
      dataIndex: 'totalPending',
      key: 'totalPending',
      render: (amount: number) => (
        <Text style={{ color: amount > 0 ? '#fa8c16' : '#8c8c8c' }}>
          {amount.toLocaleString()} TND
        </Text>
      ),
    },
    {
      title: 'Dernière activité',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Client) => (
        <Dropdown
          overlay={
            <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <Space direction="vertical" size="small">
                <Button 
                  type="text" 
                  icon={<EyeOutlined />}
                  onClick={() => console.log('Voir client', record.id)}
                >
                  Voir
                </Button>
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingClient(record);
                    setIsCreating(false);
                    setModalVisible(true);
                    const formValues: any = {
                      ...record,
                      status: record.status || 'active'
                    };
                    // Set nature if it exists in the record
                    if ((record as any).nature) {
                      setClientNature((record as any).nature);
                      formValues.nature = (record as any).nature;
                    }
                    // Set gerants if they exist, otherwise initialize with empty one
                    if ((record as any).gerants && Array.isArray((record as any).gerants)) {
                      formValues.gerants = (record as any).gerants;
                    } else {
                      formValues.gerants = [{ email: '', phone: '' }];
                    }
                    form.setFieldsValue(formValues);
                  }}
                >
                  Modifier
                </Button>
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Supprimer le client',
                      content: 'Êtes-vous sûr de vouloir supprimer ce client ?',
                      onOk: () => dispatch(deleteClientThunk(record.id)),
                    });
                  }}
                >
                  Supprimer
                </Button>
              </Space>
            </div>
          }
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleSubmit = (values: any) => {
    if (isCreating) {
      createClient(values);
    } else if (editingClient) {
      dispatch(updateClientThunk({
        ...editingClient,
        ...values,
      }))
      .unwrap()
      .then(() => {
        message.success('Client mis à jour avec succès');
        setModalVisible(false);
        setEditingClient(null);
        form.resetFields();
        setAvatarUrl('');
      })
      .catch((error) => {
        message.error(`Erreur: ${error}`);
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Gestion des clients</Title>
        <Text type="secondary">Gérez vos clients et contacts</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Nombre de clients"
              value={clients.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="CA Total"
              value={clients.reduce((sum, client) => sum + client.totalPaid, 0)}
              prefix={<DollarOutlined />}
              suffix="TND"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="En attente"
              value={clients.reduce((sum, client) => sum + client.totalPending, 0)}
              prefix={<ClockCircleOutlined />}
              suffix="TND"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="Rechercher un client..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleExcelUpload}
            >
              <Button icon={<UploadOutlined />}>
                Importer Excel
              </Button>
            </Upload>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsCreating(true);
              setEditingClient(null);
              setModalVisible(true);
              setAvatarUrl('');
              setClientNature(undefined);
              form.resetFields();
              // Initialize with at least one gerant
              form.setFieldsValue({
                gerants: [{ email: '', phone: '' }]
              });
            }}
          >
            Nouveau Client
          </Button>
        </Space>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
            <div style={{ marginTop: 16 }}>Chargement des clients...</div>
          </div>
        ) : filteredClients.length === 0 ? (
          <Empty 
            description="Aucun client trouvé" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={filteredClients}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} sur ${total} clients`,
            }}
          />
        )}
      </Card>

      {/* Modal d'édition/création de client */}
      <Modal
        title={isCreating ? 'Créer un nouveau client' : `Modifier le client - ${editingClient?.name}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingClient(null);
          setIsCreating(false);
          form.resetFields();
          setAvatarUrl('');
          setClientNature(undefined);
        }}
        onOk={() => form.submit()}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="name"
                    label="Nom complet"
                    rules={[{ required: true, message: 'Nom requis' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Email requis' },
                      { type: 'email', message: 'Email invalide' }
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              {isCreating && (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="password"
                      label="Mot de passe"
                      rules={[
                        { required: true, message: 'Mot de passe requis' },
                        { min: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' }
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <Form.Item name="avatar" label="Photo de profil" valuePropName="fileList">
                <Upload
                  name="avatar"
                  listType="picture-card"
                  showUploadList={false}
                  customRequest={customUpload}
                  onChange={handleAvatarUpload}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: '100%' }} />
                  ) : (
                    <div>
                      {uploadLoading ? <LoadingOutlined /> : <PlusOutlined />}
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Téléphone"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label="Entreprise"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Adresse"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dossier_number"
                label="N° de dossier"
                rules={[{ required: true, message: 'N° de dossier requis' }]}
              >
                <Input placeholder="N° de dossier" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tax_number"
                label="Matricule fiscale"
              >
                <Input placeholder="Matricule fiscale" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cnss"
                label="N° CNSS"
              >
                <Input placeholder="N° CNSS" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nature"
                label="Nature de client"
                rules={[{ required: true, message: 'Nature de client requise' }]}
              >
                <Select 
                  placeholder="Sélectionner la nature"
                  onChange={(value) => {
                    setClientNature(value);
                    if (value === 'personne_morale') {
                      form.setFieldsValue({ regime_fiscal: undefined });
                    }
                  }}
                >
                  <Option value="personne_physique">Personne physique</Option>
                  <Option value="personne_morale">Personne morale</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {clientNature === 'personne_physique' && (
            <Form.Item
              name="regime_fiscal"
              label="Régime fiscal"
              rules={[{ required: true, message: 'Régime fiscal requis' }]}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="regime_reel">Régime réel</Radio>
                  <Radio value="regime_reel_simplifie">Régime réel simplifié</Radio>
                  <Radio value="forfait_assiette">Forfait d'assiette</Radio>
                  <Radio value="forfaitaire">Forfaitaire</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          )}

          <Divider />

          <Form.Item
            label="Informations de contact (Gérants)"
            required
          >
            <Form.List
              name="gerants"
              rules={[
                {
                  validator: async (_, gerants) => {
                    if (!gerants || gerants.length < 1) {
                      return Promise.reject(new Error('Au moins un gérant est requis'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      style={{ marginBottom: 16 }}
                      title={`Gérant ${index + 1}`}
                      extra={
                        fields.length > 1 ? (
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        ) : null
                      }
                    >
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'Nom gérant']}
                            label="Nom gérant"
                            rules={[
                              { required: true, message: 'Nom du gérant requis' }
                            ]}
                          >
                            <Input placeholder="Nom du gérant" prefix={<UserOutlined />} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'phone']}
                            label="Numéro de téléphone"
                            rules={[{ required: true, message: 'Numéro de téléphone requis' }]}
                          >
                            <Input placeholder="Numéro de téléphone" prefix={<PhoneOutlined />} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'email']}
                            label="Email"
                            rules={[
                              { required: true, message: 'Email requis' },
                              { type: 'email', message: 'Email invalide' }
                            ]}
                          >
                            <Input placeholder="Email du gérant" prefix={<MailOutlined />} />
                          </Form.Item>
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
                      Ajouter un gérant
                    </Button>
                    <Form.ErrorList errors={errors} />
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Divider />

          <Form.Item
            name="status"
            label="Statut"
          >
            <Select defaultValue="active">
              <Option value="active">Actif</Option>
              <Option value="inactive">Inactif</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsPage;