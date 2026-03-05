import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM/ERP System API',
      version: '1.0.0',
      description: 'Comprehensive CRM and ERP system API documentation',
      contact: {
        name: 'API Support',
        email: 'support@crm-system.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.crm-system.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            name: { type: 'string', description: 'User full name' },
            role: { type: 'string', enum: ['admin', 'client'], description: 'User role' },
            isActive: { type: 'boolean', description: 'Whether the user is active' },
            createdAt: { type: 'string', format: 'date-time', description: 'Account creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last update date' }
          }
        },
        
        // Client schemas
        Client: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Client ID' },
            userId: { type: 'string', description: 'Associated user ID' },
            company: { type: 'string', description: 'Company name' },
            contactName: { type: 'string', description: 'Primary contact name' },
            email: { type: 'string', format: 'email', description: 'Contact email' },
            phone: { type: 'string', description: 'Contact phone' },
            address: { type: 'string', description: 'Company address' },
            industry: { type: 'string', description: 'Industry type' },
            status: { type: 'string', enum: ['active', 'inactive', 'prospect'], description: 'Client status' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Invoice schemas
        Invoice: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Invoice ID' },
            clientId: { type: 'string', description: 'Client ID' },
            invoiceNumber: { type: 'string', description: 'Unique invoice number' },
            amount: { type: 'number', description: 'Invoice amount' },
            currency: { type: 'string', description: 'Currency code' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], description: 'Invoice status' },
            dueDate: { type: 'string', format: 'date', description: 'Due date' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  total: { type: 'number' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Payment schemas
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Payment ID' },
            invoiceId: { type: 'string', description: 'Associated invoice ID' },
            clientId: { type: 'string', description: 'Client ID' },
            amount: { type: 'number', description: 'Payment amount' },
            currency: { type: 'string', description: 'Currency code' },
            method: { type: 'string', enum: ['stripe', 'bank_transfer', 'cash', 'check'], description: 'Payment method' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'], description: 'Payment status' },
            reference: { type: 'string', description: 'Payment reference number' },
            paidAt: { type: 'string', format: 'date-time', description: 'Payment date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Appointment schemas
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Appointment ID' },
            clientId: { type: 'string', description: 'Client ID' },
            adminId: { type: 'string', description: 'Admin user ID' },
            title: { type: 'string', description: 'Appointment title' },
            description: { type: 'string', description: 'Appointment description' },
            date: { type: 'string', format: 'date', description: 'Appointment date' },
            time: { type: 'string', description: 'Appointment time' },
            duration: { type: 'number', description: 'Duration in minutes' },
            status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], description: 'Appointment status' },
            location: { type: 'string', description: 'Meeting location' },
            notes: { type: 'string', description: 'Additional notes' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Integration schemas
        Integration: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Integration ID' },
            name: { type: 'string', description: 'Integration name' },
            type: { type: 'string', enum: ['payment', 'communication', 'analytics', 'storage'], description: 'Integration type' },
            status: { type: 'string', enum: ['active', 'inactive', 'error'], description: 'Integration status' },
            config: { type: 'object', description: 'Integration configuration' },
            apiKey: { type: 'string', description: 'API key (masked)' },
            webhookUrl: { type: 'string', description: 'Webhook URL' },
            lastSync: { type: 'string', format: 'date-time', description: 'Last sync date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Error schemas
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', description: 'Error message' },
            error: { type: 'string', description: 'Error type' },
            details: { type: 'object', description: 'Additional error details' }
          }
        },

        // Success response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', description: 'Success message' },
            data: { type: 'object', description: 'Response data' }
          }
        },

        // Pagination schemas
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Items per page' },
            total: { type: 'number', description: 'Total number of items' },
            pages: { type: 'number', description: 'Total number of pages' },
            hasNext: { type: 'boolean', description: 'Whether there is a next page' },
            hasPrev: { type: 'boolean', description: 'Whether there is a previous page' }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CRM/ERP API Documentation'
  }));

  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;