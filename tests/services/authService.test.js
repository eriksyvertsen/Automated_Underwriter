const { ObjectId } = require('mongodb');
const authService = require('../../services/authService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database functions
jest.mock('../../config/db', () => {
  return {
    getCollection: jest.fn(async () => {
      const mockUsersCollection = {
        findOne: jest.fn(async (query) => {
          if (query.email === 'existing@example.com') {
            return {
              _id: new ObjectId('60d21b4667d0d8992e610c85'),
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
          return { insertedId: new ObjectId('60d21b4667d0d8992e610c86') };
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

  // More tests...
});
