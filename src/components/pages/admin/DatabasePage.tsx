import React, { useState } from 'react';
import { Card, Button, Table, Progress, message, Row, Col, Typography, Statistic, Modal, Upload } from 'antd';
import { 
  DatabaseOutlined, 
  DownloadOutlined, 
  UploadOutlined, 
  DeleteOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FileOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const DatabasePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);

  // Mock data for database statistics
  const dbStats = {
    totalSize: '245.8 MB',
    totalTables: 12,
    totalRecords: 15420,
    lastBackup: '2024-01-20 02:00:00',
  };

  // Mock data for tables
  const tables = [
    { name: 'users', records: 156, size: '2.4 MB', lastModified: '2024-01-20 14:30' },
    { name: 'clients', records: 89, size: '1.8 MB', lastModified: '2024-01-20 12:15' },
    { name: 'invoices', records: 1247, size: '45.2 MB', lastModified: '2024-01-20 16:45' },
    { name: 'payments', records: 892, size: '12.6 MB', lastModified: '2024-01-20 15:20' },
    { name: 'messages', records: 3456, size: '8.9 MB', lastModified: '2024-01-20 17:10' },
    { name: 'notifications', records: 2890, size: '3.2 MB', lastModified: '2024-01-20 16:55' },
  ];

  // Mock data for backups
  const backups = [
    { id: '1', name: 'backup_2024-01-20_02-00.sql', size: '234.5 MB', date: '2024-01-20 02:00', type: 'Automatique' },
    { id: '2', name: 'backup_2024-01-19_02-00.sql', size: '231.2 MB', date: '2024-01-19 02:00', type: 'Automatique' },
    { id: '3', name: 'backup_manual_2024-01-18.sql', size: '228.9 MB', date: '2024-01-18 14:30', type: 'Manuel' },
  ];

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      message.success('Sauvegarde créée avec succès');
      setBackupModalVisible(false);
    } catch (error) {
      message.error('Erreur lors de la création de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = (backupId: string) => {
    message.info('Téléchargement de la sauvegarde en cours...');
  };

  const handleDeleteBackup = (backupId: string) => {
    Modal.confirm({
      title: 'Supprimer la sauvegarde',
      content: 'Êtes-vous sûr de vouloir supprimer cette sauvegarde ?',
      icon: <ExclamationCircleOutlined />,
      onOk: () => {
        message.success('Sauvegarde supprimée');
      },
    });
  };

  const handleOptimizeDatabase = async () => {
    Modal.confirm({
      title: 'Optimiser la base de données',
      content: 'Cette opération peut prendre plusieurs minutes. Continuer ?',
      onOk: async () => {
        setLoading(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          message.success('Base de données optimisée avec succès');
        } catch (error) {
          message.error('Erreur lors de l\'optimisation');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const tableColumns = [
    {
      title: 'Table',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center">
          <DatabaseOutlined className="mr-2 text-blue-600" />
          <Text strong>{name}</Text>
        </div>
      ),
    },
    {
      title: 'Enregistrements',
      dataIndex: 'records',
      key: 'records',
      render: (records: number) => records.toLocaleString(),
    },
    {
      title: 'Taille',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: 'Dernière modification',
      dataIndex: 'lastModified',
      key: 'lastModified',
    },
  ];

  const backupColumns = [
    {
      title: 'Nom du fichier',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center">
          <FileOutlined className="mr-2 text-green-600" />
          <Text>{name}</Text>
        </div>
      ),
    },
    {
      title: 'Taille',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <div className="space-x-2">
          <Button 
            type="text" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadBackup(record.id)}
          >
            Télécharger
          </Button>
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteBackup(record.id)}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.sql',
    beforeUpload: () => false,
    onChange: (info: any) => {
      message.success('Fichier de restauration sélectionné');
    },
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Base de données</Title>
        <Text type="secondary">Gérez et surveillez votre base de données</Text>
      </div>

      {/* Statistics */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic 
              title="Taille totale" 
              value={dbStats.totalSize} 
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Tables" 
              value={dbStats.totalTables} 
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Enregistrements" 
              value={dbStats.totalRecords} 
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div>
              <Text type="secondary">Dernière sauvegarde</Text>
              <br />
              <Text strong>{dbStats.lastBackup}</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Database Health */}
      <Card title="État de la base de données" className="mb-6">
        <Row gutter={16}>
          <Col span={8}>
            <div className="mb-4">
              <Text>Performance</Text>
              <Progress percent={85} status="active" strokeColor="#52c41a" />
            </div>
          </Col>
          <Col span={8}>
            <div className="mb-4">
              <Text>Utilisation de l'espace</Text>
              <Progress percent={62} strokeColor="#1890ff" />
            </div>
          </Col>
          <Col span={8}>
            <div className="mb-4">
              <Text>Intégrité des données</Text>
              <Progress percent={100} strokeColor="#52c41a" />
            </div>
          </Col>
        </Row>
        
        <div className="mt-4">
          <Button 
            type="primary" 
            icon={<SyncOutlined />}
            onClick={handleOptimizeDatabase}
            loading={loading}
          >
            Optimiser la base de données
          </Button>
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          {/* Tables */}
          <Card title="Tables de la base de données" className="mb-6">
            <Table
              dataSource={tables}
              columns={tableColumns}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={12}>
          {/* Backup Management */}
          <Card 
            title="Gestion des sauvegardes"
            extra={
              <div className="space-x-2">
                <Button 
                  type="primary" 
                  icon={<CloudDownloadOutlined />}
                  onClick={() => setBackupModalVisible(true)}
                >
                  Créer une sauvegarde
                </Button>
                <Button 
                  icon={<UploadOutlined />}
                  onClick={() => setRestoreModalVisible(true)}
                >
                  Restaurer
                </Button>
              </div>
            }
          >
            <Table
              dataSource={backups}
              columns={backupColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Backup Modal */}
      <Modal
        title="Créer une sauvegarde"
        open={backupModalVisible}
        onCancel={() => setBackupModalVisible(false)}
        onOk={handleCreateBackup}
        confirmLoading={loading}
      >
        <Text>
          Une sauvegarde complète de la base de données va être créée. 
          Cette opération peut prendre quelques minutes selon la taille de vos données.
        </Text>
      </Modal>

      {/* Restore Modal */}
      <Modal
        title="Restaurer la base de données"
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRestoreModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="restore" type="primary" danger>
            Restaurer
          </Button>,
        ]}
      >
        <div className="mb-4">
          <Text type="warning" strong>
            ⚠️ Attention: Cette opération remplacera toutes les données actuelles.
          </Text>
        </div>
        
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            Cliquez ou glissez un fichier de sauvegarde (.sql) ici
          </p>
          <p className="ant-upload-hint">
            Seuls les fichiers .sql sont acceptés
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};

export default DatabasePage;