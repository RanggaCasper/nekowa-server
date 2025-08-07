const BotService = require('../services/BotService');

class BotMiddleware {
    constructor() {
        this.botService = null;
    }

    // Initialize bot service
    init(sessionService) {
        this.botService = new BotService(sessionService);
    }

    // Handle incoming messages
    async handleMessage(sessionId, message) {
        try {
            if (!this.botService) {
                console.log('BotService not initialized');
                return;
            }

            // Skip if message is from bot itself
            if (message.key.fromMe) return;

            // Log incoming message
            const messageText = message.message?.conversation || 
                               message.message?.extendedTextMessage?.text || '';
            
            if (messageText) {
                const isGroup = message.key.remoteJid.endsWith('@g.us');
                const chatType = isGroup ? 'group' : 'private';
                console.log(`📩 Message from ${message.key.remoteJid} (${chatType}): ${messageText}`);
                
                // Process message (commands or private AI chat)
                const processed = await this.botService.processMessage(sessionId, message);
                if (processed) {
                    console.log(`✅ ${chatType} message processed: ${messageText.substring(0, 50)}...`);
                }
            }

        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    // Handle group events
    async handleGroupEvent(sessionId, event) {
        try {
            if (!this.botService) return;

            // Handle group participant updates using BotService
            await this.botService.handleGroupUpdate(sessionId, event.id, event.participants, event.action);

        } catch (error) {
            console.error('Error handling group event:', error);
        }
    }

    // Handle group update (called from WhatsAppSession)
    async handleGroupUpdate(sessionId, groupJid, participants, action) {
        try {
            if (!this.botService) return;

            await this.botService.handleGroupUpdate(sessionId, groupJid, participants, action);

        } catch (error) {
            console.error('Error handling group update:', error);
        }
    }

    // Get bot service instance
    getBotService() {
        return this.botService;
    }
}

module.exports = new BotMiddleware();
