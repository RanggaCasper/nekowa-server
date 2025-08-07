const express = require('express');
const router = express.Router();
const SessionController = require('../controllers/SessionController');

// Session management routes
router.get('/', SessionController.getAllSessions);
router.post('/', SessionController.createSession);
router.post('/create-with-mode', SessionController.createSessionWithMode);
router.delete('/:sessionId', SessionController.deleteSession);
router.post('/:sessionId/logout', SessionController.logoutSession);
router.post('/:sessionId/refresh', SessionController.refreshSession);
router.get('/:sessionId/status', SessionController.getSessionStatus);
router.get('/:sessionId/chats', SessionController.getSessionChats);
router.get('/:sessionId/contacts', SessionController.getSessionContacts);

// Pairing code routes
router.post('/:sessionId/request-pairing', SessionController.requestPairingCode);
router.post('/:sessionId/switch-mode', SessionController.switchLoginMode);

module.exports = router;
