const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollection } = require('../config/db');

class AuthService {
  constructor() {
    this.usersCollection = null;
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      this.usersCollection = await getCollection('users');
      this.initialized = true;
      console.log('AuthService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing AuthService:', error);
      return false;
    }
  }

  // Helper method to ensure the service is initialized before operations
  async ensureInitialized() {
    if (!this.initialized) {
      // Wait for the initial initialization to complete
      await this.initPromise;

      // If still not initialized, try again
      if (!this.initialized) {
        console.log('Attempting to re-initialize AuthService...');
        await this.init();
      }

      if (!this.initialized) {
        throw new Error('AuthService could not be initialized');
      }
    }

    return this.usersCollection;
  }

  async registerUser(userData) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Check if the user already exists
      const existingUser = await collection.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create new user
      const newUser = {
        email: userData.email,
        passwordHash: hashedPassword,
        name: userData.name,
        createdAt: new Date(),
        lastLogin: null,
        usageCount: 0,
        preferences: {
          theme: 'light',
          defaultTemplate: 'standard'
        }
      };

      // Insert the user into the database
      await collection.insertOne(newUser);

      // Return the user without the password
      const { passwordHash, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async loginUser(email, password) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Find the user
      const user = await collection.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify the password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login and usage count
      await collection.updateOne(
        { _id: user._id },
        { 
          $set: { lastLogin: new Date() },
          $inc: { usageCount: 1 }
        }
      );

      // Generate JWT token
      const token = this.generateToken(user);

      // Return the user without the password and the token
      const { passwordHash, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  generateToken(user) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'user' // Simplified role for MVP
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_jwt_secret'
      );
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  async getUserById(userId) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      const user = await collection.findOne({ _id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Return the user without the password
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();