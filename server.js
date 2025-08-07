require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const sessionRoutes = require('./routes/sessionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import services
const SessionService = require('./services/SessionService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Initialize session service
const sessionService = new SessionService();
app.locals.sessionService = sessionService;

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api', messageRoutes);
app.use('/webhook', webhookRoutes);

// Main UI route
app.get('/', require('./controllers/UIController').renderMainUI);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Gateway Multi-Device running on port ${PORT}`);
    console.log(`📱 Web Interface: http://localhost:${PORT}`);    
    console.log('🔄 Loading existing sessions...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await sessionService.shutdownAllSessions();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});