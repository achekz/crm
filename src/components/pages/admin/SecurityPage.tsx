import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, Table, Tag, message, Row, Col, Typography, Divider, Modal } from 'antd';
import { SaveOutlined, SecurityScanOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SecurityPage: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Mock data for login sessions
  const sessions = [
    {
      id: '1',
      device: 'Chrome sur Windows',
      location: 'Paris, France',
      ip: '192.168.1.100',
      lastActive: '2024-01-20 14:30',
      current: true,
    },
    {
      id: '2',
      device: 'Safari sur iPhone',
      location: 'Lyon, France',
      ip: '192.168.1.101',
      lastActive: '2024-01-19 09:15',
      current: false,
    },
  ];

  const handleSecuritySubmit = async (values: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Paramètres de sécurité mis à jour');
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Mot de passe modifié avec succès');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error('Erreur lors du changement de mot de passe');
    }
  };

  const handleTerminateSession = (sessionId: string) => {
    Modal.confirm({
      title: 'Terminer la session',
      content: 'Êtes-vous sûr de vouloir terminer cette session ?',
      onOk: () => {
        message.success('Session terminée');
      },
    });
  };

  const sessionColumns = [
    {
      title: 'Appareil',
      dataIndex: 'device',
      key: 'device',
    },
    {
      title: 'Localisation',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Adresse IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: 'Dernière activité',
      dataIndex: 'lastActive',
      key: 'lastActive',
    },
    {
      title: 'Statut',
      key: 'status',
      render: (record: any) => (
        <Tag color={record.current ? 'green' : 'default'}>
          {record.current ? 'Session actuelle' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        !record.current && (
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleTerminateSession(record.id)}
          >
            Terminer
          </Button>
        )
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Sécurité</Title>
        <Text type="secondary">Gérez la sécurité de votre compte</Text>
      </div>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="Paramètres de sécurité" className="mb-6">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSecuritySubmit}
              initialValues={{
                twoFactorAuth: false,
                loginNotifications: true,
                sessionTimeout: 30,
                passwordExpiry: false,
              }}
            >
              <Form.Item name="twoFactorAuth" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Authentification à deux facteurs</Text>
                    <br />
                    <Text type="secondary">Ajouter une couche de sécurité supplémentaire</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Form.Item name="loginNotifications" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Notifications de connexion</Text>
                    <br />
                    <Text type="secondary">Être alerté des nouvelles connexions</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Form.Item name="passwordExpiry" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Expiration du mot de passe</Text>
                    <br />
                    <Text type="secondary">Forcer le changement de mot de passe périodiquement</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="sessionTimeout" label="Délai d'expiration de session (minutes)">
                <Input type="number" min={5} max={480} />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  Sauvegarder
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Mot de passe" className="mb-6">
            <Text type="secondary">
              Dernière modification: Il y a 30 jours
            </Text>
            <br />
            <Button 
              type="primary" 
              className="mt-4"
              onClick={() => setPasswordModalVisible(true)}
            >
              Changer le mot de passe
            </Button>
          </Card>

          <Card title="Activité de sécurité">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <Text strong>Dernière connexion réussie</Text>
                  <br />
                  <Text type="secondary">Aujourd'hui à 09:30 depuis Paris</Text>
                </div>
                <SecurityScanOutlined className="text-green-600 text-xl" />
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text strong>Tentative de connexion échouée</Text>
                  <br />
                  <Text type="secondary">Aucune tentative récente</Text>
                </div>
                <SecurityScanOutlined className="text-gray-400 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Sessions actives" className="mt-6">
        <Table
          dataSource={sessions}
          columns={sessionColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Password Change Modal */}
      <Modal
        title="Changer le mot de passe"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="currentPassword"
            label="Mot de passe actuel"
            rules={[{ required: true, message: 'Le mot de passe actuel est requis' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nouveau mot de passe"
            rules={[
              { required: true, message: 'Le nouveau mot de passe est requis' },
              { min: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Veuillez confirmer le mot de passe' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setPasswordModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                Changer le mot de passe
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPage;