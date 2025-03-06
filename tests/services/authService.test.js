// tests/services/authService.test.js
const authService = require('../../services/authService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database functions properly
jest.mock('../../config/db', () => {
  return {
    getCollection: jest.fn(async () => {
      const mockUsersCollection = {
        findOne: jest.fn(async (query) => {
          if (query.email === 'existing@example.com') {
            return {
              _id: '60d21b4667d0d8992e610c85', // Use string instead of ObjectId
              email: 'existing@example.com',
              passwordHash: 'hashed-password',
              name: 'Existing User',
              createdAt: new Date(),
              lastLogin: null,
              usageCount: 0
            };
          }
          return null;
        }),
        insertOne: jest.fn(async (user) => {
          return { insertedId: '60d21b4667d0d8992e610c86' }; // String ID
        }),
        updateOne: jest.fn(async (query, update) => {
          return { matchedCount: 1, modifiedCount: 1 };
        })
      };
      return mockUsersCollection;
    })
  };
});

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

      const user = await authService.registerUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe('new@example.com');
      expect(user.name).toBe('New User');
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should throw an error if the user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('loginUser', () => {
    it('should log in a user with valid credentials', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      const result = await authService.loginUser(email, password);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('existing@example.com');
    });

    it('should throw an error with invalid credentials', async () => {
      bcrypt.compare.mockResolvedValueOnce(false);

      const email = 'existing@example.com';
      const password = 'wrong-password';

      await expect(authService.loginUser(email, password)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw an error if the user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      await expect(authService.loginUser(email, password)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const user = {
        _id: '60d21b4667d0d8992e610c85',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = authService.generateToken(user);

      expect(token).toBeDefined();
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: user._id.toString(),
          email: user.email,
          role: 'user'
        },
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = 'valid-token';
      const decoded = { userId: 'test-user-id' };

      jwt.verify.mockReturnValueOnce(decoded);

      const result = authService.verifyToken(token);

      expect(result).toEqual(decoded);
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        expect.any(String)
      );
    });

    it('should throw an error for invalid token', () => {
      const token = 'invalid-token';

      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken(token)).toThrow('Invalid token');
    });
  });
});