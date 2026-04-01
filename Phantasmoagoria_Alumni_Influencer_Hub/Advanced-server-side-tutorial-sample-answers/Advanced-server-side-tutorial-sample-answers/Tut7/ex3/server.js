const express = require('express');
const courseRoutes = require('./routes/courseRoute');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

app.use(express.json());
app.use('/api/courses', authMiddleware, courseRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});