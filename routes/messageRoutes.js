const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');

// Message sending routes
router.post('/send-message', MessageController.sendTextMessage);
router.post('/send-image', MessageController.sendImage);
router.post('/send-document', MessageController.sendDocument);
router.post('/send-audio', MessageController.sendAudio);
router.post('/send-video', MessageController.sendVideo);
router.post('/send-location', MessageController.sendLocation);
router.post('/broadcast', MessageController.broadcast);

// Utility routes
router.get('/check-number/:sessionId/:number', MessageController.checkNumber);

module.exports = router;
