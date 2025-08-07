const SessionService = require('../services/SessionService');

class SessionController {
    constructor() {
        // Controllers will get sessionService from app.locals
    }

    getAllSessions = (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const sessions = sessionService.getAllSessions();
            
            res.json({
                error: false,
                data: sessions
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    createSession = (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.body;
            
            const session = sessionService.createSession(sessionId);
            
            res.json({
                error: false,
                message: 'Session created successfully',
                data: session.getStatus()
            });
        } catch (error) {
            res.status(400).json({
                error: true,
                message: error.message
            });
        }
    }

    createSessionWithMode = (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId, loginMode, phoneNumber } = req.body;
            
            // Validate required parameters
            if (!sessionId) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId is required'
                });
            }
            
            if (!loginMode || !['qr', 'pairing'].includes(loginMode)) {
                return res.status(400).json({
                    error: true,
                    message: 'loginMode must be either "qr" or "pairing"'
                });
            }
            
            if (loginMode === 'pairing' && !phoneNumber) {
                return res.status(400).json({
                    error: true,
                    message: 'phoneNumber is required for pairing mode'
                });
            }
            
            const session = sessionService.createSessionWithMode(sessionId, loginMode, phoneNumber);
            
            res.json({
                error: false,
                message: `Session created successfully with ${loginMode} mode`,
                data: session.getStatus()
            });
        } catch (error) {
            res.status(400).json({
                error: true,
                message: error.message
            });
        }
    }

    requestPairingCode = async (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            // Get phone number from session if available, otherwise from request body
            const phoneNumber = session.pairingNumber || req.body.phoneNumber;
            if (!phoneNumber) {
                return res.status(400).json({
                    error: true,
                    message: 'phoneNumber is required. Either set it when creating session or provide in request body.'
                });
            }
            
            const pairingCode = await sessionService.requestPairingCode(sessionId, phoneNumber);
            
            res.json({
                error: false,
                message: 'Pairing code generated successfully',
                data: {
                    pairingCode: pairingCode,
                    phoneNumber: phoneNumber
                }
            });
        } catch (error) {
            res.status(400).json({
                error: true,
                message: error.message
            });
        }
    }

    switchLoginMode = (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            const { loginMode, phoneNumber } = req.body;
            
            if (!loginMode || !['qr', 'pairing'].includes(loginMode)) {
                return res.status(400).json({
                    error: true,
                    message: 'loginMode must be either "qr" or "pairing"'
                });
            }
            
            if (loginMode === 'pairing' && !phoneNumber) {
                return res.status(400).json({
                    error: true,
                    message: 'phoneNumber is required for pairing mode'
                });
            }
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            sessionService.switchLoginMode(sessionId, loginMode, phoneNumber);
            
            res.json({
                error: false,
                message: `Login mode switched to ${loginMode}`,
                data: session.getStatus()
            });
        } catch (error) {
            res.status(400).json({
                error: true,
                message: error.message
            });
        }
    }

    deleteSession = async (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            
            const success = await sessionService.deleteSession(sessionId);
            
            if (success) {
                res.json({
                    error: false,
                    message: 'Session deleted successfully'
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    logoutSession = async (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            await session.logout();
            res.json({
                error: false,
                message: 'Session logged out successfully'
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    refreshSession = async (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            session.connect();
            
            res.json({
                error: false,
                message: 'Session refresh initiated'
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    getSessionStatus = (req, res) => {
        try {
            const sessionService = req.app.locals.sessionService;
            const { sessionId } = req.params;
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            res.json({
                error: false,
                data: session.getStatus()
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    getSessionChats = (req, res) => {
        try {
            res.json({
                error: false,
                data: [],
                message: 'Chat history not available in this version'
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }

    getSessionContacts = (req, res) => {
        try {
            res.json({
                error: false,
                data: {},
                message: 'Contact store not available in this version'
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }
}

module.exports = new SessionController();
