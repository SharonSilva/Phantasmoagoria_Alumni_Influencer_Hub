const express = require('express');
const app = express();

const studentRoutes = require('./routes/studentRoutes');
const authMiddleware = require('./middleware/authMiddleware');

app.use(express.json());

// // Apply API key middleware globally
app.use(authMiddleware);

// Routes
app.use('/api/students', studentRoutes);

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});