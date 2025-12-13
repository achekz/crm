import React, { useState } from 'react';
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
  Modal,
  Form,
  DatePicker,
  TimePicker,
  Select,
  message,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'presential' | 'video' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled';
  description?: string;
  location?: string;
}

const ClientAppointmentsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Mock data for appointments
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      title: 'Réunion projet Q1',
      date: '2024-01-25',
      time: '14:00',
      type: 'presential',
      status: 'scheduled',
      description: 'Présentation des résultats du premier trimestre',
      location: 'Bureau Paris - Salle de réunion A',
    },
    {
      id: '2',
      title: 'Suivi mensuel',
      date: '2024-02-01',
      time: '10:30',
      type: 'video',
      status: 'scheduled',
      description: 'Point mensuel sur l\'avancement des projets',
    },
    {
      id: '3',
      title: 'Formation équipe',
      date: '2024-01-15',
      time: '09:00',
      type: 'presential',
      status: 'completed',
      description: 'Formation sur les nouveaux outils',
      location: 'Centre de formation Lyon',
    },
  ]);

  const filteredAppointments = appointments.filter(appointment =>
    appointment.title.toLowerCase().includes(searchText.toLowerCase()) ||
    appointment.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    const icons = {
      presential: <EnvironmentOutlined />,
      video: <VideoCameraOutlined />,
      phone: <ClockCircleOutlined />,
    };
    return icons[type as keyof typeof icons];
  };

  const getTypeText = (type: string) => {
    const texts = {
      presential: 'Présentiel',
      video: 'Visioconférence',
      phone: 'Téléphone',
    };
    return texts[type as keyof typeof texts];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'blue',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusText = (status: string) => {
    const texts = {
      scheduled: 'Planifié',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return texts[status as keyof typeof texts];
  };

  const columns = [
    {
      title: 'Rendez-vous',
      key: 'appointment',
      render: (record: Appointment) => (
        <div>
          <Text strong>{record.title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Date & Heure',
      key: 'datetime',
      render: (record: Appointment) => (
        <Space direction="vertical" size="small">
          <Text>{dayjs(record.date).format('DD/MM/YYYY')}</Text>
          <Text type="secondary">{record.time}</Text>
        </Space>
      ),
      sorter: (a: Appointment, b: Appointment) => 
        new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          {getTypeIcon(type)}
          {getTypeText(type)}
        </Space>
      ),
    },
    {
      title: 'Lieu',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => location || 'En ligne',
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
      render: (record: Appointment) => (
        <Space>
          {record.status === 'scheduled' && (
            <>
              {record.type === 'video' && (
                <Button type="primary" size="small" icon={<VideoCameraOutlined />}>
                  Rejoindre
                </Button>
              )}
              <Button size="small">
                Modifier
              </Button>
              <Button size="small" danger>
                Annuler
              </Button>
            </>
          )}
          {record.status === 'completed' && (
            <Button size="small" icon={<CheckCircleOutlined />} disabled>
              Terminé
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleSubmit = (values: any) => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      title: values.title,
      date: values.date.format('YYYY-MM-DD'),
      time: values.time.format('HH:mm'),
      type: values.type,
      status: 'scheduled',
      description: values.description,
      location: values.location,
    };

    setAppointments([...appointments, newAppointment]);
    message.success('Rendez-vous demandé avec succès');
    setModalVisible(false);
    form.resetFields();
  };

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && dayjs(`${apt.date} ${apt.time}`).isAfter(dayjs())
  ).length;

  const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Mes rendez-vous</Title>
        <Text type="secondary">Gérez vos rendez-vous et réunions</Text>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Space>
              <CalendarOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Text type="secondary">À venir</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>{upcomingAppointments}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space>
              <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              <div>
                <Text type="secondary">Terminés</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>{completedAppointments}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space>
              <VideoCameraOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
              <div>
                <Text type="secondary">En ligne</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>
                  {appointments.filter(apt => apt.type === 'video').length}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Rechercher un rendez-vous..."
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
            Demander un rendez-vous
          </Button>
        </Space>

        <Table
          dataSource={filteredAppointments}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} rendez-vous`,
          }}
        />
      </Card>

      {/* Modal de demande de rendez-vous */}
      <Modal
        title="Demander un rendez-vous"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs().add(1, 'day'),
            time: dayjs('14:00', 'HH:mm'),
            type: 'video',
          }}
        >
          <Form.Item
            name="title"
            label="Objet du rendez-vous"
            rules={[{ required: true, message: 'L\'objet est requis' }]}
          >
            <Input placeholder="Ex: Réunion projet, Suivi mensuel..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'La date est requise' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="time"
                label="Heure"
                rules={[{ required: true, message: 'L\'heure est requise' }]}
              >
                <TimePicker 
                  style={{ width: '100%' }}
                  format="HH:mm"
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="type"
            label="Type de rendez-vous"
            rules={[{ required: true, message: 'Le type est requis' }]}
          >
            <Select>
              <Option value="video">
                <Space>
                  <VideoCameraOutlined />
                  Visioconférence
                </Space>
              </Option>
              <Option value="presential">
                <Space>
                  <EnvironmentOutlined />
                  Présentiel
                </Space>
              </Option>
              <Option value="phone">
                <Space>
                  <ClockCircleOutlined />
                  Téléphone
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="location" label="Lieu (si présentiel)">
            <Input placeholder="Adresse ou lieu de rendez-vous" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea 
              rows={3} 
              placeholder="Décrivez l'objet du rendez-vous, les points à aborder..." 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientAppointmentsPage;