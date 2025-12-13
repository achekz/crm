import React, { useState, useEffect } from 'react';
import { Button, Space, message, Tooltip, Alert } from 'antd';
import { CalendarOutlined, DownloadOutlined, MailOutlined } from '@ant-design/icons';
import * as simpleGoogleCalendarService from '../../services/simpleGoogleCalendarService';

interface GoogleCalendarIntegrationProps {
  invoiceData: {
    number: string;
    clientName: string;
    dueDate: string;
    total: number;
    description?: string;
  };
  showDownload?: boolean;
  showEmail?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  invoiceData,
  showDownload = true,
  showEmail = true,
  size = 'middle'
}) => {
  const [isGoogleAvailable, setIsGoogleAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    checkGoogleAvailability();
  }, []);

  const checkGoogleAvailability = async () => {
    try {
      const available = await simpleGoogleCalendarService.checkGoogleLoginStatus();
      setIsGoogleAvailable(available);
    } catch (error) {
      console.log('Google availability check failed:', error);
      setIsGoogleAvailable(false);
    }
  };

  const handleOpenCalendar = () => {
    try {
      setLoading(true);
      simpleGoogleCalendarService.openGoogleCalendarWithEvent(invoiceData);
      message.success('Google Calendar ouvert avec les détails de la facture');
    } catch (error) {
      console.error('Calendar error:', error);
      message.error('Erreur lors de l\'ouverture de Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = () => {
    try {
      simpleGoogleCalendarService.downloadGoogleCalendarFile(invoiceData);
      message.success('Fichier calendrier téléchargé');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Erreur lors du téléchargement');
    }
  };

  const handleSendEmail = () => {
    try {
      simpleGoogleCalendarService.sendCalendarEventViaEmail(invoiceData);
      message.success('Gmail ouvert avec les détails de la facture');
    } catch (error) {
      console.error('Email error:', error);
      message.error('Erreur lors de l\'ouverture de Gmail');
    }
  };

  return (
    <div>
      {!isGoogleAvailable && (
        <Alert
          message="Google Calendar"
          description="Connectez-vous à votre compte Google pour utiliser les fonctionnalités de calendrier."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Space>
        <Tooltip title="Ouvrir Google Calendar avec les détails de la facture">
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={handleOpenCalendar}
            loading={loading}
            size={size}
          >
            Ajouter au Calendrier
          </Button>
        </Tooltip>

        {showDownload && (
          <Tooltip title="Télécharger le fichier .ics pour importer dans votre calendrier">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadFile}
              size={size}
            >
              Télécharger .ics
            </Button>
          </Tooltip>
        )}

        {showEmail && (
          <Tooltip title="Envoyer un email avec les détails de la facture">
            <Button
              icon={<MailOutlined />}
              onClick={handleSendEmail}
              size={size}
            >
              Envoyer par Email
            </Button>
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default GoogleCalendarIntegration; 