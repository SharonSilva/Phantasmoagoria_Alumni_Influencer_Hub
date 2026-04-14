/**
 * Response Handler Middleware
 * Standardizes all API responses
 */

const setupResponseHandlers = (req, res, next) => {
  /**
   * Success response
   * Usage: res.success({ id: 1 }, 201)
   */
  res.success = (data, statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Error response
   * Usage: res.error('User not found', 404)
   */
  res.error = (message, statusCode = 400) => {
    res.status(statusCode).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Paginated response
   * Usage: res.paginated(data, { page: 1, total: 100 })
   */
  res.paginated = (data, pagination, statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Message response (with no data)
   * Usage: res.message('User created successfully', 201)
   */
  res.message = (message, statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  };

  next();
};

module.exports = setupResponseHandlers;