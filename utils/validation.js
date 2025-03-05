// Validation utility for request validation
const { ApiError } = require('./errorHandler');

// Simple validation function for request bodies
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      if (!schema) {
        return next();
      }

      const { error, value } = schema.validate(req.body);

      if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return next(ApiError.badRequest(errorMessage));
      }

      // Replace request body with validated and sanitized data
      req.body = value;
      next();
    } catch (error) {
      next(ApiError.badRequest('Validation error'));
    }
  };
};

// Create a validation schema factory
// Since we don't have Joi installed (based on package.json), we'll create a simple validation schema
const createSchema = (schema) => {
  return {
    validate: (data) => {
      const errors = [];
      const validated = { ...data };

      // Check required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (data[field] === undefined || data[field] === null || data[field] === '') {
            errors.push({ message: `${field} is required` });
          }
        }
      }

      // Check field types and format
      if (schema.fields) {
        for (const [field, rules] of Object.entries(schema.fields)) {
          if (data[field] !== undefined && data[field] !== null) {
            // Check type
            if (rules.type && typeof data[field] !== rules.type) {
              errors.push({ message: `${field} must be a ${rules.type}` });
            }

            // Check min length for strings
            if (rules.type === 'string' && rules.minLength && data[field].length < rules.minLength) {
              errors.push({ message: `${field} must be at least ${rules.minLength} characters` });
            }

            // Check max length for strings
            if (rules.type === 'string' && rules.maxLength && data[field].length > rules.maxLength) {
              errors.push({ message: `${field} must be at most ${rules.maxLength} characters` });
            }

            // Check pattern for strings
            if (rules.type === 'string' && rules.pattern && !rules.pattern.test(data[field])) {
              errors.push({ message: `${field} format is invalid` });
            }

            // Apply transform function if available
            if (rules.transform) {
              validated[field] = rules.transform(data[field]);
            }
          }
        }
      }

      return {
        error: errors.length > 0 ? { details: errors } : null,
        value: validated
      };
    }
  };
};

// Define validation schemas
const validationSchemas = {
  report: {
    create: () => createSchema({
      required: ['name'],
      fields: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        },
        description: {
          type: 'string',
          maxLength: 1000
        },
        industry: {
          type: 'string',
          maxLength: 100
        },
        foundingYear: {
          type: 'number',
          transform: (value) => typeof value === 'string' ? parseInt(value, 10) : value
        },
        headquarters: {
          type: 'string',
          maxLength: 200
        },
        employeeCount: {
          type: 'number',
          transform: (value) => typeof value === 'string' ? parseInt(value, 10) : value
        },
        templateType: {
          type: 'string',
          maxLength: 50
        }
      }
    })
  },
  auth: {
    register: () => createSchema({
      required: ['email', 'password', 'name'],
      fields: {
        email: {
          type: 'string',
          maxLength: 100,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 100
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        }
      }
    }),
    login: () => createSchema({
      required: ['email', 'password'],
      fields: {
        email: {
          type: 'string',
          maxLength: 100,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        }
      }
    })
  }
};

module.exports = {
  validateBody,
  validationSchemas
};