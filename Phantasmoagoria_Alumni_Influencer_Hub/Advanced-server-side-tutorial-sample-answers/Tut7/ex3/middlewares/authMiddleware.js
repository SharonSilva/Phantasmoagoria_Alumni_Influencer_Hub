const authModel = require("../models/authModel");

async function authMiddleware(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required"
      });
    }

    const apiKeyDetails = await authModel.getApiKey(apiKey);

    if (!apiKeyDetails) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive API key"
      });
    }
    next();

  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
}

module.exports = authMiddleware;