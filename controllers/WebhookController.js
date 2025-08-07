class WebhookController {
    receiveWebhook = (req, res) => {
        try {
            const { sessionId } = req.params;
            const sessionService = req.app.locals.sessionService;
            
            const session = sessionService.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: true,
                    message: 'Session not found'
                });
            }
            
            // Here you can add webhook logic to forward messages to external services
            console.log(`Webhook received for session ${sessionId}:`, req.body);
            
            res.json({
                error: false,
                message: 'Webhook received'
            });
        } catch (error) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }
}

module.exports = new WebhookController();
