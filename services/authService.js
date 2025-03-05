const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollection } = require('../config/db');

class AuthService {
  constructor() {
    this.usersCollection = null;
    this.init();
  }

  async init() {
    try {
      this.usersCollection = await getCollection('users');
    } catch (error) {
      console.error('Error initializing AuthService:', error);
    }
  }

  async registerUser(userData) {
    try {
      if (!this.usersCollection) {
        await this.init();
      }

      // Check if the user already exists
      const existingUser = await this.usersCollection.findOne({ email: userData.email });
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
      await this.usersCollection.insertOne(newUser);

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
      if (!this.usersCollection) {
        await this.init();
      }

      // Find the user
      const user = await this.usersCollection.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify the password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login and usage count
      await this.usersCollection.updateOne(
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
      if (!this.usersCollection) {
        await this.init();
      }

      const user = await this.usersCollection.findOne({ _id: userId });
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