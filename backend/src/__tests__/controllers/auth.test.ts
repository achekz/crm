import request from 'supertest';
import { app } from '../test-utils/testApp';
import User from '../../models/User';

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'client',
        nature: 'personne_morale',
        gerants: [{ email: 'gerant@example.com', phone: '12345678' }]
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);

      // Verify user was created in database
      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).toBeDefined();
      expect(savedUser?.name).toBe(userData.name);
    });

    it('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User',
        nature: 'personne_morale',
        gerants: [{ email: 'gerant@example.com', phone: '12345678' }]
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should not register user with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        nature: 'personne_morale',
        gerants: [{ email: 'gerant@example.com', phone: '12345678' }]
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should not register duplicate user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        nature: 'personne_morale',
        gerants: [{ email: 'gerant@example.com', phone: '12345678' }]
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Email already in use');
    });

    it('should default role to client if not provided', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        nature: 'personne_morale',
        gerants: [{ email: 'gerant@example.com', phone: '12345678' }]
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.role).toBe('client');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'client',
        isActive: true
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Incorrect email or password');
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Incorrect email or password');
    });

    it('should not login inactive user', async () => {
      // Create inactive user
      const inactiveUser = new User({
        email: 'inactive@example.com',
        password: 'password123',
        name: 'Inactive User',
        role: 'client',
        status: 'inactive'
      });
      await inactiveUser.save();

      const loginData = {
        email: 'inactive@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Account is not active');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'client',
        isActive: true
      });
      await user.save();
      userId = user._id.toString();
      authToken = (global as any).createAuthToken(userId, 'client');
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.name).toBe('Test User');
    });

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not logged in');
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Authentication failed');
    });
  });

  describe('PATCH /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'client',
        isActive: true
      });
      await user.save();
      authToken = (global as any).createAuthToken(user._id.toString(), 'client');
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should not update profile without token', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(updateData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not logged in');
    });

    it('should not update with invalid email', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Validation error');
    });
  });

  describe('PATCH /api/auth/avatar', () => {
    let authToken: string;

    beforeEach(async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'client',
        isActive: true
      });
      await user.save();
      authToken = (global as any).createAuthToken(user._id.toString(), 'client');
    });

    it('should update user avatar', async () => {
      const avatarData = {
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
      };

      const response = await request(app)
        .patch('/api/auth/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avatarData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Avatar updated successfully');
      expect(response.body.data.avatar).toBeDefined();
    });

    it('should not update avatar without token', async () => {
      const avatarData = {
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
      };

      const response = await request(app)
        .patch('/api/auth/avatar')
        .send(avatarData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not logged in');
    });
  });

  describe('GET /api/auth/client-users', () => {
    let adminToken: string;
    let clientToken: string;

    beforeEach(async () => {
      // Create admin user
      const admin = new User({
        email: 'admin@example.com',
        password: 'Password123!',
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });
      await admin.save();
      adminToken = (global as any).createAuthToken(admin._id.toString(), 'admin');

      // Create client user
      const client = new User({
        email: 'client@example.com',
        password: 'password123',
        name: 'Client User',
        role: 'client',
        isActive: true
      });
      await client.save();
      clientToken = (global as any).createAuthToken(client._id.toString(), 'client');
    });

    it('should get client users for admin', async () => {
      const response = await request(app)
        .get('/api/auth/client-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should not allow client to get client users', async () => {
      const response = await request(app)
        .get('/api/auth/client-users')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('permission');
    });

    it('should not allow access without token', async () => {
      const response = await request(app)
        .get('/api/auth/client-users')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not logged in');
    });
  });
});
