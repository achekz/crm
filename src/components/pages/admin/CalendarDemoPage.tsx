import React, { useState } from 'react';
import { Card, Typography, Space, Button, DatePicker, Input, InputNumber, Divider, message } from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import GoogleCalendarIntegration from '../../common/GoogleCalendarIntegration';
import * as simpleGoogleCalendarService from '../../../services/simpleGoogleCalendarService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const CalendarDemoPage: React.FC = () => {
  const [demoInvoice, setDemoInvoice] = useState({
    number: 'FAC-2024-001',
    clientName: 'Client Demo',
    dueDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    total: 1500,
    description: 'Services de consultation'
  });

  const [customInvoice, setCustomInvoice] = useState({
    number: '',
    clientName: '',
    dueDate: '',
    total: 0,
    description: ''
  });

  const handleOpenGoogleCalendar = () => {
    simpleGoogleCalendarService.openGoogleCalendar();
    message.success('Google Calendar ouvert dans un nouvel onglet');
  };

  const handleTestCalendar = () => {
    simpleGoogleCalendarService.openGoogleCalendarWithEvent(demoInvoice);
    message.success('Google Calendar ouvert avec les détails de la facture de démonstration');
  };

  const handleCustomCalendar = () => {
    if (!customInvoice.number || !customInvoice.clientName || !customInvoice.dueDate) {
      message.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    simpleGoogleCalendarService.openGoogleCalendarWithEvent(customInvoice);
    message.success('Google Calendar ouvert avec vos détails personnalisés');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <CalendarOutlined /> Intégration Google Calendar
      </Title>
      
      <Paragraph>
        Cette page démontre l'intégration simple avec Google Calendar sans nécessiter d'API keys ou de configuration complexe.
        L'utilisateur doit simplement être connecté à son compte Google.
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Demo Section */}
        <Card title="🎯 Démonstration" size="large">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Facture de démonstration:</Text>
              <ul>
                <li>Numéro: {demoInvoice.number}</li>
                <li>Client: {demoInvoice.clientName}</li>
                <li>Date d'échéance: {new Date(demoInvoice.dueDate).toLocaleDateString('fr-FR')}</li>
                <li>Montant: {demoInvoice.total.toLocaleString()} TND</li>
                <li>Description: {demoInvoice.description}</li>
              </ul>
            </div>
            
            <GoogleCalendarIntegration 
              invoiceData={demoInvoice}
              size="large"
            />
            
            <Divider />
            
            <Space>
              <Button 
                type="default" 
                icon={<CalendarOutlined />}
                onClick={handleOpenGoogleCalendar}
              >
                Ouvrir Google Calendar
              </Button>
              
              <Button 
                type="primary" 
                icon={<CalendarOutlined />}
                onClick={handleTestCalendar}
              >
                Tester avec la facture de démo
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Custom Invoice Section */}
        <Card title="✏️ Créer votre propre facture" size="large">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Input
                placeholder="Numéro de facture"
                value={customInvoice.number}
                onChange={(e) => setCustomInvoice(prev => ({ ...prev, number: e.target.value }))}
                style={{ width: 200 }}
              />
              
              <Input
                placeholder="Nom du client"
                value={customInvoice.clientName}
                onChange={(e) => setCustomInvoice(prev => ({ ...prev, clientName: e.target.value }))}
                style={{ width: 200 }}
              />
              
              <DatePicker
                placeholder="Date d'échéance"
                value={customInvoice.dueDate ? dayjs(customInvoice.dueDate) : null}
                onChange={(date) => setCustomInvoice(prev => ({ 
                  ...prev, 
                  dueDate: date ? date.format('YYYY-MM-DD') : '' 
                }))}
              />
              
              <InputNumber
                placeholder="Montant"
                value={customInvoice.total}
                onChange={(value) => setCustomInvoice(prev => ({ ...prev, total: value || 0 }))}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                style={{ width: 150 }}
              />
            </Space>
            
            <Input.TextArea
              placeholder="Description (optionnel)"
              value={customInvoice.description}
              onChange={(e) => setCustomInvoice(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCustomCalendar}
              disabled={!customInvoice.number || !customInvoice.clientName || !customInvoice.dueDate}
            >
              Créer et ajouter au calendrier
            </Button>
          </Space>
        </Card>

        {/* Features Section */}
        <Card title="🚀 Fonctionnalités disponibles" size="large">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong>✅ Ajout direct au calendrier:</Text>
              <Paragraph>
                Ouvre Google Calendar dans un nouvel onglet avec tous les détails de la facture pré-remplis.
              </Paragraph>
            </div>
            
            <div>
              <Text strong>📥 Téléchargement de fichier .ics:</Text>
              <Paragraph>
                Télécharge un fichier .ics que vous pouvez importer dans n'importe quel calendrier (Google, Outlook, Apple, etc.).
              </Paragraph>
            </div>
            
            <div>
              <Text strong>📧 Envoi par email:</Text>
              <Paragraph>
                Ouvre Gmail avec un email pré-rempli contenant les détails de la facture.
              </Paragraph>
            </div>
            
            <div>
              <Text strong>🔐 Aucune configuration requise:</Text>
              <Paragraph>
                Fonctionne avec votre compte Google existant, pas besoin d'API keys ou de configuration complexe.
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* Instructions Section */}
        <Card title="📋 Instructions d'utilisation" size="large">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong>1. Connexion Google:</Text>
              <Paragraph>
                Assurez-vous d'être connecté à votre compte Google dans votre navigateur.
              </Paragraph>
            </div>
            
            <div>
              <Text strong>2. Ajout au calendrier:</Text>
              <Paragraph>
                Cliquez sur "Ajouter au Calendrier" pour ouvrir Google Calendar avec les détails de la facture.
              </Paragraph>
            </div>
            
            <div>
              <Text strong>3. Import de fichier:</Text>
              <Paragraph>
                Téléchargez le fichier .ics et importez-le dans votre calendrier préféré.
              </Paragraph>
            </div>
            
            <div>
              <Text strong>4. Notifications:</Text>
              <Paragraph>
                Les événements incluent des rappels automatiques (1 jour et 1 heure avant l'échéance).
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default CalendarDemoPage; 