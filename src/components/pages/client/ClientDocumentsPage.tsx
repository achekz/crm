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
  Upload,
  message,
  Modal,
  Progress,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DeleteOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Dragger } = Upload;

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  category: 'contract' | 'invoice' | 'report' | 'other';
  status: 'active' | 'archived';
  downloadUrl?: string;
}

const ClientDocumentsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchText, setSearchText] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock data for documents
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Contrat de service 2024.pdf',
      type: 'pdf',
      size: 2048576,
      uploadDate: '2024-01-15',
      category: 'contract',
      status: 'active',
    },
    {
      id: '2',
      name: 'Facture FAC-2024-001.pdf',
      type: 'pdf',
      size: 512000,
      uploadDate: '2024-01-20',
      category: 'invoice',
      status: 'active',
    },
    {
      id: '3',
      name: 'Rapport mensuel janvier.docx',
      type: 'docx',
      size: 1024000,
      uploadDate: '2024-01-25',
      category: 'report',
      status: 'active',
    },
    {
      id: '4',
      name: 'Présentation projet.pptx',
      type: 'pptx',
      size: 3072000,
      uploadDate: '2024-01-18',
      category: 'other',
      status: 'active',
    },
  ]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: string) => {
    const icons = {
      pdf: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      docx: <FileWordOutlined style={{ color: '#1890ff' }} />,
      xlsx: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      pptx: <FileTextOutlined style={{ color: '#fa8c16' }} />,
      jpg: <FileImageOutlined style={{ color: '#722ed1' }} />,
      png: <FileImageOutlined style={{ color: '#722ed1' }} />,
      default: <FileTextOutlined style={{ color: '#8c8c8c' }} />,
    };
    return icons[type as keyof typeof icons] || icons.default;
  };

  const getCategoryText = (category: string) => {
    const texts = {
      contract: 'Contrat',
      invoice: 'Facture',
      report: 'Rapport',
      other: 'Autre',
    };
    return texts[category as keyof typeof texts];
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      contract: 'blue',
      invoice: 'green',
      report: 'orange',
      other: 'default',
    };
    return colors[category as keyof typeof colors];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'Document',
      key: 'document',
      render: (record: Document) => (
        <Space>
          {getFileIcon(record.type)}
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatFileSize(record.size)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryText(category)}
        </Tag>
      ),
    },
    {
      title: 'Date d\'ajout',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: Document, b: Document) => 
        new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime(),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'Actif' : 'Archivé'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Document) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} size="small">
            Voir
          </Button>
          <Button type="text" icon={<DownloadOutlined />} size="small">
            Télécharger
          </Button>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger>
            Supprimer
          </Button>
        </Space>
      ),
    },
  ];

  const uploadProps = {
    name: 'file',
    multiple: true,
    beforeUpload: (file: File) => {
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.name.split('.').pop() || 'unknown',
        size: file.size,
        uploadDate: dayjs().format('YYYY-MM-DD'),
        category: 'other',
        status: 'active',
      };
      
      setDocuments([...documents, newDocument]);
      message.success(`${file.name} téléchargé avec succès`);
      return false; // Prevent actual upload
    },
  };

  // Statistiques
  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
  const recentDocuments = documents.filter(doc => 
    dayjs().diff(dayjs(doc.uploadDate), 'days') <= 7
  ).length;

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Mes documents</Title>
        <Text type="secondary">Gérez vos documents et fichiers</Text>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Space>
              <FolderOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Text type="secondary">Total documents</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>{totalDocuments}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Space>
              <FileTextOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              <div>
                <Text type="secondary">Espace utilisé</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>{formatFileSize(totalSize)}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Space>
              <UploadOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
              <div>
                <Text type="secondary">Cette semaine</Text>
                <br />
                <Text strong style={{ fontSize: '20px' }}>{recentDocuments}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div>
              <Text type="secondary">Espace disponible</Text>
              <br />
              <Progress percent={25} size="small" />
              <Text style={{ fontSize: '12px' }}>2.5 GB / 10 GB</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="Rechercher un document..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Button.Group>
              <Button 
                type={selectedCategory === 'all' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('all')}
              >
                Tous
              </Button>
              <Button 
                type={selectedCategory === 'contract' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('contract')}
              >
                Contrats
              </Button>
              <Button 
                type={selectedCategory === 'invoice' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('invoice')}
              >
                Factures
              </Button>
              <Button 
                type={selectedCategory === 'report' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('report')}
              >
                Rapports
              </Button>
            </Button.Group>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Télécharger un document
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filteredDocuments}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} documents`,
          }}
        />
      </Card>

      {/* Modal de téléchargement */}
      <Modal
        title="Télécharger des documents"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setUploadModalVisible(false)}>
            Fermer
          </Button>,
        ]}
        width={600}
      >
        <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            Cliquez ou glissez-déposez vos fichiers ici
          </p>
          <p className="ant-upload-hint">
            Formats supportés: PDF, DOC, XLS, PPT, images (max 10MB par fichier)
          </p>
        </Dragger>
        
        <Text type="secondary">
          Vos documents seront automatiquement organisés par catégorie.
          Vous pourrez les modifier après téléchargement.
        </Text>
      </Modal>
    </div>
  );
};

export default ClientDocumentsPage;