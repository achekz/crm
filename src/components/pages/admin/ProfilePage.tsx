import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, message, Row, Col, Typography, Divider } from 'antd';
import { UserOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { updateProfile, updateAvatar } from '../../../store/slices/authSlice';
import { AppDispatch } from '../../../store';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const [form] = Form.useForm();
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    // Reset form with user data when user changes
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        company: user.company,
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [form, user]);

  const handleSubmit = async (values: any) => {
    try {
      await dispatch(updateProfile(values)).unwrap();
      message.success('Profil mis à jour avec succès');
    } catch (error) {
      message.error('Erreur lors de la mise à jour du profil');
    }
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'uploading') {
      setAvatarLoading(true);
      return;
    }

    if (info.file.status === 'done') {
      // Assuming the server returns the URL of the uploaded image
      const avatarUrl = info.file.response.url;
      
      dispatch(updateAvatar({ avatar: avatarUrl }))
        .unwrap()
        .then(() => {
          setAvatarLoading(false);
          message.success('Photo de profil mise à jour');
        })
        .catch(() => {
          setAvatarLoading(false);
          message.error('Échec de la mise à jour de la photo de profil');
        });
    } else if (info.file.status === 'error') {
      setAvatarLoading(false);
      message.error('Échec du téléchargement de l\'image');
    }
  };

  // Custom upload handler for avatar
  const customUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    // Create a FormData instance
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      // Here you would normally upload to your server
      // For demo, we'll simulate a successful response
      setTimeout(() => {
        onSuccess({ url: URL.createObjectURL(file) });
      }, 1000);
      
      // Actual implementation would be:
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();
      // onSuccess(data);
    } catch (error) {
      onError(error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Mon profil</Title>
        <Text type="secondary">Gérez vos informations personnelles</Text>
      </div>

      <Row gutter={24}>
        <Col span={8}>
          <Card title="Photo de profil" className="text-center">
            <div className="mb-4">
              <Avatar 
                size={120} 
                src={user?.avatar} 
                icon={<UserOutlined />}
                className="mb-4"
              />
            </div>
            <Upload
              showUploadList={false}
              customRequest={customUploadRequest}
              onChange={handleAvatarChange}
            >
              <Button icon={<CameraOutlined />} loading={avatarLoading}>
                Changer la photo
              </Button>
            </Upload>
          </Card>

          <Card title="Informations du compte" className="mt-4">
            <div className="space-y-3">
              <div>
                <Text type="secondary">Rôle</Text>
                <br />
                <Text strong>{user?.role === 'admin' ? 'Administrateur' : 'Client'}</Text>
              </div>
              <div>
                <Text type="secondary">Statut</Text>
                <br />
                <Text strong className="text-green-600">Actif</Text>
              </div>
              <div>
                <Text type="secondary">Dernière connexion</Text>
                <br />
                <Text>Aujourd'hui, 09:30</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="Informations personnelles">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                name: user?.name,
                email: user?.email,
                company: user?.company,
                phone: user?.phone || '',
                address: user?.address || '',
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Nom complet"
                    rules={[{ required: true, message: 'Le nom est requis' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'L\'email est requis' },
                      { type: 'email', message: 'Format email invalide' }
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="company" label="Entreprise">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Téléphone">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="address" label="Adresse">
                <Input.TextArea rows={3} />
              </Form.Item>

              <Divider />

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  Sauvegarder les modifications
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;