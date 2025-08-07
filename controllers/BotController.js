const botMiddleware = require('../middleware/botMiddleware');

class BotController {
    constructor() {
        this.botService = null;
    }

    getBotService(req) {
        return botMiddleware.getBotService();
    }

    // Manual tag all members
    tagAllMembers = async (req, res) => {
        try {
            const { sessionId, groupJid, message } = req.body;
            
            if (!sessionId || !groupJid) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId and groupJid are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const result = await botService.tagAllMembers(sessionId, groupJid, message);
            
            res.json({
                error: false,
                message: 'Tag all members executed successfully',
                data: result
            });

        } catch (error) {
            console.error('Error in tagAllMembers:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to tag all members: ' + error.message
            });
        }
    }

    // Get group members list
    getGroupMembers = async (req, res) => {
        try {
            const { sessionId, groupJid } = req.params;
            
            if (!sessionId || !groupJid) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId and groupJid are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const members = await botService.getGroupMembers(sessionId, groupJid);
            
            res.json({
                error: false,
                message: 'Group members retrieved successfully',
                data: members
            });

        } catch (error) {
            console.error('Error getting group members:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to get group members: ' + error.message
            });
        }
    }

    // Get bot help
    getBotHelp = async (req, res) => {
        try {
            const { sessionId, jid } = req.body;
            
            if (!sessionId || !jid) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId and jid are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            await botService.handleHelp(sessionId, jid);
            
            res.json({
                error: false,
                message: 'Help message sent successfully'
            });

        } catch (error) {
            console.error('Error sending help:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to send help: ' + error.message
            });
        }
    }

    // Get bot status
    getBotStatus = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            res.json({
                error: false,
                message: 'Bot status retrieved successfully',
                data: {
                    status: 'active',
                    prefixes: botService.prefixes,
                    commands: [
                        'tagall',
                        'members', 
                        'help'
                    ]
                }
            });

        } catch (error) {
            console.error('Error getting bot status:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to get bot status: ' + error.message
            });
        }
    }

    // Update bot settings
    updateBotSettings = async (req, res) => {
        try {
            const { prefixes, adminNumbers } = req.body;
            
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            if (prefixes && Array.isArray(prefixes)) {
                botService.prefixes = prefixes;
            }

            if (adminNumbers && Array.isArray(adminNumbers)) {
                botService.adminNumbers = adminNumbers;
            }

            res.json({
                error: false,
                message: 'Bot settings updated successfully',
                data: {
                    prefixes: botService.prefixes,
                    adminNumbers: botService.adminNumbers
                }
            });

        } catch (error) {
            console.error('Error updating bot settings:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to update bot settings: ' + error.message
            });
        }
    }

    // Create sticker from image URL
    createSticker = async (req, res) => {
        try {
            const { sessionId, jid, imageUrl } = req.body;
            
            if (!sessionId || !jid || !imageUrl) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, jid, and imageUrl are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            // Download image and create sticker
            const imageBuffer = await botService.mediaUtils.downloadImage(imageUrl);
            const stickerBuffer = await botService.mediaUtils.imageToSticker(imageBuffer);

            const sessionService = req.app.locals.sessionService;
            const session = sessionService.getSession(sessionId);
            
            if (!session || !session.isConnected || !session.sock) {
                return res.status(400).json({
                    error: true,
                    message: 'Session not connected'
                });
            }

            await session.sock.sendMessage(jid, {
                sticker: stickerBuffer
            });

            res.json({
                error: false,
                message: 'Sticker sent successfully'
            });

        } catch (error) {
            console.error('Error creating sticker:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to create sticker: ' + error.message
            });
        }
    }

    // Ask AI
    askAI = async (req, res) => {
        try {
            const { sessionId, jid, question } = req.body;
            
            if (!sessionId || !jid || !question) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, jid, and question are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            if (!botService.aiService.isValidQuestion(question)) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid question format'
                });
            }

            const cleanQuestion = botService.aiService.prepareQuestion(question);
            const answer = await botService.aiService.askAI(cleanQuestion);
            const formattedResponse = botService.aiService.formatAIResponse(cleanQuestion, answer);

            await botService.sendReply(sessionId, jid, formattedResponse);

            res.json({
                error: false,
                message: 'AI response sent successfully',
                data: {
                    question: cleanQuestion,
                    answer: answer
                }
            });

        } catch (error) {
            console.error('Error asking AI:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to get AI response: ' + error.message
            });
        }
    }

    // Download image
    downloadImage = async (req, res) => {
        try {
            const { sessionId, jid, query } = req.body;
            
            if (!sessionId || !jid || !query) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, jid, and query are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const result = await botService.downloadService.downloadImage('', query);
            
            if (result.success) {
                const sessionService = req.app.locals.sessionService;
                const session = sessionService.getSession(sessionId);
                
                if (!session || !session.isConnected || !session.sock) {
                    return res.status(400).json({
                        error: true,
                        message: 'Session not connected'
                    });
                }

                await session.sock.sendMessage(jid, {
                    image: result.buffer,
                    caption: `🖼️ *Hasil pencarian: ${query}*\n\n📁 Size: ${botService.downloadService.formatFileSize(result.size)}`
                });

                res.json({
                    error: false,
                    message: 'Image sent successfully',
                    data: {
                        query: query,
                        size: result.size
                    }
                });
            }

        } catch (error) {
            console.error('Error downloading image:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to download image: ' + error.message
            });
        }
    }

    // Download YouTube audio
    downloadAudio = async (req, res) => {
        try {
            const { sessionId, jid, url } = req.body;
            
            if (!sessionId || !jid || !url) {
                return res.status(400).json({
                    error: true,
                    message: 'sessionId, jid, and url are required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            if (!botService.downloadService.isYouTubeUrl(url)) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid YouTube URL'
                });
            }

            const result = await botService.downloadService.downloadYouTubeAudio(url);
            
            if (result.success) {
                const sessionService = req.app.locals.sessionService;
                const session = sessionService.getSession(sessionId);
                
                if (!session || !session.isConnected || !session.sock) {
                    return res.status(400).json({
                        error: true,
                        message: 'Session not connected'
                    });
                }

                await session.sock.sendMessage(jid, {
                    audio: result.buffer,
                    mimetype: 'audio/mp4',
                    caption: `🎵 *${result.title}*\n\n⏱️ Duration: ${result.duration}\n📁 Size: ${botService.downloadService.formatFileSize(result.size)}`
                });

                res.json({
                    error: false,
                    message: 'Audio sent successfully',
                    data: {
                        title: result.title,
                        duration: result.duration,
                        size: result.size
                    }
                });
            }

        } catch (error) {
            console.error('Error downloading audio:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to download audio: ' + error.message
            });
        }
    }

    // Get available AI models
    getAIModels = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const models = botService.aiService.getAvailableModels();
            const currentModel = botService.aiService.getCurrentModel();

            res.json({
                error: false,
                message: 'AI models retrieved successfully',
                data: {
                    currentModel,
                    availableModels: models
                }
            });

        } catch (error) {
            console.error('Error getting AI models:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to get AI models: ' + error.message
            });
        }
    }

    // Set AI model
    setAIModel = async (req, res) => {
        try {
            const { modelName } = req.body;
            
            if (!modelName) {
                return res.status(400).json({
                    error: true,
                    message: 'modelName is required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            try {
                botService.aiService.setModel(modelName);
                const currentModel = botService.aiService.getCurrentModel();

                res.json({
                    error: false,
                    message: 'AI model set successfully',
                    data: {
                        previousModel: req.body.previousModel || 'unknown',
                        currentModel
                    }
                });

            } catch (modelError) {
                const availableModels = botService.aiService.getAvailableModels()
                    .map(m => m.name);

                return res.status(400).json({
                    error: true,
                    message: modelError.message,
                    data: {
                        availableModels
                    }
                });
            }

        } catch (error) {
            console.error('Error setting AI model:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to set AI model: ' + error.message
            });
        }
    }

    // Get AI service statistics
    getAIStats = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const stats = botService.aiService.getModelStats();
            const currentModel = botService.aiService.getCurrentModel();

            res.json({
                error: false,
                message: 'AI statistics retrieved successfully',
                data: {
                    ...stats,
                    modelDetails: currentModel
                }
            });

        } catch (error) {
            console.error('Error getting AI stats:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to get AI stats: ' + error.message
            });
        }
    }

    // Advanced AI ask with model selection
    askAIAdvanced = async (req, res) => {
        try {
            const { question, modelName, sessionId, groupJid, options = {} } = req.body;
            
            if (!question) {
                return res.status(400).json({
                    error: true,
                    message: 'question is required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            if (!botService.aiService.isValidQuestion(question)) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid question format'
                });
            }

            const cleanQuestion = botService.aiService.prepareQuestion(question);
            const answer = await botService.aiService.askAI(cleanQuestion, modelName, options);
            const formattedResponse = botService.aiService.formatAIResponse(cleanQuestion, answer, modelName);

            // Count tokens
            const tokenCount = await botService.aiService.countTokens(cleanQuestion + answer, modelName);

            // Send to WhatsApp if sessionId and groupJid provided
            if (sessionId && groupJid) {
                await botService.sendReply(sessionId, groupJid, formattedResponse);
            }

            res.json({
                error: false,
                message: 'AI question processed successfully',
                data: {
                    question: cleanQuestion,
                    answer,
                    formattedResponse,
                    modelUsed: modelName || botService.aiService.getCurrentModel().name,
                    tokensUsed: tokenCount,
                    sentToWhatsApp: !!(sessionId && groupJid)
                }
            });

        } catch (error) {
            console.error('Error in advanced AI ask:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to process AI question: ' + error.message
            });
        }
    }

    // Stream AI response
    streamAI = async (req, res) => {
        try {
            const { question, modelName, options = {} } = req.body;
            
            if (!question) {
                return res.status(400).json({
                    error: true,
                    message: 'question is required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            // Set up SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });

            const cleanQuestion = botService.aiService.prepareQuestion(question);
            
            // Stream response
            const streamOptions = {
                ...options,
                onChunk: (chunk, fullResponse) => {
                    res.write(`data: ${JSON.stringify({ 
                        type: 'chunk', 
                        content: chunk,
                        fullResponse: fullResponse.substring(0, 100) + '...'
                    })}\n\n`);
                }
            };

            const fullResponse = await botService.aiService.streamAI(cleanQuestion, modelName, streamOptions);
            
            // Send final response
            res.write(`data: ${JSON.stringify({ 
                type: 'complete', 
                content: fullResponse,
                modelUsed: modelName || botService.aiService.getCurrentModel().name
            })}\n\n`);
            
            res.end();

        } catch (error) {
            console.error('Error streaming AI:', error);
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: error.message 
            })}\n\n`);
            res.end();
        }
    }

    // Validate API key
    validateAPIKey = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const validation = await botService.aiService.validateAPIKey();

            res.json({
                error: false,
                message: 'API key validation completed',
                data: validation
            });

        } catch (error) {
            console.error('Error validating API key:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to validate API key: ' + error.message
            });
        }
    }

    // Analyze image with AI
    analyzeImage = async (req, res) => {
        try {
            const { imageData, prompt, modelName, sessionId, groupJid } = req.body;
            
            if (!imageData) {
                return res.status(400).json({
                    error: true,
                    message: 'imageData is required (base64 encoded)'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const analysisPrompt = prompt || "Describe this image in detail";
            const model = modelName || 'gemini-pro-vision';
            
            const analysis = await botService.aiService.analyzeImage(imageData, analysisPrompt, model);
            const formattedResponse = `🖼️ *Image Analysis*\n🔧 *Model:* ${model}\n\n📝 *Prompt:* ${analysisPrompt}\n\n🔍 *Analysis:*\n${analysis}`;

            // Send to WhatsApp if sessionId and groupJid provided
            if (sessionId && groupJid) {
                await botService.sendReply(sessionId, groupJid, formattedResponse);
            }

            res.json({
                error: false,
                message: 'Image analyzed successfully',
                data: {
                    prompt: analysisPrompt,
                    analysis,
                    formattedResponse,
                    modelUsed: model,
                    sentToWhatsApp: !!(sessionId && groupJid)
                }
            });

        } catch (error) {
            console.error('Error analyzing image:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to analyze image: ' + error.message
            });
        }
    }

    // Count tokens
    countTokens = async (req, res) => {
        try {
            const { text, modelName } = req.body;
            
            if (!text) {
                return res.status(400).json({
                    error: true,
                    message: 'text is required'
                });
            }

            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const tokenCount = await botService.aiService.countTokens(text, modelName);

            res.json({
                error: false,
                message: 'Tokens counted successfully',
                data: {
                    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    textLength: text.length,
                    modelUsed: modelName || botService.aiService.getCurrentModel().name,
                    ...tokenCount
                }
            });

        } catch (error) {
            console.error('Error counting tokens:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to count tokens: ' + error.message
            });
        }
    }

    // Test AI connection
    testAIConnection = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const testResults = await botService.aiService.testConnection();

            res.json({
                error: false,
                message: 'AI connection test completed',
                data: testResults
            });

        } catch (error) {
            console.error('Error testing AI connection:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to test AI connection: ' + error.message
            });
        }
    }

    // Quick AI test
    quickAITest = async (req, res) => {
        try {
            const botService = this.getBotService(req);
            if (!botService) {
                return res.status(500).json({
                    error: true,
                    message: 'Bot service not available'
                });
            }

            const testResult = await botService.aiService.quickTest();

            res.json({
                error: false,
                message: 'Quick AI test completed',
                data: testResult
            });

        } catch (error) {
            console.error('Error in quick AI test:', error);
            res.status(500).json({
                error: true,
                message: 'Failed to perform quick AI test: ' + error.message
            });
        }
    }
}

module.exports = BotController;
