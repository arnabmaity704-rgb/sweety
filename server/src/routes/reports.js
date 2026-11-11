const { Router } = require('express');
const reportService = require('../services/reportService');
const { requireAuth } = require('../middleware/auth');
const { todayString } = require('../utils/dates');

const router = Router();
router.use(requireAuth);

// GET /api/reports?date=YYYY-MM-DD  (defaults to today)
router.get('/', async (req, res) => {
  const date = req.query.date || todayString();
  res.json(await reportService.getReports(req.user.id, date));
});

module.exports = router;
