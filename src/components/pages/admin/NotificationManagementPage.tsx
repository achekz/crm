import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  DatePicker, 
  Switch,
  Typography,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SendOutlined, 
  MailOutlined, 
  MobileOutlined,
  BellOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'all';
  subject?: string;
  content: string;
  target: 'all_clients' | 'specific_clients' | 'admins';
  isActive: boolean;
  createdAt: string;
}

// Mock data
const initialTemplates: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Rappel de facture',
    type: 'email',
    subject: 'Rappel: Facture en attente de paiement',
    content: 'Bonjour {client_name}, votre facture #{invoice_number} est en attente de paiement. Merci de régulariser la situation.',
    target: 'specific_clients',
    isActive: true,
    createdAt: '2023-10-15',
  },
  {
    id: '2',
    name: 'Maintenance système',
    type: 'all',
    subject: 'Maintenance planifiée',
    content: 'Le système sera en maintenance ce soir à 22h.',
    target: 'all_clients',
    isActive: true,
    createdAt: '2023-11-01',
  },
  {
    id: '3',
    name: 'Offre promotionnelle',
    type: 'sms',
    content: 'Profitez de -20% sur nos services ce mois-ci! Code: PROMO20',
    target: 'all_clients',
    isActive: false,
    createdAt: '2023-12-10',
  }
];

const NotificationManagementPage: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSendModalVisible, setIsSendModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [form] = Form.useForm();
  const [sendForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        let color = 'blue';
        let icon = <BellOutlined />;
        
        if (type === 'email') {
          color = 'geekblue';
          icon = <MailOutlined />;
        } else if (type === 'sms') {
          color = 'green';
          icon = <MobileOutlined />;
        } else if (type === 'all') {
          color = 'purple';
          icon = <SendOutlined />;
        }
        
        return (
          <Tag color={color} icon={icon}>
            {type.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Cible',
      dataIndex: 'target',
      key: 'target',
      render: (target: string) => {
        const targets: Record<string, string> = {
          'all_clients': 'Tous les clients',
          'specific_clients': 'Clients spécifiques',
          'admins': 'Administrateurs'
        };
        return <Tag>{targets[target] || target}</Tag>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: NotificationTemplate) => (
        <Space size="middle">
          <Tooltip title="Envoyer maintenant">
            <Button 
              type="primary" 
              shape="circle" 
              icon={<SendOutlined />} 
              size="small"
              onClick={() => handleOpenSendModal(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleEdit = (record: NotificationTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Êtes-vous sûr de vouloir supprimer ce modèle ?',
      content: 'Cette action est irréversible.',
      onOk: () => {
        setTemplates(prev => prev.filter(item => item.id !== id));
        message.success('Modèle supprimé avec succès');
      },
    });
  };

  const handleOpenSendModal = (record: NotificationTemplate) => {
    setEditingTemplate(record);
    sendForm.setFieldsValue({
      subject: record.subject,
      content: record.content,
      recipients: record.target === 'all_clients' ? ['all'] : [],
    });
    setIsSendModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingTemplate) {
        setTemplates(prev => prev.map(item => 
          item.id === editingTemplate.id ? { ...item, ...values } : item
        ));
        message.success('Modèle mis à jour avec succès');
      } else {
        const newTemplate = {
          ...values,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        setTemplates(prev => [...prev, newTemplate]);
        message.success('Nouveau modèle créé avec succès');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      const values = await sendForm.validateFields();
      setLoading(true);
      
      // Simulate API call
      console.log('Sending notification:', { templateId: editingTemplate?.id, ...values });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success(`Notification envoyée par ${editingTemplate?.type === 'all' ? 'Email, SMS et Push' : editingTemplate?.type} avec succès!`);
      setIsSendModalVisible(false);
      sendForm.resetFields();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Sending failed:', error);
      message.error('Échec de l\'envoi de la notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-management-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2}>Gestion des Notifications</Title>
          <Text type="secondary">Gérez et envoyez des notifications par Email, SMS et Push</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => {
            setEditingTemplate(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Nouveau Modèle
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex gap-4">
          <Input 
            prefix={<SearchOutlined />} 
            placeholder="Rechercher un modèle..." 
            style={{ width: 300 }} 
          />
          <Select defaultValue="all" style={{ width: 150 }}>
            <Option value="all">Tous les types</Option>
            <Option value="email">Email</Option>
            <Option value="sms">SMS</Option>
            <Option value="push">Push</Option>
          </Select>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={templates} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Edit/Create Modal */}
      <Modal
        title={editingTemplate ? "Modifier le modèle" : "Créer un nouveau modèle"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true, type: 'email', target: 'all_clients' }}
        >
          <Form.Item
            name="name"
            label="Nom du modèle"
            rules={[{ required: true, message: 'Veuillez entrer un nom' }]}
          >
            <Input placeholder="Ex: Rappel de facture" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="type"
              label="Type de notification"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="email">Email</Option>
                <Option value="sms">SMS</Option>
                <Option value="push">Notification Push</Option>
                <Option value="all">Tous les canaux</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="target"
              label="Cible par défaut"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="all_clients">Tous les clients</Option>
                <Option value="specific_clients">Clients spécifiques</Option>
                <Option value="admins">Administrateurs</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => 
              (getFieldValue('type') === 'email' || getFieldValue('type') === 'all') && (
                <Form.Item
                  name="subject"
                  label="Sujet (Email)"
                  rules={[{ required: true, message: 'Le sujet est requis pour les emails' }]}
                >
                  <Input placeholder="Sujet de l'email" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item
            name="content"
            label="Contenu du message"
            rules={[{ required: true, message: 'Veuillez entrer le contenu' }]}
            help="Variables disponibles: {client_name}, {company}, {invoice_number}, {date}"
          >
            <TextArea rows={6} placeholder="Bonjour {client_name}, ..." />
          </Form.Item>

          <Form.Item
            name="isActive"
            valuePropName="checked"
            label="Actif"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Send Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined />
            <span>Envoyer une notification</span>
            {editingTemplate && <Tag>{editingTemplate.name}</Tag>}
          </Space>
        }
        open={isSendModalVisible}
        onOk={handleSend}
        onCancel={() => setIsSendModalVisible(false)}
        confirmLoading={loading}
        okText="Envoyer"
        okButtonProps={{ danger: true }}
      >
        <Form
          form={sendForm}
          layout="vertical"
        >
          <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="flex justify-between">
                <Text type="secondary">Canal:</Text>
                <Tag color="blue">{editingTemplate?.type.toUpperCase()}</Tag>
              </div>
              <div className="flex justify-between">
                <Text type="secondary">Cible:</Text>
                <Text strong>{editingTemplate?.target === 'all_clients' ? 'Tous les clients' : 'Clients spécifiques'}</Text>
              </div>
            </Space>
          </div>

          {editingTemplate?.target === 'specific_clients' && (
             <Form.Item
               name="recipients"
               label="Destinataires"
               rules={[{ required: true, message: 'Sélectionnez au moins un destinataire' }]}
             >
               <Select mode="multiple" placeholder="Sélectionner des clients">
                 <Option value="client1">Client A</Option>
                 <Option value="client2">Client B</Option>
                 <Option value="client3">Client C</Option>
               </Select>
             </Form.Item>
          )}

          {(editingTemplate?.type === 'email' || editingTemplate?.type === 'all') && (
            <Form.Item
              name="subject"
              label="Sujet"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          )}

          <Form.Item
            name="content"
            label="Message"
            rules={[{ required: true }]}
          >
            <TextArea rows={6} />
          </Form.Item>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>Note: Cette action enverra la notification immédiatement aux destinataires sélectionnés.</p>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationManagementPage;
