import React, { useState, useEffect } from 'react';
import { Card, Button, Table, message, Row, Col, Typography, Modal, Form, Input, Select, Tag, Spin } from 'antd';
import { 
  ApiOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  getIntegrations, 
  getIntegrationStats, 
  createIntegration, 
  updateIntegration, 
  deleteIntegration, 
  testIntegration,
  Integration,
  IntegrationStats 
} from '../../../services/integrationService';

const { Title, Text } = Typography;
const { Option } = Select;

const ApiIntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch integrations and stats on component mount
  useEffect(() => {
    fetchIntegrations();
    fetchStats();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      message.error('Failed to fetch integrations');
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getIntegrationStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching integration stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingIntegration(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Integration) => {
    setEditingIntegration(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
      status: record.status
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Integration',
      content: 'Are you sure you want to delete this integration?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteIntegration(id);
          message.success('Integration deleted successfully');
          fetchIntegrations();
          fetchStats();
        } catch (error) {
          message.error('Failed to delete integration');
        }
      }
    });
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      const result = await testIntegration(id);

      if (!result) {
        message.error('Integration test failed');
        return;
      }

      if (result.testResult.success) {
        message.success(result.testResult.message);
      } else {
        message.error(result.testResult.message);
      }
      
      // Refresh integrations to show updated status
      fetchIntegrations();
    } catch (error) {
      message.error('Failed to test integration');
    } finally {
      setTestingId(null);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingIntegration) {
        // Update existing integration
        await updateIntegration(editingIntegration.id, values);
        message.success('Integration updated successfully');
      } else {
        // Create new integration
        await createIntegration(values);
        message.success('Integration created successfully');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchIntegrations();
      fetchStats();
    } catch (error) {
      console.error('Error saving integration:', error);
      message.error('Failed to save integration');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingIntegration(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳';
      case 'email':
        return '📧';
      case 'notification':
        return '🔔';
      case 'storage':
        return '💾';
      case 'calendar':
        return '📅';
      case 'crm':
        return '👥';
      default:
        return '🔗';
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Integration) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{getTypeIcon(record.type)}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'active' && <CheckCircleOutlined />} 
          {status === 'error' && <ExclamationCircleOutlined />}
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Requests',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests: number) => requests.toLocaleString()
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Integration) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="small"
            icon={testingId === record.id ? <LoadingOutlined /> : <LinkOutlined />}
            onClick={() => handleTest(record.id)}
            disabled={testingId === record.id}
          >
            Test
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ApiOutlined /> API & Integrations
        </Title>
        <Text type="secondary">Manage your third-party integrations and API connections</Text>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {stats.overall.totalIntegrations || 0}
                </div>
                <Text type="secondary">Total Integrations</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {stats.overall.activeIntegrations || 0}
                </div>
                <Text type="secondary">Active Integrations</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                  {stats.overall.totalRequests || 0}
                </div>
                <Text type="secondary">Total Requests</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  {stats.overall.totalMonthlyRequests || 0}
                </div>
                <Text type="secondary">Monthly Requests</Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Integration
        </Button>
      </div>

      {/* Integrations Table */}
      <Table
        columns={columns}
        dataSource={integrations}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        loading={loading}
      />

      {/* Modal for Create/Edit */}
      <Modal
        title={editingIntegration ? 'Edit Integration' : 'Add Integration'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Integration Name"
            rules={[{ required: true, message: 'Please enter integration name' }]}
          >
            <Input placeholder="e.g., Stripe, SendGrid, Slack" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea placeholder="Brief description of the integration" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="Integration Type"
            rules={[{ required: true, message: 'Please select integration type' }]}
          >
            <Select placeholder="Select integration type">
              <Option value="payment">Payment</Option>
              <Option value="email">Email</Option>
              <Option value="notification">Notification</Option>
              <Option value="storage">Storage</Option>
              <Option value="calendar">Calendar</Option>
              <Option value="crm">CRM</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="error">Error</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiIntegrationsPage;
