// tests/middleware/auth.test.js
const { authenticate, authorize } = require('../../middleware/auth');
const authService = require('../../services/authService');

jest.mock('../../services/authService');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {}, user: null };
    res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate a valid token', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = { userId: 'test-123', email: 'test@example.com' };
      authService.verifyToken.mockReturnValue(mockUser);

      // Execute
      await authenticate(req, res, next);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      // Execute
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('No token provided')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', async () => {
      // Setup
      req.headers.authorization = 'InvalidFormat';

      // Execute
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('No token provided')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', async () => {
      // Setup
      req.headers.authorization = 'Bearer invalid-token';
      authService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute
      await authenticate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Invalid token')
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should authorize if user has required role', async () => {
      // Setup
      req.user = { role: 'admin' };
      const middleware = authorize(['admin', 'superuser']);

      // Execute
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      // Setup
      req.user = null;
      const middleware = authorize(['admin']);

      // Execute
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('not authenticated')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', async () => {
      // Setup
      req.user = { role: 'user' };
      const middleware = authorize(['admin']);

      // Execute
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Insufficient permissions')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access if no roles are required', async () => {
      // Setup
      req.user = { role: 'user' };
      const middleware = authorize([]);

      // Execute
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});