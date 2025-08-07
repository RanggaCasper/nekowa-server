const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WhatsAppSession = require('../models/WhatsappSession');
const botMiddleware = require('../middleware/botMiddleware');

class SessionService {
    constructor() {
        this.sessions = new Map();
        this.initializeBotMiddleware();
        this.loadExistingSessions();
    }

    initializeBotMiddleware() {
        botMiddleware.init(this);
    }

    async loadExistingSessions() {
        try {
            const sessionsDir = './sessions';
            await fs.mkdir(sessionsDir, { recursive: true });
            const sessionFolders = await fs.readdir(sessionsDir);
            
            for (const folder of sessionFolders) {
                const sessionPath = path.join(sessionsDir, folder);
                const stat = await fs.stat(sessionPath);
                
                if (stat.isDirectory()) {
                    console.log(`Loading existing session: ${folder}`);
                    const session = new WhatsAppSession(folder);
                    
                    // Add bot message handler to existing session
                    session.addMessageHandler('botHandler', async (message, sessionInstance) => {
                        await botMiddleware.handleMessage(folder, message);
                    });
                    
                    this.sessions.set(folder, session);
                    // Only connect if not already connected and has valid auth
                    setTimeout(async () => {
                        if (!session.isConnected && await session.hasValidAuth()) {
                            session.connect();
                        }
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error loading existing sessions:', error);
        }
    }

    createSession(sessionId = null) {
        const id = sessionId || uuidv4();
        if (this.sessions.has(id)) {
            throw new Error('Session already exists');
        }
        
        const session = new WhatsAppSession(id);
        
        // Add bot message handler
        session.addMessageHandler('botHandler', async (message, sessionInstance) => {
            await botMiddleware.handleMessage(id, message);
        });
        
        this.sessions.set(id, session);
        session.connect();
        
        return session;
    }

    // Create session with specific login mode
    createSessionWithMode(sessionId = null, mode = 'qr', phoneNumber = null) {
        const id = sessionId || uuidv4();
        if (this.sessions.has(id)) {
            throw new Error('Session already exists');
        }
        
        const session = new WhatsAppSession(id);
        
        // Add bot message handler
        session.addMessageHandler('botHandler', async (message, sessionInstance) => {
            await botMiddleware.handleMessage(id, message);
        });
        
        this.sessions.set(id, session);
        
        // Connect with specific mode
        session.connectWithMode(mode, phoneNumber);
        
        return session;
    }

    // Request pairing code for existing session
    async requestPairingCode(sessionId, phoneNumber) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.sock) {
            throw new Error('Session not connected. Please connect first.');
        }
        
        return await session.requestPairingCode(phoneNumber);
    }

    // Switch login mode for existing session
    async switchLoginMode(sessionId, mode, phoneNumber = null) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        // Disconnect current session if connected
        if (session.isConnected || session.isConnecting) {
            await session.logout();
        }
        
        // Reconnect with new mode
        await session.connectWithMode(mode, phoneNumber);
        
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    getAllSessions() {
        const sessions = [];
        for (const [id, session] of this.sessions) {
            sessions.push(session.getStatus());
        }
        return sessions;
    }

    getActiveSessionsCount() {
        let activeCount = 0;
        for (const [id, session] of this.sessions) {
            if (session.isConnected) {
                activeCount++;
            }
        }
        return activeCount;
    }

    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.logout();
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    async reconnectSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.forceReconnect();
            return true;
        }
        return false;
    }

    async shutdownAllSessions() {
        for (const [sessionId, session] of this.sessions) {
            try {
                console.log(`Closing session: ${sessionId}`);
                if (session.sock) {
                    await session.sock.end();
                }
            } catch (error) {
                console.error(`Error closing session ${sessionId}:`, error);
            }
        }
    }
}

module.exports = SessionService;
