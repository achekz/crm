import React, { useState } from 'react';
import { Card, Button, Collapse, Input, Form, message, Row, Col, Typography, List, Tag, Modal } from 'antd';
import { 
  QuestionCircleOutlined, 
  BookOutlined, 
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  BugOutlined,
  SendOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

const HelpSupportPage: React.FC = () => {
  const [contactForm] = Form.useForm();
  const [ticketModalVisible, setTicketModalVisible] = useState(false);

  // FAQ Data
  const faqData = [
    {
      key: '1',
      question: 'Comment créer une nouvelle facture ?',
      answer: 'Pour créer une nouvelle facture, allez dans le menu "Factures" puis cliquez sur "Nouvelle facture". Remplissez les informations du client, ajoutez les lignes de facturation et sauvegardez.',
    },
    {
      key: '2',
      question: 'Comment ajouter un nouveau client ?',
      answer: 'Dans le menu "Clients", cliquez sur "Nouveau client". Remplissez les informations obligatoires (nom, email, entreprise) et sauvegardez.',
    },
    {
      key: '3',
      question: 'Comment configurer les notifications par email ?',
      answer: 'Allez dans "Paramètres généraux" puis dans la section "Notifications". Activez les notifications par email et configurez vos préférences.',
    },
    {
      key: '4',
      question: 'Comment faire une sauvegarde de mes données ?',
      answer: 'Dans "Base de données", cliquez sur "Créer une sauvegarde". Le système générera automatiquement un fichier de sauvegarde que vous pourrez télécharger.',
    },
    {
      key: '5',
      question: 'Comment changer mon mot de passe ?',
      answer: 'Allez dans "Sécurité" puis cliquez sur "Changer le mot de passe". Entrez votre mot de passe actuel et le nouveau mot de passe.',
    },
  ];

  // Documentation sections
  const docSections = [
    {
      title: 'Guide de démarrage',
      description: 'Apprenez les bases pour commencer avec ERP Pro',
      icon: <BookOutlined className="text-blue-600" />,
      items: ['Installation', 'Configuration initiale', 'Premier client', 'Première facture'],
    },
    {
      title: 'Gestion des clients',
      description: 'Tout sur la gestion de votre portefeuille client',
      icon: <FileTextOutlined className="text-green-600" />,
      items: ['Ajouter un client', 'Modifier les informations', 'Historique client', 'Import/Export'],
    },
    {
      title: 'Facturation',
      description: 'Créez et gérez vos factures efficacement',
      icon: <FileTextOutlined className="text-purple-600" />,
      items: ['Créer une facture', 'Modèles de facture', 'Suivi des paiements', 'Relances'],
    },
    {
      title: 'API & Intégrations',
      description: 'Connectez ERP Pro à vos autres outils',
      icon: <MessageOutlined className="text-orange-600" />,
      items: ['Documentation API', 'Webhooks', 'Intégrations tierces', 'Authentification'],
    },
  ];

  // Support tickets (mock data)
  const supportTickets = [
    {
      id: '#12345',
      subject: 'Problème d\'envoi d\'email',
      status: 'En cours',
      priority: 'Haute',
      created: '2024-01-20',
    },
    {
      id: '#12344',
      subject: 'Question sur la facturation',
      status: 'Résolu',
      priority: 'Normale',
      created: '2024-01-19',
    },
  ];

  const handleContactSubmit = (values: any) => {
    message.success('Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.');
    contactForm.resetFields();
  };

  const handleCreateTicket = () => {
    setTicketModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'En cours': 'blue',
      'Résolu': 'green',
      'Fermé': 'default',
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Haute': 'red',
      'Normale': 'blue',
      'Basse': 'green',
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2}>Aide & Support</Title>
        <Text type="secondary">Trouvez des réponses et obtenez de l'aide</Text>
      </div>

      {/* Quick Actions */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <MessageOutlined className="text-3xl text-blue-600 mb-3" />
            <Title level={4}>Chat en direct</Title>
            <Text type="secondary">Discutez avec notre équipe</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <PhoneOutlined className="text-3xl text-green-600 mb-3" />
            <Title level={4}>Support téléphonique</Title>
            <Text type="secondary">+33 1 23 45 67 89</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <MailOutlined className="text-3xl text-purple-600 mb-3" />
            <Title level={4}>Email</Title>
            <Text type="secondary">support@erp-pro.com</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            className="text-center hover:shadow-lg transition-shadow cursor-pointer"
            onClick={handleCreateTicket}
          >
            <BugOutlined className="text-3xl text-orange-600 mb-3" />
            <Title level={4}>Signaler un bug</Title>
            <Text type="secondary">Créer un ticket</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          {/* FAQ */}
          <Card title="Questions fréquentes" className="mb-6">
            <Collapse>
              {faqData.map(faq => (
                <Panel 
                  header={faq.question} 
                  key={faq.key}
                  extra={<QuestionCircleOutlined />}
                >
                  <Paragraph>{faq.answer}</Paragraph>
                </Panel>
              ))}
            </Collapse>
          </Card>

          {/* Documentation */}
          <Card title="Documentation">
            <Row gutter={16}>
              {docSections.map((section, index) => (
                <Col span={12} key={index} className="mb-4">
                  <Card size="small" className="hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{section.icon}</div>
                      <div className="flex-1">
                        <Title level={5} className="mb-2">{section.title}</Title>
                        <Text type="secondary" className="text-sm mb-3 block">
                          {section.description}
                        </Text>
                        <List
                          size="small"
                          dataSource={section.items}
                          renderItem={item => (
                            <List.Item className="py-1">
                              <Button type="link" size="small" className="p-0 h-auto">
                                {item}
                              </Button>
                            </List.Item>
                          )}
                        />
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          {/* Contact Form */}
          <Card title="Nous contacter" className="mb-6">
            <Form
              form={contactForm}
              layout="vertical"
              onFinish={handleContactSubmit}
            >
              <Form.Item
                name="subject"
                label="Sujet"
                rules={[{ required: true, message: 'Le sujet est requis' }]}
              >
                <Input placeholder="Décrivez brièvement votre demande" />
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: 'Le message est requis' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Décrivez votre problème ou votre question en détail"
                />
              </Form.Item>

              <Form.Item
                name="priority"
                label="Priorité"
                initialValue="normale"
              >
                <Input.Group compact>
                  <Button type="default">Basse</Button>
                  <Button type="primary">Normale</Button>
                  <Button type="default">Haute</Button>
                </Input.Group>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SendOutlined />}
                  block
                >
                  Envoyer le message
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Support Tickets */}
          <Card title="Mes tickets de support">
            <List
              dataSource={supportTickets}
              renderItem={ticket => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div className="flex justify-between items-center">
                        <Text strong>{ticket.id}</Text>
                        <div className="space-x-1">
                          <Tag color={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Tag>
                          <Tag color={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Tag>
                        </div>
                      </div>
                    }
                    description={
                      <div>
                        <Text>{ticket.subject}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          Créé le {ticket.created}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Bug Report Modal */}
      <Modal
        title="Signaler un bug"
        open={ticketModalVisible}
        onCancel={() => setTicketModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTicketModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary">
            Créer le ticket
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Type de problème" required>
            <Input placeholder="Ex: Erreur de calcul, Interface qui ne répond pas..." />
          </Form.Item>
          
          <Form.Item label="Description détaillée" required>
            <TextArea 
              rows={4} 
              placeholder="Décrivez le problème, les étapes pour le reproduire, et le comportement attendu"
            />
          </Form.Item>
          
          <Form.Item label="Navigateur et version">
            <Input placeholder="Ex: Chrome 120, Firefox 121..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HelpSupportPage;