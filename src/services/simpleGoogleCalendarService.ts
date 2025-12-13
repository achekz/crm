/**
 * Simple Google Calendar Integration
 * Uses browser-based methods to interact with Google Calendar
 * No API keys or OAuth2 setup required - just user's Google account
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
}

/**
 * Open Google Calendar with pre-filled event data
 * This opens Google Calendar in a new tab with the event details
 */
export const openGoogleCalendarWithEvent = (eventData: {
  number: string;
  clientName: string;
  dueDate: string;
  total: number;
  description?: string;
}) => {
  const { number, clientName, dueDate, total, description } = eventData;
  
  // Format dates for Google Calendar URL
  const startDate = new Date(dueDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // Create Google Calendar URL with event details
  const eventTitle = encodeURIComponent(`Échéance Facture ${number} - ${clientName}`);
  const eventDescription = encodeURIComponent(
    `Facture ${number} pour ${clientName}\n` +
    `Montant: ${total.toLocaleString()} TND\n` +
    `${description ? `Description: ${description}\n` : ''}` +
    `\nSystème CRM - CMT`
  );
  const eventLocation = encodeURIComponent('CRM System');
  
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDescription}&location=${eventLocation}&dates=${formatDate(startDate)}/${formatDate(endDate)}&sf=true&output=xml`;
  
  // Open Google Calendar in new tab
  window.open(googleCalendarUrl, '_blank');
  
  return googleCalendarUrl;
};

/**
 * Generate iCal/ICS file for Google Calendar import
 */
export const generateGoogleCalendarFile = (eventData: {
  number: string;
  clientName: string;
  dueDate: string;
  total: number;
  description?: string;
}) => {
  const { number, clientName, dueDate, total, description } = eventData;
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startDate = new Date(dueDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CMT CRM//Invoice Due Dates//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:invoice-${number}-${Date.now()}@cmt-crm.com`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Échéance Facture ${number} - ${clientName}`,
    `DESCRIPTION:Facture ${number} pour ${clientName}\\nMontant: ${total.toLocaleString()} TND\\n${description ? `Description: ${description}` : ''}\\n\\nSystème CRM - CMT`,
    'CATEGORIES:Factures,Échéances',
    'PRIORITY:1',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel: Échéance facture demain',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel: Échéance facture dans 1 heure',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
};

/**
 * Download iCal file for Google Calendar import
 */
export const downloadGoogleCalendarFile = (eventData: {
  number: string;
  clientName: string;
  dueDate: string;
  total: number;
  description?: string;
}) => {
  const icsContent = generateGoogleCalendarFile(eventData);
  
  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `facture-${eventData.number}-${eventData.clientName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Send calendar event via email (Gmail integration)
 */
export const sendCalendarEventViaEmail = (eventData: {
  number: string;
  clientName: string;
  dueDate: string;
  total: number;
  description?: string;
  email?: string;
}) => {
  const { number, clientName, dueDate, total, description, email } = eventData;
  
  const subject = encodeURIComponent(`Échéance Facture ${number} - ${clientName}`);
  const body = encodeURIComponent(
    `Bonjour,\n\n` +
    `Rappel: La facture ${number} pour ${clientName} arrive à échéance le ${new Date(dueDate).toLocaleDateString('fr-FR')}.\n\n` +
    `Montant: ${total.toLocaleString()} TND\n` +
    `${description ? `Description: ${description}\n` : ''}` +
    `\nCordialement,\nSystème CRM - CMT`
  );
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email || ''}&su=${subject}&body=${body}`;
  
  window.open(gmailUrl, '_blank');
};

/**
 * Check if user is logged into Google
 */
export const checkGoogleLoginStatus = async (): Promise<boolean> => {
  try {
    // Try to access Google Calendar to check login status
    const response = await fetch('https://calendar.google.com/calendar/u/0/r', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    
    // If we can access Google Calendar, user is likely logged in
    return true;
  } catch (error) {
    console.log('Google login status check failed:', error);
    return false;
  }
};

/**
 * Get Google Calendar URL for the current date
 */
export const getGoogleCalendarUrl = (date?: Date): string => {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const day = targetDate.getDate().toString().padStart(2, '0');
  
  return `https://calendar.google.com/calendar/u/0/r/day/${year}/${month}/${day}`;
};

/**
 * Open Google Calendar in new tab
 */
export const openGoogleCalendar = (date?: Date) => {
  const calendarUrl = getGoogleCalendarUrl(date);
  window.open(calendarUrl, '_blank');
}; 