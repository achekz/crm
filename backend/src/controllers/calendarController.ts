import { Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';
import User from '../models/User';

// Google Calendar API setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback'
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Get Google Calendar authorization URL
export const getAuthUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access calendar', 403));
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    sendSuccessResponse(res, { authUrl }, 'Authorization URL generated successfully');
  } catch (error) {
    next(error);
  }
};

// Handle Google Calendar callback
export const handleCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;

    if (!code) {
      return next(new AppError('Authorization code not provided', 400));
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in user document
    await User.findByIdAndUpdate(req.user!.id, {
      googleCalendarTokens: tokens
    });

    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/invoices?calendar=success`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/invoices?calendar=error`);
  }
};

// Check if user is authorized with Google Calendar
export const checkAuthStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access calendar', 403));
    }

    const user = await User.findById(req.user.id);
    const authorized = !!(user?.googleCalendarTokens?.access_token);

    sendSuccessResponse(res, { authorized }, 'Auth status checked successfully');
  } catch (error) {
    next(error);
  }
};

// Add invoice to Google Calendar
export const addInvoiceToCalendar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access calendar', 403));
    }

    const { invoice } = req.body;
    const { number, clientName, dueDate, total, description } = invoice;

    // Get user's Google Calendar tokens
    const user = await User.findById(req.user.id);
    if (!user?.googleCalendarTokens?.access_token) {
      return next(new AppError('Google Calendar not authorized. Please authorize first.', 401));
    }

    // Set credentials
    oauth2Client.setCredentials(user.googleCalendarTokens);

    // Create calendar event
    const event = {
      summary: `Échéance Facture ${number} - ${clientName}`,
      description: `Facture ${number} pour ${clientName}
Montant: ${total.toLocaleString()} TND
${description ? `Description: ${description}` : ''}

Système CRM - CMT`,
      start: {
        dateTime: new Date(dueDate).toISOString(),
        timeZone: 'Africa/Tunis',
      },
      end: {
        dateTime: new Date(new Date(dueDate).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        timeZone: 'Africa/Tunis',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      colorId: '4', // Red color for due dates
    };

    // Insert event into calendar
    const calendarEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    sendSuccessResponse(res, { 
      eventId: calendarEvent.data.id,
      eventUrl: calendarEvent.data.htmlLink 
    }, 'Invoice added to Google Calendar successfully');
  } catch (error) {
    console.error('Google Calendar add invoice error:', error);
    next(error);
  }
};

// Revoke Google Calendar access
export const revokeAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access calendar', 403));
    }

    // Remove tokens from user document
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { googleCalendarTokens: 1 }
    });

    sendSuccessResponse(res, null, 'Google Calendar access revoked successfully');
  } catch (error) {
    next(error);
  }
}; 