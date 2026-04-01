const API_KEY = "12345";

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      message: "API key is missing"
    });
  }


  if (apiKey !== API_KEY) {
    return res.status(403).json({
      message: "Invalid API key"
    });
  }


  next();
}

module.exports = authMiddleware;