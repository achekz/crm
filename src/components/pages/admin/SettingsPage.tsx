import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, Select, message, Row, Col, Typography, Divider, TimePicker } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Paramètres mis à jour avec succès');
    } catch (error) {
      message.error('Erreur lors de la mise à jour des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Paramètres généraux</Title>
        <Text type="secondary">Configurez les paramètres de l'application</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          companyName: 'ERP Solutions',
          currency: 'EUR',
          timezone: 'Europe/Paris',
          language: 'fr',
          emailNotifications: true,
          smsNotifications: false,
          autoBackup: true,
          backupTime: dayjs('02:00', 'HH:mm'),
          invoicePrefix: 'FAC-',
          quotePrefix: 'DEV-',
          taxRate: 20,
        }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Paramètres de l'entreprise" className="mb-6">
              <Form.Item
                name="companyName"
                label="Nom de l'entreprise"
                rules={[{ required: true, message: 'Le nom de l\'entreprise est requis' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item name="currency" label="Devise">
                <Select defaultValue="TND" style={{ width: '100%' }}>
                  <Option value="TND">Dinar Tunisien (TND)</Option>
                  <Option value="USD">Dollar US ($)</Option>
                  <Option value="EUR">Euro (€)</Option>
                </Select>
              </Form.Item>

              <Form.Item name="timezone" label="Fuseau horaire">
                <Select>
                  <Option value="Europe/Paris">Europe/Paris</Option>
                  <Option value="Europe/London">Europe/London</Option>
                  <Option value="America/New_York">America/New_York</Option>
                </Select>
              </Form.Item>

              <Form.Item name="language" label="Langue">
                <Select>
                  <Option value="fr">Français</Option>
                  <Option value="en">English</Option>
                  <Option value="es">Español</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="Notifications" className="mb-6">
              <Form.Item name="emailNotifications" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Notifications par email</Text>
                    <br />
                    <Text type="secondary">Recevoir les notifications importantes par email</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Form.Item name="smsNotifications" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Notifications SMS</Text>
                    <br />
                    <Text type="secondary">Recevoir les alertes urgentes par SMS</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>
            </Card>

            <Card title="Sauvegarde automatique">
              <Form.Item name="autoBackup" valuePropName="checked">
                <div className="flex justify-between items-center">
                  <div>
                    <Text strong>Sauvegarde automatique</Text>
                    <br />
                    <Text type="secondary">Sauvegarder automatiquement les données</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="backupTime" label="Heure de sauvegarde">
                <TimePicker format="HH:mm" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Card title="Paramètres de facturation" className="mb-6">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="invoicePrefix" label="Préfixe des factures">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="quotePrefix" label="Préfixe des devis">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxRate" label="Taux de TVA (%)">
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
          >
            Sauvegarder les paramètres
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsPage;