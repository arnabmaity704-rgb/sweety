const { Router } = require('express');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/register', async (req, res) => {
  res.status(201).json(await authService.register(req.body));
});

router.post('/login', async (req, res) => {
  res.json(await authService.login(req.body));
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
