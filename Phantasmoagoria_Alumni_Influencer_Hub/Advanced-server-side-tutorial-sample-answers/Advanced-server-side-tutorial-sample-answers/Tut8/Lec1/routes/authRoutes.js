const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', async (req, res) => {
    try {
        const userId = await authController.register(req.body);
        res.status(201).json({ userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authController.login(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.userId = user.id;
        req.session.email = user.email;
        res.json({ message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Logout successful' }));
});

router.get('/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: { id: req.session.userId, email: req.session.email },
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
