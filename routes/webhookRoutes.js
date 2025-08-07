const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/WebhookController');

// Webhook routes
router.post('/:sessionId', WebhookController.receiveWebhook);

module.exports = router;