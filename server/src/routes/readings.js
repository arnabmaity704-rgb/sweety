const { Router } = require('express');
const readingService = require('../services/readingService');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

// GET /api/readings?page=1&limit=20&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  res.json(await readingService.listReadings(req.user.id, req.query));
});

router.post('/', async (req, res) => {
  res.status(201).json(await readingService.createReading(req.user.id, req.body));
});

router.get('/:id', async (req, res) => {
  res.json(await readingService.getReading(req.user.id, req.params.id));
});

router.put('/:id', async (req, res) => {
  res.json(await readingService.updateReading(req.user.id, req.params.id, req.body));
});

router.delete('/:id', async (req, res) => {
  await readingService.deleteReading(req.user.id, req.params.id);
  res.status(204).end();
});

module.exports = router;
