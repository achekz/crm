import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Form,
  Modal,
  DatePicker,
  TimePicker,
  Row,
  Col,
  Typography,
  notification,
  Empty,
  Spin,
  Badge
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
  EditOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { 
  getAppointments,  
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  Appointment 
} from "../../../services/appointmentService";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const ClientAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [form] = Form.useForm();

  // Fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch appointments'
      });
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAppointment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    form.setFieldsValue({
      title: appointment.title,
      description: appointment.description,
      date: dayjs(appointment.date),
      time: dayjs(appointment.time, 'HH:mm'),
      duration: appointment.duration,
      type: appointment.type,
      location: appointment.location,
      meetingUrl: appointment.meetingUrl,
      notes: appointment.notes
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Cancel Appointment',
      content: 'Are you sure you want to cancel this appointment?',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteAppointment(id);
          notification.success({
            message: 'Success',
            description: 'Appointment cancelled successfully'
          });
          fetchAppointments();
        } catch (error) {
          notification.error({
            message: 'Error',
            description: 'Failed to cancel appointment'
          });
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      const appointmentData = {
        title: values.title,
        description: values.description,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        duration: values.duration,
        type: values.type,
        location: values.location,
        meetingUrl: values.meetingUrl,
        notes: values.notes
      };

      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentData);
        notification.success({
          message: 'Success',
          description: 'Appointment updated successfully'
        });
      } else {
        await createAppointment(appointmentData);
        notification.success({
          message: 'Success',
          description: 'Appointment created successfully'
        });
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to save appointment'
      });
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingAppointment(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'rescheduled':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'presential':
        return <EnvironmentOutlined />;
      case 'video':
        return <VideoCameraOutlined />;
      case 'phone':
        return <PhoneOutlined />;
      default:
        return <CalendarOutlined />;
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         appointment.description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesType = typeFilter === 'all' || appointment.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Appointment) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
          )}
        </div>
      )
    },
    {
      title: 'Date & Time',
      dataIndex: 'date',
      key: 'date',
      render: (date: string, record: Appointment) => (
        <div>
          <div><CalendarOutlined /> {dayjs(date).format('MMM DD, YYYY')}</div>
          <div><ClockCircleOutlined /> {record.time} ({record.duration} min)</div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag icon={getTypeIcon(type)}>{type.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge 
          status={status === 'scheduled' ? 'processing' : 
                  status === 'completed' ? 'success' : 
                  status === 'cancelled' ? 'error' : 'warning'}
          text={<Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>}
        />
      )
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string, record: Appointment) => (
        location ? (
          <div>
            <EnvironmentOutlined /> {location}
            {record.meetingUrl && (
              <div style={{ fontSize: '12px' }}>
                <a href={record.meetingUrl} target="_blank" rel="noopener noreferrer">
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        ) : record.meetingUrl ? (
          <a href={record.meetingUrl} target="_blank" rel="noopener noreferrer">
            <VideoCameraOutlined /> Join Meeting
          </a>
        ) : (
          <Text type="secondary">No location</Text>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Appointment) => (
        <Space size="small">
          {record.status === 'scheduled' && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
          )}
          {record.status === 'scheduled' && (
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              Cancel
            </Button>
          )}
        </Space>
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
          <CalendarOutlined /> My Appointments
        </Title>
        <Text type="secondary">Manage your scheduled appointments</Text>
      </div>

      {/* Filters and Actions */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Search
            placeholder="Search appointments..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="all">All Status</Option>
            <Option value="scheduled">Scheduled</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
            <Option value="rescheduled">Rescheduled</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="Filter by type"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="all">All Types</Option>
            <Option value="presential">Presential</Option>
            <Option value="video">Video</Option>
            <Option value="phone">Phone</Option>
          </Select>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Book Appointment
          </Button>
        </Col>
      </Row>

      {/* Appointments Table */}
      <Table
        columns={columns}
        dataSource={filteredAppointments}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description="No appointments found" />
        }}
      />

      {/* Modal for Create/Edit */}
      <Modal
        title={editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Appointment Title"
            rules={[{ required: true, message: 'Please enter appointment title' }]}
          >
            <Input placeholder="e.g., Project Review, Consultation, Training" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              placeholder="Brief description of what will be discussed" 
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
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
                label="Time"
                rules={[{ required: true, message: 'Please select time' }]}
              >
                <TimePicker 
                  style={{ width: '100%' }}
                  format="HH:mm"
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label="Duration (minutes)"
                rules={[{ required: true, message: 'Please enter duration' }]}
                initialValue={60}
              >
                <Select>
                  <Option value={30}>30 minutes</Option>
                  <Option value={60}>1 hour</Option>
                  <Option value={90}>1.5 hours</Option>
                  <Option value={120}>2 hours</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Appointment Type"
                rules={[{ required: true, message: 'Please select type' }]}
                initialValue="video"
              >
                <Select>
                  <Option value="presential">Presential (In-person)</Option>
                  <Option value="video">Video Call</Option>
                  <Option value="phone">Phone Call</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="Location / Meeting Details"
          >
            <Input placeholder="Office address, room number, or meeting details" />
          </Form.Item>

          <Form.Item
            name="meetingUrl"
            label="Meeting URL (for video calls)"
          >
            <Input placeholder="https://zoom.us/j/123456789" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Additional Notes"
          >
            <TextArea 
              placeholder="Any additional information or requirements" 
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientAppointmentsPage;