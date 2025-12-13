import React, { useState } from 'react';
import { Card, Button, Table, Switch, message, Row, Col, Typography, Modal, Form, Input, Select, Tag } from 'antd';
import { 
  ApiOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const ApiIntegrationsPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<any>(null);
  const [form] = Form.useForm();

  // Mock data for API integrations
  const integrations = [
    {
      id: '1',
      name: 'Stripe',
      description: 'Traitement des paiements en ligne',
      status: 'active',
      type: 'payment',
      lastSync: '2024-01-20 14:30',
      requests: 1247,
    },
    {
      id: '2',
      name: 'SendGrid',
      description: 'Envoi d\'emails transactionnels',
      status: 'active',
      type: 'email',
      lastSync: '2024-01-20 15:45',
      requests: 892,
    },
    {
      id: '3',
      name: 'Slack',
      description: 'Notifications d\'équipe',
      status: 'inactive',
      type: 'notification',
      lastSync: '2024-01-18 09:20',
      requests: 156,
    },
    {
      id: '4',
      name: 'Google Drive',
      description: 'Stockage de documents',
      status: 'active',
      type: 'storage',
      lastSync: '2024-01-20 16:10',
      requests: 445,
    },
  ];

  // Mock data for API keys
  const apiKeys = [
    {
      id: '1',
      name: 'Production API Key',
      key: 'pk_live_51H...****...xyz',
      created: '2024-01-15',
      lastUsed: '2024-01-20 14:30',
      permissions: ['read', 'write'],
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'pk_test_51H...****...abc',
      created: '2024-01-10',
      lastUsed: '2024-01-19 11:20',
      permissions: ['read'],
    },
  ];

  const handleToggleIntegration = (id: string, status: string) => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    message.success(`Intégration ${newStatus === 'active' ? 'activée' : 'désactivée'}`);
  };

  const handleDeleteIntegration = (id: string) => {
    Modal.confirm({
      title: 'Supprimer l\'intégration',
      content: 'Êtes-vous sûr de vouloir supprimer cette intégration ?',
      icon: <ExclamationCircleOutlined />,
      onOk: () => {
        message.success('Intégration supprimée');
      },
    });
  };

  const handleSubmit = (values: any) => {
    if (editingIntegration) {
      message.success('Intégration mise à jour');
    } else {
      message.success('Nouvelle intégration ajoutée');
    }
    setModalVisible(false);
    setEditingIntegration(null);
    form.resetFields();
  };

  const handleGenerateApiKey = () => {
    Modal.confirm({
      title: 'Générer une nouvelle clé API',
      content: 'Une nouvelle clé API va être générée. Voulez-vous continuer ?',
      onOk: () => {
        message.success('Nouvelle clé API générée');
      },
    });
  };

  const integrationColumns = [
    {
      title: 'Service',
      key: 'service',
      render: (record: any) => (
        <div className="flex items-center">
          <ApiOutlined className="mr-2 text-blue-600" />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-sm">{record.description}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colors = {
          payment: 'green',
          email: 'blue',
          notification: 'orange',
          storage: 'purple',
        };
        return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>;
      },
    },
    {
      title: 'Statut',
      key: 'status',
      render: (record: any) => (
        <Switch
          checked={record.status === 'active'}
          onChange={() => handleToggleIntegration(record.id, record.status)}
          checkedChildren="Actif"
          unCheckedChildren="Inactif"
        />
      ),
    },
    {
      title: 'Dernière sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
    },
    {
      title: 'Requêtes',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests: number) => requests.toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <div className="space-x-2">
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingIntegration(record);
              setModalVisible(true);
              form.setFieldsValue(record);
            }}
          >
            Modifier
          </Button>
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteIntegration(record.id)}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const apiKeyColumns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Clé',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Text code className="text-sm">{key}</Text>
      ),
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <div>
          {permissions.map(permission => (
            <Tag key={permission} color="blue">{permission}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Créée le',
      dataIndex: 'created',
      key: 'created',
    },
    {
      title: 'Dernière utilisation',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="text" danger icon={<DeleteOutlined />}>
          Révoquer
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2}>API & Intégrations</Title>
        <Text type="secondary">Gérez vos intégrations et clés API</Text>
      </div>

      {/* API Status Overview */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircleOutlined className="text-2xl text-green-600" />
            </div>
            <Text strong className="text-lg">4</Text>
            <br />
            <Text type="secondary">Intégrations actives</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="text-center">
            <div className="flex items-center justify-center mb-2">
              <ApiOutlined className="text-2xl text-blue-600" />
            </div>
            <Text strong className="text-lg">2,740</Text>
            <br />
            <Text type="secondary">Requêtes ce mois</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="text-center">
            <div className="flex items-center justify-center mb-2">
              <KeyOutlined className="text-2xl text-purple-600" />
            </div>
            <Text strong className="text-lg">2</Text>
            <br />
            <Text type="secondary">Clés API actives</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="text-center">
            <div className="flex items-center justify-center mb-2">
              <LinkOutlined className="text-2xl text-orange-600" />
            </div>
            <Text strong className="text-lg">99.9%</Text>
            <br />
            <Text type="secondary">Disponibilité</Text>
          </Card>
        </Col>
      </Row>

      {/* Integrations */}
      <Card 
        title="Intégrations"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingIntegration(null);
              setModalVisible(true);
              form.resetFields();
            }}
          >
            Ajouter une intégration
          </Button>
        }
        className="mb-6"
      >
        <Table
          dataSource={integrations}
          columns={integrationColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* API Keys */}
      <Card 
        title="Clés API"
        extra={
          <Button 
            type="primary" 
            icon={<KeyOutlined />}
            onClick={handleGenerateApiKey}
          >
            Générer une clé
          </Button>
        }
      >
        <Table
          dataSource={apiKeys}
          columns={apiKeyColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Integration Modal */}
      <Modal
        title={editingIntegration ? 'Modifier l\'intégration' : 'Nouvelle intégration'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingIntegration(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Nom du service"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'La description est requise' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type d'intégration"
            rules={[{ required: true, message: 'Le type est requis' }]}
          >
            <Select>
              <Option value="payment">Paiement</Option>
              <Option value="email">Email</Option>
              <Option value="notification">Notification</Option>
              <Option value="storage">Stockage</Option>
              <Option value="analytics">Analytics</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="Clé API"
            rules={[{ required: true, message: 'La clé API est requise' }]}
          >
            <Input.Password placeholder="Entrez votre clé API" />
          </Form.Item>

          <Form.Item
            name="webhookUrl"
            label="URL de webhook (optionnel)"
          >
            <Input placeholder="https://votre-domaine.com/webhook" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiIntegrationsPage;