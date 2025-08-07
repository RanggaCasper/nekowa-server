class MessageService {
    constructor(sessionService) {
        this.sessionService = sessionService;
    }

    async sendTextMessage(sessionId, number, message) {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { text: message });
    }

    async sendImageMessage(sessionId, number, imageUrl, caption = '') {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { 
            image: { url: imageUrl },
            caption 
        });
    }

    async sendDocumentMessage(sessionId, number, documentUrl, fileName, mimetype) {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { 
            document: { url: documentUrl },
            fileName: fileName || 'document',
            mimetype: mimetype || 'application/octet-stream'
        });
    }

    async sendAudioMessage(sessionId, number, audioUrl, ptt = false) {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { 
            audio: { url: audioUrl },
            ptt
        });
    }

    async sendVideoMessage(sessionId, number, videoUrl, caption = '') {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { 
            video: { url: videoUrl },
            caption
        });
    }

    async sendLocationMessage(sessionId, number, latitude, longitude, name = '', address = '') {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const jid = this.formatJid(number);
        return await session.sendMessage(jid, { 
            location: {
                degreesLatitude: parseFloat(latitude),
                degreesLongitude: parseFloat(longitude),
                name,
                address
            }
        });
    }

    async broadcastMessage(sessionId, numbers, message, delay = 1000) {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const results = [];
        
        for (let i = 0; i < numbers.length; i++) {
            try {
                const number = numbers[i];
                const jid = this.formatJid(number);
                
                await session.sendMessage(jid, { text: message });
                results.push({ number, status: 'sent', error: null });
                
                if (i < numbers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                results.push({ 
                    number: numbers[i], 
                    status: 'failed', 
                    error: error.message 
                });
            }
        }
        
        return {
            total: numbers.length,
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length,
            results
        };
    }

    async checkNumber(sessionId, number) {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (!session.isConnected) {
            throw new Error('Session not connected');
        }
        
        const contact = await session.getContactInfo(number);
        return {
            exists: contact.length > 0,
            contact: contact[0] || null
        };
    }

    formatJid(number) {
        return number.includes('@') ? number : `${number}@s.whatsapp.net`;
    }
}

module.exports = MessageService;
