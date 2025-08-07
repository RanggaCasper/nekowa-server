const MessageService = require('../services/MessageService');

class MessageController {
    constructor() {
        // MessageService will be initialized with sessionService
    }

    getMessageService(req) {
        const sessionService = req.app.locals.sessionService;
        return new MessageService(sessionService);
    }

    sendTextMessage = async (req, res) => {
        try {
            const { sessionId, number, message } = req.body;
            
            if (!sessionId || !number || !message) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, and message are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendTextMessage(sessionId, number, message);
            
            res.json({
                error: false,
                message: 'Message sent successfully',
                data: { sessionId, number, message }
            });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send message: ' + error.message
            });
        }
    }

    sendImage = async (req, res) => {
        try {
            const { sessionId, number, imageUrl, caption } = req.body;
            
            if (!sessionId || !number || !imageUrl) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, and imageUrl are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendImageMessage(sessionId, number, imageUrl, caption);
            
            res.json({
                error: false,
                message: 'Image sent successfully',
                data: { sessionId, number, imageUrl, caption }
            });
        } catch (error) {
            console.error('Error sending image:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send image: ' + error.message
            });
        }
    }

    sendDocument = async (req, res) => {
        try {
            const { sessionId, number, documentUrl, fileName, mimetype } = req.body;
            
            if (!sessionId || !number || !documentUrl) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, and documentUrl are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendDocumentMessage(sessionId, number, documentUrl, fileName, mimetype);
            
            res.json({
                error: false,
                message: 'Document sent successfully',
                data: { sessionId, number, documentUrl, fileName }
            });
        } catch (error) {
            console.error('Error sending document:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send document: ' + error.message
            });
        }
    }

    sendAudio = async (req, res) => {
        try {
            const { sessionId, number, audioUrl, ptt } = req.body;
            
            if (!sessionId || !number || !audioUrl) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, and audioUrl are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendAudioMessage(sessionId, number, audioUrl, ptt);
            
            res.json({
                error: false,
                message: 'Audio sent successfully',
                data: { sessionId, number, audioUrl, ptt }
            });
        } catch (error) {
            console.error('Error sending audio:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send audio: ' + error.message
            });
        }
    }

    sendVideo = async (req, res) => {
        try {
            const { sessionId, number, videoUrl, caption } = req.body;
            
            if (!sessionId || !number || !videoUrl) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, and videoUrl are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendVideoMessage(sessionId, number, videoUrl, caption);
            
            res.json({
                error: false,
                message: 'Video sent successfully',
                data: { sessionId, number, videoUrl, caption }
            });
        } catch (error) {
            console.error('Error sending video:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send video: ' + error.message
            });
        }
    }

    sendLocation = async (req, res) => {
        try {
            const { sessionId, number, latitude, longitude, name, address } = req.body;
            
            if (!sessionId || !number || !latitude || !longitude) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, number, latitude, and longitude are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            await messageService.sendLocationMessage(sessionId, number, latitude, longitude, name, address);
            
            res.json({
                error: false,
                message: 'Location sent successfully',
                data: { sessionId, number, latitude, longitude, name, address }
            });
        } catch (error) {
            console.error('Error sending location:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send location: ' + error.message
            });
        }
    }

    broadcast = async (req, res) => {
        try {
            const { sessionId, numbers, message, delay } = req.body;
            
            if (!sessionId || !numbers || !Array.isArray(numbers) || !message) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, numbers (array), and message are required'
                });
            }
            
            const messageService = this.getMessageService(req);
            const results = await messageService.broadcastMessage(sessionId, numbers, message, delay);
            
            res.json({
                error: false,
                message: 'Broadcast completed',
                data: results
            });
        } catch (error) {
            console.error('Error broadcasting message:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to broadcast message: ' + error.message
            });
        }
    }

    checkNumber = async (req, res) => {
        try {
            const { sessionId, number } = req.params;
            
            const messageService = this.getMessageService(req);
            const result = await messageService.checkNumber(sessionId, number);
            
            res.json({
                error: false,
                data: result
            });
        } catch (error) {
            console.error('Error checking number:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to check number: ' + error.message
            });
        }
    }
}

module.exports = new MessageController();
