// Best Practice BotService.js - Clean Architecture
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const MediaUtils = require('../utils/mediaUtils');
const AIService = require('./AIService');
const DownloadService = require('./DownloadService');
const ContentFilter = require('../utils/contentFilter');
const axios = require('axios');

/**
 * WhatsApp Bot Service - Clean Architecture
 * Handles all bot commands and message processing
 * 
 * @class BotService
 * @version 1.0.0
 */
class BotService {
    constructor(sessionService) {
        this.sessionService = sessionService;
        this.initializeConfig();
        this.initializeServices();
        this.initializeStorage();
        this.commands = this.initializeCommands();
    }

    /**
     * Initialize configuration
     */
    initializeConfig() {
        this.config = {
            prefixes: ['.', '!', '/', '#', '$'],
            adminNumbers: ['6283189944777'], // Add admin numbers here
            limits: {
                audioMaxSize: 20 * 1024 * 1024, // 20MB
                imageMaxSize: 5 * 1024 * 1024   // 5MB
            },
            messages: {
                sessionNotConnected: '❌ Session tidak terhubung',
                adminOnly: '❌ Hanya admin yang bisa menggunakan perintah ini!',
                groupOnly: '❌ Perintah ini hanya bisa digunakan di grup!',
                groupAdminOnly: '❌ Hanya admin grup yang bisa menggunakan perintah ini!'
            }
        };
    }

    /**
     * Initialize services
     */
    initializeServices() {
        this.mediaUtils = new MediaUtils();
        this.aiService = new AIService();
        this.downloadService = new DownloadService();
        this.contentFilter = new ContentFilter();
    }

    /**
     * Initialize storage (in production, use database)
     */
    initializeStorage() {
        this.groupSettings = new Map();
        this.userWarnings = new Map();
        this.chatMemory = new Map(); // Store chat history for AI context
    }

    /**
     * Initialize command definitions
     */
    initializeCommands() {
        return {
            // Media Commands
            'sticker': this.createCommand('media', {
                aliases: ['stiker', 's'],
                description: 'Buat sticker dari gambar',
                usage: '(reply ke gambar)',
                handler: 'handleCreateSticker'
            }),
            'toimg': this.createCommand('media', {
                aliases: ['toimage', 'stickertoimg'],
                description: 'Ubah sticker menjadi gambar',
                usage: '(reply ke sticker)',
                handler: 'handleStickerToImage'
            }),


            // Group Commands  
            'tagall': this.createCommand('group', {
                aliases: ['everyone', 'all'],
                description: 'Tag semua member grup',
                usage: '[pesan]',
                handler: 'handleTagAll',
                adminOnly: true,
                groupOnly: true
            }),
            'members': this.createCommand('group', {
                aliases: ['member'],
                description: 'Lihat daftar semua member grup',
                usage: '',
                handler: 'handleMembersList',
                groupOnly: true
            }),

            // AI Commands
            'ai': this.createCommand('utility', {
                aliases: ['ask', 'tanya'],
                description: 'Tanya AI Gemini',
                usage: '[pertanyaan]',
                handler: 'handleAIQuestion'
            }),

            // Download Commands
            'ytdl': this.createCommand('download', {
                aliases: ['youtube', 'yt'],
                description: 'Download video YouTube',
                usage: '[URL YouTube]',
                handler: 'handleYouTubeDownload'
            }),
            'ytmusic': this.createCommand('download', {
                aliases: ['ytmp3', 'ytaudio', 'music'],
                description: 'Download audio YouTube sebagai MP3',
                usage: '[URL YouTube]',
                handler: 'handleYouTubeMusicDownload'
            }),
            'igdl': this.createCommand('download', {
                aliases: ['instagram', 'ig'],
                description: 'Download media Instagram',
                usage: '[URL Instagram]',
                handler: 'handleInstagramDownload'
            }),

            // Text Processing Commands
            'translate': this.createCommand('utility', {
                aliases: ['tr', 'terjemah'],
                description: 'Terjemahkan teks',
                usage: '[bahasa] [teks]',
                handler: 'handleTranslate'
            }),
            'qr': this.createCommand('utility', {
                aliases: ['qrcode'],
                description: 'Buat QR Code dari teks',
                usage: '[teks]',
                handler: 'handleQRCode'
            }),

            // Info Commands
            'ping': this.createCommand('utility', {
                aliases: ['status'],
                description: 'Cek status bot dan latency',
                usage: '',
                handler: 'handlePing'
            }),
            'info': this.createCommand('utility', {
                aliases: ['about'],
                description: 'Informasi tentang bot',
                usage: '',
                handler: 'handleInfo'
            }),

            // Admin Commands
            'broadcast': this.createCommand('admin', {
                aliases: ['bc'],
                description: 'Broadcast pesan ke semua grup',
                usage: '[pesan]',
                handler: 'handleBroadcast',
                adminOnly: true
            }),
            'ban': this.createCommand('admin', {
                aliases: ['kick'],
                description: 'Ban user dari grup',
                usage: '(reply ke user)',
                handler: 'handleBanUser',
                adminOnly: true,
                groupOnly: true
            }),
            'unban': this.createCommand('admin', {
                aliases: ['unkick'],
                description: 'Unban user dari grup',
                usage: '[nomor]',
                handler: 'handleUnbanUser',
                adminOnly: true,
                groupOnly: true
            }),

            // Fun Commands
            'quote': this.createCommand('fun', {
                aliases: ['quotes', 'inspirasi'],
                description: 'Quote inspirasi dari AI',
                usage: '[tema] atau reply pesan',
                handler: 'handleAIQuote'
            }),
            'fact': this.createCommand('fun', {
                aliases: ['facts', 'fakta'],
                description: 'Fakta menarik dari AI',
                usage: '[topik] atau reply pesan',
                handler: 'handleAIFact'
            }),
            'joke': this.createCommand('fun', {
                aliases: ['jokes', 'lucu'],
                description: 'Jokes lucu dari AI',
                usage: '[tema] atau reply pesan',
                handler: 'handleAIJoke'
            }),
            'story': this.createCommand('fun', {
                aliases: ['cerita', 'dongeng'],
                description: 'Cerita pendek dari AI',
                usage: '[tema] atau reply pesan',
                handler: 'handleAIStory'
            }),

            // Utility Commands
            'help': this.createCommand('utility', {
                aliases: ['menu'],
                description: 'Menampilkan menu bantuan',
                usage: '',
                handler: 'handleHelp'
            }),
            'anime': this.createCommand('utility', {
                aliases: ['whatanime', 'trace'],
                description: 'Cari anime dari gambar/screenshot',
                usage: '(reply ke gambar)',
                handler: 'handleAnimeSearch'
            }),
            'whoami': this.createCommand('utility', {
                aliases: ['myinfo'],
                description: 'Cek info dan status admin',
                usage: '',
                handler: 'handleWhoAmI'
            }),
            'groups': this.createCommand('admin', {
                aliases: ['grouplist', 'listgroups'],
                description: 'Lihat daftar grup bot',
                usage: '',
                handler: 'handleGroupsList',
                adminOnly: true
            }),
            'clearmemory': this.createCommand('utility', {
                aliases: ['resetmemory', 'forgetme'],
                description: 'Clear chat memory AI',
                usage: '',
                handler: 'handleClearMemory'
            }),
        };
    }

    /**
     * Create command object with defaults
     */
    createCommand(category, options) {
        return {
            category,
            adminOnly: false,
            groupOnly: false,
            ...options
        };
    }

    // ==================== CORE METHODS ====================

    /**
     * Check if message is a command
     */
    isCommand(message) {
        if (!message || typeof message !== 'string') return false;
        return this.config.prefixes.some(prefix => message.startsWith(prefix));
    }

    /**
     * Parse command from message
     */
    parseCommand(message) {
        if (!this.isCommand(message)) return null;
        
        const prefix = this.config.prefixes.find(p => message.startsWith(p));
        const withoutPrefix = message.slice(prefix.length);
        const [command, ...args] = withoutPrefix.split(' ');
        
        return {
            prefix,
            command: command.toLowerCase(),
            args,
            raw: message
        };
    }

    /**
     * Extract message text
     */
    extractMessageText(message) {
        return message.message?.conversation || 
               message.message?.extendedTextMessage?.text || '';
    }

    /**
     * Get sender JID
     */
    getSenderJid(message) {
        return message.key.participant || message.key.remoteJid;
    }

    /**
     * Check if message is from group
     */
    isGroupMessage(message) {
        return message.key.remoteJid.endsWith('@g.us');
    }

    /**
     * Check if user is admin
     */
    isAdmin(userJid) {
        const userNumber = userJid.split('@')[0];
        
        // Debug logging
        console.log('🔍 Admin Check Debug:');
        console.log('- User JID:', userJid);
        console.log('- User Number:', userNumber);
        console.log('- Admin Numbers:', this.config.adminNumbers);
        console.log('- Is Admin:', this.config.adminNumbers.includes(userNumber));
        
        return this.config.adminNumbers.includes(userNumber);
    }

    /**
     * Get valid session
     */
    getValidSession(sessionId) {
        const session = this.sessionService.getSession(sessionId);
        if (!session?.isConnected || !session.sock) {
            throw new Error(this.config.messages.sessionNotConnected);
        }
        return session;
    }

    // ==================== MESSAGING METHODS ====================

    /**
     * Send reply message
     */
    async sendReply(sessionId, jid, text) {
        try {
            const session = this.getValidSession(sessionId);
            await session.sock.sendMessage(jid, { text });
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    }

    /**
     * Send message with mentions
     */
    async sendMessage(sessionId, jid, messageContent) {
        try {
            const session = this.getValidSession(sessionId);
            await session.sock.sendMessage(jid, messageContent);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    // ==================== COMMAND PROCESSING ====================

    /**
     * Find command by name or alias
     */
    findCommand(commandName) {
        // Direct match
        if (this.commands[commandName]) {
            return { name: commandName, ...this.commands[commandName] };
        }

        // Alias match
        for (const [name, command] of Object.entries(this.commands)) {
            if (command.aliases?.includes(commandName)) {
                return { name, ...command };
            }
        }

        return null;
    }

    /**
     * Validate command permissions
     */
    async validateCommand(command, context) {
        const { message, senderJid, groupJid, sessionId } = context;

        // Check group only
        if (command.groupOnly && !this.isGroupMessage(message)) {
            return { valid: false, error: this.config.messages.groupOnly };
        }

        // Check admin only
        if (command.adminOnly && !this.isAdmin(senderJid)) {
            // For group commands, check group admin
            if (command.groupOnly) {
                const isGroupAdmin = await this.isGroupAdmin(sessionId, groupJid, senderJid);
                if (!isGroupAdmin) {
                    return { valid: false, error: this.config.messages.groupAdminOnly };
                }
            } else {
                return { valid: false, error: this.config.messages.adminOnly };
            }
        }

        return { valid: true };
    }

    /**
     * Main message processor - handles both commands and private AI chat
     */
    async processMessage(sessionId, message) {
        try {
            const messageText = this.extractMessageText(message);
            const isGroup = this.isGroupMessage(message);
            const isCommand = this.isCommand(messageText);
            
            // Content moderation
            if (await this.handleContentModeration(sessionId, message, messageText)) {
                return true;
            }
            
            // Handle private chat - direct AI without prefix
            if (!isGroup && !isCommand && messageText.trim()) {
                return await this.handlePrivateAIChat(sessionId, message, messageText);
            }
            
            // Handle commands (both group and private)
            if (isCommand) {
                return await this.processCommand(sessionId, message);
            }
            
            return false;

        } catch (error) {
            console.error('Error processing message:', error);
            return false;
        }
    }

    /**
     * Handle private AI chat without prefix
     */
    async handlePrivateAIChat(sessionId, message, messageText) {
        try {
            const groupJid = message.key.remoteJid;
            const senderJid = this.getSenderJid(message);
            const userNumber = senderJid.split('@')[0];
            
            // Skip if message is too short or invalid
            if (!this.aiService.isValidQuestion(messageText)) {
                await this.sendReply(sessionId, groupJid, 
                    '💡 *Private AI Chat Aktif*\n\n' +
                    'Silakan ajukan pertanyaan yang lebih jelas!\n\n' +
                    '_Untuk command bot, gunakan prefix seperti .help_'
                );
                return true;
            }

            // Get or create chat memory for this user
            if (!this.chatMemory.has(userNumber)) {
                this.chatMemory.set(userNumber, []);
            }
            
            const userMemory = this.chatMemory.get(userNumber);
            
            // Add current message to memory
            userMemory.push({
                role: 'user',
                content: messageText,
                timestamp: new Date()
            });
            
            // Keep only last 10 messages to prevent memory overload
            if (userMemory.length > 20) {
                userMemory.splice(0, userMemory.length - 20);
            }
            
            // Build context from chat history
            let contextPrompt = messageText;
            if (userMemory.length > 1) {
                const recentHistory = userMemory.slice(-6); // Last 6 messages for context
                const historyContext = recentHistory
                    .filter(msg => msg.role === 'user')
                    .map(msg => `User: ${msg.content}`)
                    .join('\n');
                
                contextPrompt = `Chat History (for context):\n${historyContext}\n\nCurrent Question: ${messageText}\n\nBerikan jawaban yang relevan dengan konteks percakapan sebelumnya jika ada.`;
            }
            
            // Get AI response with context
            const answer = await this.aiService.askAI(contextPrompt);
            
            // Store AI response in memory
            userMemory.push({
                role: 'assistant',
                content: answer,
                timestamp: new Date()
            });
            
            // Send clean AI response (no question, no header)
            await this.sendReply(sessionId, groupJid, answer);
            
            console.log(`Private AI chat processed for ${userNumber}: ${messageText.substring(0, 50)}... (Memory: ${userMemory.length} messages)`);
            return true;

        } catch (error) {
            console.error('Error in private AI chat:', error);
            await this.sendReply(sessionId, message.key.remoteJid, 
                '❌ Maaf, terjadi kesalahan saat memproses pertanyaan Anda.'
            );
            return true;
        }
    }

    /**
     * Main command processor
     */
    async processCommand(sessionId, message) {
        try {
            const messageText = this.extractMessageText(message);
            
            // Content moderation
            if (await this.handleContentModeration(sessionId, message, messageText)) {
                return true;
            }
            
            if (!this.isCommand(messageText)) return false;

            const parsed = this.parseCommand(messageText);
            if (!parsed) return false;

            const command = this.findCommand(parsed.command);
            if (!command) return false;

            const context = {
                sessionId,
                message,
                groupJid: message.key.remoteJid,
                senderJid: this.getSenderJid(message),
                args: parsed.args,
                command: parsed.command
            };

            // Validate permissions
            const validation = await this.validateCommand(command, context);
            if (!validation.valid) {
                await this.sendReply(sessionId, context.groupJid, validation.error);
                return true;
            }

            // Execute command
            await this[command.handler](context);
            return true;

        } catch (error) {
            console.error('Error processing command:', error);
            return false;
        }
    }

    // ==================== COMMAND HANDLERS ====================

    /**
     * Handle create sticker
     */
    async handleCreateSticker(context) {
        try {
            const { sessionId, message, groupJid } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage?.imageMessage) {
                await this.sendReply(sessionId, groupJid, '❌ Reply perintah ini ke gambar yang ingin dijadikan sticker!');
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔄 Sedang membuat sticker...');

            const session = this.getValidSession(sessionId);
            const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer', {});
            const stickerBuffer = await this.mediaUtils.imageToSticker(buffer);

            await session.sock.sendMessage(groupJid, { sticker: stickerBuffer });

        } catch (error) {
            console.error('Error creating sticker:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Gagal membuat sticker. Pastikan gambar valid!');
        }
    }

    /**
     * Handle sticker to image
     */
    async handleStickerToImage(context) {
        try {
            const { sessionId, message, groupJid } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!this.validateStickerMessage(quotedMessage)) {
                await this.sendReply(sessionId, groupJid, '❌ Reply perintah ini ke sticker yang valid!');
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔄 Sedang mengubah sticker menjadi gambar...');

            const session = this.getValidSession(sessionId);
            const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer', {});
            const imageBuffer = await this.mediaUtils.stickerToImage(buffer);
            
            await session.sock.sendMessage(groupJid, {
                image: imageBuffer,
                caption: '✅ Sticker berhasil diubah menjadi gambar!'
            });

        } catch (error) {
            console.error('Error converting sticker to image:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                `❌ Gagal mengubah sticker: ${error.message}`
            );
        }
    }



    /**
     * Handle AI question
     */
    async handleAIQuestion(context) {
        try {
            const { sessionId, groupJid, senderJid, args } = context;
            const question = args.join(' ');
            
            if (!this.aiService.isValidQuestion(question)) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Silakan berikan pertanyaan yang valid!\n\n' +
                    '📝 Format: .ai [pertanyaan]\n' +
                    '💡 Contoh: .ai Apa itu JavaScript?'
                );
                return;
            }

            const answer = await this.aiService.askAI(question);
            const response = this.aiService.formatAIResponse(question, answer);
            
            const senderNumber = senderJid.split('@')[0];
            await this.sendMessage(sessionId, groupJid, {
                text: `@${senderNumber}\n\n${response}`,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error handling AI question:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Terjadi error saat memproses pertanyaan AI.');
        }
    }

    /**
     * Handle tag all
     */
    async handleTagAll(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const customMessage = args.join(' ');
            
            const result = await this.tagAllMembers(sessionId, groupJid, customMessage);
            console.log(`TagAll executed in group ${result.groupName}`);

        } catch (error) {
            console.error('Error in handleTagAll:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Terjadi kesalahan saat melakukan tag all!');
        }
    }

    /**
     * Handle members list
     */
    async handleMembersList(context) {
        try {
            const { sessionId, groupJid } = context;
            const members = await this.getGroupMembers(sessionId, groupJid);
            
            const memberText = this.buildMembersText(members);
            const mentions = members.participants.map(p => p.id);

            await this.sendMessage(sessionId, groupJid, {
                text: memberText,
                mentions: mentions
            });

        } catch (error) {
            console.error('Error in handleMembersList:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Terjadi kesalahan saat mengambil daftar member!');
        }
    }

    /**
     * Handle help command
     */
    async handleHelp(context) {
        const { sessionId, groupJid } = context;
        const helpText = this.buildHelpText();
        await this.sendReply(sessionId, groupJid, helpText);
    }

    /**
     * Handle whoami command
     */
    async handleWhoAmI(context) {
        try {
            const { sessionId, groupJid, senderJid } = context;
            const userNumber = senderJid.split('@')[0];
            const isUserAdmin = this.isAdmin(senderJid);
            
            let responseText = `🔍 *Info User*\n\n`;
            responseText += `📱 *Nomor:* ${userNumber}\n`;
            responseText += `👤 *JID:* ${senderJid}\n`;
            responseText += `👑 *Status Admin:* ${isUserAdmin ? '✅ YA' : '❌ TIDAK'}\n\n`;
            responseText += `🔧 *Admin Numbers:*\n`;
            this.config.adminNumbers.forEach((num, index) => {
                responseText += `${index + 1}. ${num}${num === userNumber ? ' (YOU)' : ''}\n`;
            });
            
            await this.sendReply(sessionId, groupJid, responseText);

        } catch (error) {
            console.error('Error in whoami:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Error checking user info.');
        }
    }

    /**
     * Handle clear memory command
     */
    async handleClearMemory(context) {
        try {
            const { sessionId, groupJid, senderJid } = context;
            const userNumber = senderJid.split('@')[0];
            
            if (this.chatMemory.has(userNumber)) {
                const memoryCount = this.chatMemory.get(userNumber).length;
                this.chatMemory.delete(userNumber);
                
                await this.sendReply(sessionId, groupJid, 
                    `🧠 *Memory Cleared*\n\n` +
                    `✅ ${memoryCount} pesan chat telah dihapus dari memory AI\n` +
                    `🔄 AI akan memulai percakapan baru tanpa konteks sebelumnya`
                );
            } else {
                await this.sendReply(sessionId, groupJid, 
                    '💭 *No Memory Found*\n\n' +
                    '🔍 Tidak ada chat memory yang tersimpan untuk Anda'
                );
            }

        } catch (error) {
            console.error('Error clearing memory:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal menghapus memory.'
            );
        }
    }

    /**
     * Handle groups list command
     */
    async handleGroupsList(context) {
        try {
            const { sessionId, groupJid } = context;
            
            await this.sendReply(sessionId, groupJid, '🔍 Sedang mengambil daftar grup...');

            const session = this.getValidSession(sessionId);
            const groups = await session.sock.groupFetchAllParticipating();
            
            if (Object.keys(groups).length === 0) {
                await this.sendReply(sessionId, groupJid, '❌ Bot tidak ditemukan di grup manapun.');
                return;
            }

            let responseText = `📋 *Daftar Grup Bot*\n\n`;
            responseText += `🔢 *Total:* ${Object.keys(groups).length} grup\n\n`;
            
            Object.entries(groups).forEach(([groupId, groupInfo], index) => {
                const isCurrentGroup = groupId === groupJid;
                responseText += `${index + 1}. ${groupInfo.subject}${isCurrentGroup ? ' *(CURRENT)*' : ''}\n`;
                responseText += `   👥 ${groupInfo.participants?.length || 0} members\n`;
                responseText += `   🆔 ${groupId}\n\n`;
            });
            
            responseText += `💡 *Tip:* Gunakan .bc untuk broadcast ke semua grup`;
            
            await this.sendReply(sessionId, groupJid, responseText);

        } catch (error) {
            console.error('Error getting groups list:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal mengambil daftar grup.'
            );
        }
    }

    /**
     * Handle anime search using trace.moe API
     */
    async handleAnimeSearch(context) {
        try {
            const { sessionId, message, groupJid } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage?.imageMessage) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Reply perintah ini ke gambar anime yang ingin dicari!\n\n' +
                    '📝 Format: .anime (reply ke gambar)\n' +
                    '💡 Contoh: Reply gambar screenshot anime dengan .anime'
                );
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔍 Sedang mencari anime dari gambar...');

            const session = this.getValidSession(sessionId);
            const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer', {});
            
            // Convert buffer to base64 for trace.moe API
            const base64Image = buffer.toString('base64');
            
            const animeResult = await this.searchAnimeByImage(base64Image);
            
            if (animeResult.success) {
                const result = animeResult.data;
                let responseText = `🎌 *Anime Found!*\n\n`;
                responseText += `📺 *Title:* ${result.title}\n`;
                responseText += `🎬 *Episode:* ${result.episode}\n`;
                responseText += `⏰ *Timestamp:* ${result.timestamp}\n`;
                responseText += `🎯 *Similarity:* ${result.similarity}%\n`;
                
                if (result.mal_id) {
                    responseText += `🌐 *MyAnimeList:* https://myanimelist.net/anime/${result.mal_id}\n`;
                }
                
                if (result.year) {
                    responseText += `📅 *Year:* ${result.year}\n`;
                }

                await this.sendReply(sessionId, groupJid, responseText);
                
                // Send preview video if available
                if (result.video && result.similarity > 80) {
                    try {
                        const videoResponse = await axios({
                            method: 'GET',
                            url: result.video,
                            responseType: 'arraybuffer',
                            timeout: 30000
                        });
                        
                        await session.sock.sendMessage(groupJid, {
                            video: Buffer.from(videoResponse.data),
                            caption: `🎬 Preview: ${result.title} - Episode ${result.episode}`,
                            mimetype: 'video/mp4'
                        });
                    } catch (videoError) {
                        console.log('Preview video not available:', videoError.message);
                    }
                }
            } else {
                await this.sendReply(sessionId, groupJid, 
                    `❌ ${animeResult.error || 'Gagal mencari anime. Pastikan gambar adalah screenshot anime yang jelas.'}`
                );
            }

        } catch (error) {
            console.error('Error in anime search:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Terjadi kesalahan saat mencari anime. Coba lagi nanti.'
            );
        }
    }

    /**
     * Handle broadcast message
     */
    async handleBroadcast(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const message = args.join(' ');
            
            if (!message) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan pesan untuk broadcast!\n\n' +
                    '📝 Format: .broadcast [pesan]\n' +
                    '💡 Contoh: .broadcast Halo semua!'
                );
                return;
            }

            await this.sendReply(sessionId, groupJid, '📤 Memulai broadcast...');

            // Show group list first
            try {
                const groups = await session.sock.groupFetchAllParticipating();
                const groupCount = Object.keys(groups).length;
                const targetGroups = Object.keys(groups).filter(gid => gid !== groupJid).length;
                
                await this.sendReply(sessionId, groupJid, 
                    `📊 *Broadcast Info*\n\n` +
                    `🔍 Total grup ditemukan: ${groupCount}\n` +
                    `🎯 Target broadcast: ${targetGroups} grup\n` +
                    `📝 Pesan: "${message}"\n\n` +
                    `⏳ Sedang mengirim...`
                );
            } catch (error) {
                console.log('Could not get group preview:', error.message);
            }

            const session = this.getValidSession(sessionId);
            let sentCount = 0;
            let failedCount = 0;
            
            const broadcastText = `📢 *BROADCAST MESSAGE*\n\n${message}\n\n_Dikirim dari Bot Gateway_`;
            
            try {
                // Method 1: Broadcast to all groups where bot is present
                console.log('🔍 Broadcast Debug:');
                console.log('- Session sock exists:', !!session.sock);
                
                try {
                    // Get all groups where bot is a participant
                    const groups = await session.sock.groupFetchAllParticipating();
                    console.log('- Groups where bot is present:', Object.keys(groups).length);
                    
                    if (Object.keys(groups).length > 0) {
                        console.log('📋 Groups list:');
                        Object.keys(groups).forEach((groupId, index) => {
                            console.log(`${index + 1}. ${groupId} (${groups[groupId].subject})`);
                        });
                        
                        // Send to all groups except current one
                        for (const [groupId, groupInfo] of Object.entries(groups)) {
                            if (groupId !== groupJid) { // Don't send to current group
                                try {
                                    await session.sock.sendMessage(groupId, {
                                        text: broadcastText
                                    });
                                    sentCount++;
                                    console.log(`✅ Broadcast sent to: ${groupInfo.subject} (${groupId})`);
                                    
                                    // Delay untuk mencegah spam
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                } catch (chatError) {
                                    console.error(`❌ Failed to send to ${groupInfo.subject}:`, chatError.message);
                                    failedCount++;
                                }
                            }
                        }
                        
                        if (sentCount === 0) {
                            console.log('📝 Only current group found, sending test broadcast to current group');
                            await this.sendReply(sessionId, groupJid, broadcastText);
                            sentCount = 1;
                        }
                        
                    } else {
                        console.log('❌ No groups found, bot might not be in any groups');
                        await this.sendReply(sessionId, groupJid, 
                            '❌ Bot tidak ditemukan di grup manapun atau tidak memiliki akses ke daftar grup.'
                        );
                        return;
                    }
                    
                } catch (groupError) {
                    console.error('❌ Error fetching groups:', groupError.message);
                    
                    // Fallback: Try alternative method using store
                    console.log('🔄 Trying fallback method with store...');
                    const chats = session.sock.store?.chats || {};
                    const groupChats = Object.keys(chats).filter(jid => 
                        jid.endsWith('@g.us') && jid !== groupJid
                    );
                    
                    console.log('- Store groups found:', groupChats.length);
                    
                    if (groupChats.length > 0) {
                        for (const jid of groupChats) {
                            try {
                                await session.sock.sendMessage(jid, {
                                    text: broadcastText
                                });
                                sentCount++;
                                console.log(`✅ Fallback broadcast sent to: ${jid}`);
                                await new Promise(resolve => setTimeout(resolve, 1500));
                            } catch (chatError) {
                                console.error(`❌ Fallback failed for ${jid}:`, chatError.message);
                                failedCount++;
                            }
                        }
                    } else {
                        console.log('❌ Final fallback: sending to current group only');
                        await this.sendReply(sessionId, groupJid, broadcastText);
                        sentCount = 1;
                    }
                }

                const resultMessage = `✅ *Broadcast Selesai!*\n\n` +
                    `📤 Terkirim: ${sentCount} chat\n` +
                    `❌ Gagal: ${failedCount} chat\n` +
                    `📝 Pesan: "${message}"`;

                await this.sendReply(sessionId, groupJid, resultMessage);

            } catch (error) {
                throw new Error(`Gagal mengirim broadcast: ${error.message}`);
            }

        } catch (error) {
            console.error('Error in broadcast:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                `❌ ${error.message}`
            );
        }
    }

    // ==================== DOWNLOAD HANDLERS ====================

    /**
     * Handle YouTube download
     */
    async handleYouTubeDownload(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const url = args[0];
            
            if (!url || !this.isValidYouTubeURL(url)) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ URL YouTube tidak valid!\n\n' +
                    '📝 Format: .ytdl [URL YouTube]\n' +
                    '💡 Contoh: .ytdl https://youtube.com/watch?v=...'
                );
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔄 Sedang memproses download YouTube...');
            
            const result = await this.downloadService.downloadYouTube(url);
            
            if (result.success) {
                await this.sendReply(sessionId, groupJid, 
                    `✅ *Video berhasil didownload!*\n\n` +
                    `📹 *Judul:* ${result.title}\n` +
                    `⏱️ *Durasi:* ${result.duration}\n` +
                    `👁️ *Views:* ${result.views}\n\n` +
                    `📎 File akan dikirim sebentar lagi...`
                );
                
                // Send video file
                const session = this.getValidSession(sessionId);
                await session.sock.sendMessage(groupJid, {
                    video: result.buffer,
                    caption: `🎬 ${result.title}`,
                    mimetype: 'video/mp4'
                });
            } else {
                throw new Error(result.error || 'Download gagal');
            }

        } catch (error) {
            console.error('Error downloading YouTube:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                `❌ Gagal download YouTube: ${error.message}`
            );
        }
    }

    /**
     * Handle YouTube Music download
     */
    async handleYouTubeMusicDownload(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const url = args[0];
            
            if (!url || !this.isValidYouTubeURL(url)) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ URL YouTube tidak valid!\n\n' +
                    '📝 Format: .ytmusic [URL YouTube]\n' +
                    '💡 Contoh: .ytmusic https://youtube.com/watch?v=...'
                );
                return;
            }

            await this.sendReply(sessionId, groupJid, '🎵 Sedang memproses download audio YouTube...');
            
            const result = await this.downloadService.downloadYouTubeMusic(url);
            
            if (result.success) {
                await this.sendReply(sessionId, groupJid, 
                    `✅ *Audio berhasil didownload!*\n\n` +
                    `🎵 *Judul:* ${result.title}\n` +
                    `⏱️ *Durasi:* ${result.duration}\n` +
                    `👁️ *Views:* ${result.views}\n` +
                    `🎧 *Format:* MP3\n\n` +
                    `📎 File akan dikirim sebentar lagi...`
                );
                
                // Send audio file
                const session = this.getValidSession(sessionId);
                await session.sock.sendMessage(groupJid, {
                    audio: result.buffer,
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    fileName: `${result.title}.mp3`
                });
            } else {
                throw new Error(result.error || 'Download audio gagal');
            }

        } catch (error) {
            console.error('Error downloading YouTube music:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                `❌ Gagal download audio YouTube: ${error.message}`
            );
        }
    }
    async handleInstagramDownload(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const url = args[0];
            
            if (!url || !this.isValidInstagramURL(url)) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ URL Instagram tidak valid!\n\n' +
                    '📝 Format: .igdl [URL Instagram]\n' +
                    '💡 Contoh: .igdl https://instagram.com/p/...'
                );
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔄 Sedang memproses download Instagram...');
            
            const result = await this.downloadService.downloadInstagram(url);
            
            if (result.success) {
                const session = this.getValidSession(sessionId);
                
                if (result.type === 'image') {
                    await session.sock.sendMessage(groupJid, {
                        image: result.buffer,
                        caption: `📸 Instagram: ${result.caption || 'No caption'}`
                    });
                } else if (result.type === 'video') {
                    await session.sock.sendMessage(groupJid, {
                        video: result.buffer,
                        caption: `🎬 Instagram: ${result.caption || 'No caption'}`
                    });
                }
            } else {
                throw new Error(result.error || 'Download gagal');
            }

        } catch (error) {
            console.error('Error downloading Instagram:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                `❌ Gagal download Instagram: ${error.message}`
            );
        }
    }

    // ==================== TEXT PROCESSING HANDLERS ====================

    /**
     * Handle translate text
     */
    async handleTranslate(context) {
        try {
            const { sessionId, groupJid, args } = context;
            
            if (args.length < 2) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Format salah!\n\n' +
                    '📝 Format: .translate [bahasa] [teks]\n' +
                    '💡 Contoh: .translate en Halo dunia\n' +
                    '🌐 Bahasa: en, id, ja, ko, es, fr, de, dll'
                );
                return;
            }

            const targetLang = args[0].toLowerCase();
            const text = args.slice(1).join(' ');

            await this.sendReply(sessionId, groupJid, '🔄 Sedang menerjemahkan...');

            const translation = await this.aiService.translateText(text, targetLang);
            
            await this.sendReply(sessionId, groupJid, 
                `🌐 *Terjemahan*\n\n` +
                `📝 *Teks Asli:*\n${text}\n\n` +
                `🔄 *Hasil (${targetLang.toUpperCase()}):*\n${translation}`
            );

        } catch (error) {
            console.error('Error translating:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal menerjemahkan teks.'
            );
        }
    }

    /**
     * Handle QR Code generation
     */
    async handleQRCode(context) {
        try {
            const { sessionId, groupJid, args } = context;
            const text = args.join(' ');
            
            if (!text || text.length < 1) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan teks untuk QR Code!\n\n' +
                    '📝 Format: .qr [teks]\n' +
                    '💡 Contoh: .qr https://google.com'
                );
                return;
            }

            if (text.length > 500) {
                await this.sendReply(sessionId, groupJid, '❌ Teks terlalu panjang! Maksimal 500 karakter.');
                return;
            }

            await this.sendReply(sessionId, groupJid, '🔄 Sedang membuat QR Code...');

            const qrBuffer = await this.generateQRCode(text);
            
            const session = this.getValidSession(sessionId);
            await session.sock.sendMessage(groupJid, {
                image: qrBuffer,
                caption: `📱 *QR Code Generated*\n\n📝 *Teks:* ${text}`
            });

        } catch (error) {
            console.error('Error generating QR code:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal membuat QR Code.'
            );
        }
    }

    // ==================== INFO HANDLERS ====================

    /**
     * Handle ping command
     */
    async handlePing(context) {
        try {
            const { sessionId, groupJid } = context;
            const startTime = Date.now();
            
            await this.sendReply(sessionId, groupJid, '🏓 Pong!');
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            await this.sendReply(sessionId, groupJid, 
                `🤖 *Bot Status*\n\n` +
                `✅ Status: Online\n` +
                `⚡ Latency: ${latency}ms\n` +
                `🕒 Uptime: ${this.getUptime()}\n` +
                `💾 Memory: ${this.getMemoryUsage()}\n` +
                `📱 Sessions: ${this.sessionService.getActiveSessionsCount()}`
            );

        } catch (error) {
            console.error('Error in ping:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Error checking status.');
        }
    }

    /**
     * Handle info command
     */
    async handleInfo(context) {
        const { sessionId, groupJid } = context;
        
        const infoText = `🤖 *WhatsApp Gateway Bot*\n\n` +
            `📊 *Informasi Bot:*\n` +
            `• Version: 2.0.0\n` +
            `• Node.js: ${process.version}\n` +
            `• Platform: ${process.platform}\n` +
            `• Library: @whiskeysockets/baileys\n\n` +
            `⚡ *Fitur Utama:*\n` +
            `• 🎨 Media Processing (Sticker, Image, Video)\n` +
            `• 🤖 AI Gemini Integration\n` +
            `• 📥 YouTube & Instagram Downloader\n` +
            `• 🌐 Text Translation\n` +
            `• 📱 QR Code Generator\n` +
            `• 👥 Group Management\n` +
            `• 🛡️ Content Moderation\n\n` +
            `💡 Ketik .help untuk melihat semua command`;
            
        await this.sendReply(sessionId, groupJid, infoText);
    }

    // ==================== ADMIN HANDLERS ====================

    /**
     * Handle broadcast message
     */
    async handleBroadcast(context) {
        try {
            const { sessionId, args } = context;
            const message = args.join(' ');
            
            if (!message) {
                await this.sendReply(sessionId, context.groupJid, 
                    '❌ Berikan pesan untuk broadcast!\n\n' +
                    '📝 Format: .broadcast [pesan]'
                );
                return;
            }

            const sessions = this.sessionService.getAllSessions();
            let sentCount = 0;

            for (const session of sessions) {
                try {
                    if (session.isConnected) {
                        await session.sock.sendMessage(session.jid, {
                            text: `📢 *BROADCAST MESSAGE*\n\n${message}`
                        });
                        sentCount++;
                    }
                } catch (error) {
                    console.error(`Failed to send broadcast to ${session.jid}:`, error);
                }
            }

            await this.sendReply(sessionId, context.groupJid, 
                `✅ Broadcast terkirim ke ${sentCount} chat!`
            );

        } catch (error) {
            console.error('Error in broadcast:', error);
            await this.sendReply(context.sessionId, context.groupJid, '❌ Gagal mengirim broadcast.');
        }
    }

    /**
     * Handle ban user
     */
    async handleBanUser(context) {
        try {
            const { sessionId, message, groupJid } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Reply perintah ini ke pesan user yang ingin di-ban!'
                );
                return;
            }

            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            const session = this.getValidSession(sessionId);

            await session.sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove');
            
            await this.sendReply(sessionId, groupJid, 
                `✅ User @${targetJid.split('@')[0]} telah di-ban dari grup!`
            );

        } catch (error) {
            console.error('Error banning user:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal ban user. Pastikan bot adalah admin!'
            );
        }
    }

    /**
     * Handle unban user
     */
    async handleUnbanUser(context) {
        try {
            const { sessionId, groupJid, args } = context;
            
            if (!args[0]) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan nomor yang ingin di-unban!\n\n' +
                    '📝 Format: .unban [nomor]\n' +
                    '💡 Contoh: .unban 628123456789'
                );
                return;
            }

            const phoneNumber = args[0].replace(/[^0-9]/g, '');
            const targetJid = `${phoneNumber}@s.whatsapp.net`;
            
            const session = this.getValidSession(sessionId);
            await session.sock.groupParticipantsUpdate(groupJid, [targetJid], 'add');
            
            await this.sendReply(sessionId, groupJid, 
                `✅ User @${phoneNumber} telah di-unban dan ditambahkan kembali ke grup!`
            );

        } catch (error) {
            console.error('Error unbanning user:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal unban user. Pastikan nomor valid dan bot adalah admin!'
            );
        }
    }

    // ==================== AI FUN HANDLERS ====================

    /**
     * Handle AI quote
     */
    async handleAIQuote(context) {
        try {
            const { sessionId, message, groupJid, args } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Get topic from quoted message or args
            let topic = '';
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                quotedMessage.extendedTextMessage?.text || '';
                topic = quotedText.trim();
            } else {
                topic = args.join(' ');
            }
            
            if (!topic) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan topik untuk quote!\n\n' +
                    '📝 Format: .quote [topik] atau reply pesan\n' +
                    '💡 Contoh: .quote motivasi\n' +
                    '💡 Atau reply pesan dengan topik yang diinginkan'
                );
                return;
            }
            
            await this.sendReply(sessionId, groupJid, '💭 Sedang membuat quote inspiratif...');

            const prompt = `Buatkan 1 quote inspiratif dalam bahasa Indonesia tentang "${topic}". Format: "Quote" - Penulis (jika ada). Buat yang menyentuh hati dan memotivasi. Topik: ${topic}`;
            const quote = await this.aiService.askAI(prompt);
            
            await this.sendReply(sessionId, groupJid, 
                `💬 *Quote Inspiratif*\n\n${quote}\n\n🏷️ *Topik:* ${topic}`
            );

        } catch (error) {
            console.error('Error generating AI quote:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal membuat quote. Coba lagi nanti.'
            );
        }
    }

    /**
     * Handle AI fact
     */
    async handleAIFact(context) {
        try {
            const { sessionId, message, groupJid, args } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Get topic from quoted message or args
            let topic = '';
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                quotedMessage.extendedTextMessage?.text || '';
                topic = quotedText.trim();
            } else {
                topic = args.join(' ');
            }
            
            if (!topic) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan topik untuk fakta!\n\n' +
                    '📝 Format: .fact [topik] atau reply pesan\n' +
                    '💡 Contoh: .fact teknologi\n' +
                    '💡 Atau reply pesan dengan topik yang diinginkan'
                );
                return;
            }
            
            await this.sendReply(sessionId, groupJid, '🤓 Sedang mencari fakta menarik...');

            const prompt = `Berikan 1 fakta menarik dan unik dalam bahasa Indonesia tentang "${topic}". Buat yang mengejutkan dan mudah dipahami. Gunakan emoji yang sesuai. Topik: ${topic}`;
            const fact = await this.aiService.askAI(prompt);
            
            await this.sendReply(sessionId, groupJid, 
                `🤓 *Fakta Menarik*\n\n${fact}\n\n🏷️ *Topik:* ${topic}`
            );

        } catch (error) {
            console.error('Error generating AI fact:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal mencari fakta. Coba lagi nanti.'
            );
        }
    }

    /**
     * Handle AI joke
     */
    async handleAIJoke(context) {
        try {
            const { sessionId, message, groupJid, args } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Get theme from quoted message or args
            let theme = '';
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                quotedMessage.extendedTextMessage?.text || '';
                theme = quotedText.trim();
            } else {
                theme = args.join(' ');
            }
            
            if (!theme) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan tema untuk jokes!\n\n' +
                    '📝 Format: .joke [tema] atau reply pesan\n' +
                    '💡 Contoh: .joke sekolah\n' +
                    '💡 Atau reply pesan dengan tema yang diinginkan'
                );
                return;
            }
            
            await this.sendReply(sessionId, groupJid, '😂 Sedang menyiapkan jokes lucu...');

            const prompt = `Buatkan 1 jokes lucu dalam bahasa Indonesia tentang "${theme}". Buat yang clean, family-friendly, dan menggunakan humor Indonesia. Gunakan emoji yang sesuai. Tema: ${theme}`;
            const joke = await this.aiService.askAI(prompt);
            
            await this.sendReply(sessionId, groupJid, 
                `😂 *Jokes Lucu*\n\n${joke}\n\n🏷️ *Tema:* ${theme}`
            );

        } catch (error) {
            console.error('Error generating AI joke:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal membuat jokes. Coba lagi nanti.'
            );
        }
    }

    /**
     * Handle AI story
     */
    async handleAIStory(context) {
        try {
            const { sessionId, message, groupJid, args } = context;
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Get theme from quoted message or args
            let theme = '';
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                quotedMessage.extendedTextMessage?.text || '';
                theme = quotedText.trim();
            } else {
                theme = args.join(' ');
            }
            
            if (!theme) {
                await this.sendReply(sessionId, groupJid, 
                    '❌ Berikan tema untuk cerita!\n\n' +
                    '📝 Format: .story [tema] atau reply pesan\n' +
                    '💡 Contoh: .story petualangan\n' +
                    '💡 Atau reply pesan dengan tema yang diinginkan'
                );
                return;
            }
            
            await this.sendReply(sessionId, groupJid, '📖 Sedang menulis cerita pendek...');

            const prompt = `Tulis cerita pendek dalam bahasa Indonesia dengan tema "${theme}". Maksimal 200 kata, menarik, dan memiliki pesan moral. Buat yang cocok untuk semua umur. Tema: ${theme}`;
            const story = await this.aiService.askAI(prompt);
            
            await this.sendReply(sessionId, groupJid, 
                `📖 *Cerita Pendek*\n\n${story}\n\n🏷️ *Tema:* ${theme}`
            );

        } catch (error) {
            console.error('Error generating AI story:', error);
            await this.sendReply(context.sessionId, context.groupJid, 
                '❌ Gagal menulis cerita. Coba lagi nanti.'
            );
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Validate sticker message
     */
    validateStickerMessage(quotedMessage) {
        if (!quotedMessage) return false;
        
        return quotedMessage.stickerMessage || 
               (quotedMessage.imageMessage?.mimetype === 'image/webp') ||
               (quotedMessage.documentMessage?.mimetype === 'image/webp');
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Build help text
     */
    buildHelpText() {
        const prefix = this.config.prefixes[0];
        let helpText = '🤖 *Bot Commands Help*\n\n';
        
        // Group commands by category
        const categories = {
            media: '🎨 *Media Commands*',
            group: '👥 *Group Commands*', 
            download: '📥 *Download Commands*',
            utility: '⚙️ *Utility Commands*',
            admin: '👑 *Admin Commands*',
            fun: '🎉 *Fun Commands*'
        };

        Object.entries(categories).forEach(([category, title]) => {
            const categoryCommands = Object.entries(this.commands)
                .filter(([_, cmd]) => cmd.category === category);
            
            if (categoryCommands.length > 0) {
                helpText += `\n${title}\n`;
                categoryCommands.forEach(([name, cmd]) => {
                    helpText += `• ${prefix}${name}`;
                    if (cmd.usage) helpText += ` ${cmd.usage}`;
                    helpText += `\n  ${cmd.description}`;
                    if (cmd.aliases?.length) {
                        helpText += `\n  Alias: ${cmd.aliases.map(a => `${prefix}${a}`).join(', ')}`;
                    }
                    if (cmd.adminOnly) helpText += ' (Admin only)';
                    if (cmd.groupOnly) helpText += ' (Group only)';
                    helpText += '\n\n';
                });
            }
        });
        
        helpText += `📝 *Prefixes:* ${this.config.prefixes.join(', ')}\n`;
        helpText += `💡 *Tip:* Gunakan prefix apapun sesuai keinginan\n`;
        helpText += `📊 *Total Commands:* ${Object.keys(this.commands).length}`;
        
        return helpText;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Validate YouTube URL
     */
    isValidYouTubeURL(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    /**
     * Validate Instagram URL
     */
    isValidInstagramURL(url) {
        const instagramRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/;
        return instagramRegex.test(url);
    }

    /**
     * Generate QR Code
     */
    async generateQRCode(text) {
        try {
            const QRCode = require('qrcode');
            const buffer = await QRCode.toBuffer(text, {
                type: 'png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });
            return buffer;
        } catch (error) {
            throw new Error('Failed to generate QR code');
        }
    }

    /**
     * Search anime by image using trace.moe API
     */
    async searchAnimeByImage(base64Image) {
        try {
            // Convert base64 to blob/buffer for FormData
            const imageBuffer = Buffer.from(base64Image, 'base64');
            
            // Create FormData for trace.moe API
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });

            const response = await axios.post('https://api.trace.moe/search', formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 30000
            });

            if (response.data && response.data.result && response.data.result.length > 0) {
                const bestMatch = response.data.result[0];
                
                // Format timestamp
                const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                };

                return {
                    success: true,
                    data: {
                        title: bestMatch.filename || bestMatch.anilist?.title?.romaji || bestMatch.anilist?.title?.english || 'Unknown',
                        episode: bestMatch.episode || 'Unknown',
                        timestamp: `${formatTime(bestMatch.from)} - ${formatTime(bestMatch.to)}`,
                        similarity: Math.round(bestMatch.similarity * 100),
                        mal_id: bestMatch.anilist?.idMal,
                        year: bestMatch.anilist?.startDate?.year,
                        video: bestMatch.video
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'Anime tidak ditemukan. Pastikan gambar adalah screenshot anime yang jelas.'
                };
            }

        } catch (error) {
            console.error('Trace.moe API error:', error);
            
            if (error.response?.status === 429) {
                return {
                    success: false,
                    error: 'API rate limit exceeded. Coba lagi dalam beberapa menit.'
                };
            } else if (error.response?.status === 413) {
                return {
                    success: false,
                    error: 'Gambar terlalu besar. Gunakan gambar yang lebih kecil.'
                };
            } else {
                return {
                    success: false,
                    error: 'Gagal terhubung ke API trace.moe. Coba lagi nanti.'
                };
            }
        }
    }

    /**
     * Get bot uptime
     */
    getUptime() {
        const seconds = Math.floor(process.uptime());
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Get memory usage
     */
    getMemoryUsage() {
        const used = process.memoryUsage();
        const memory = Math.round(((used.rss / 1024 / 1024) * 100)) / 100;
        return `${memory} MB`;
    }

    // ==================== GROUP METHODS ====================

    /**
     * Check if user is group admin
     */
    async isGroupAdmin(sessionId, groupJid, userJid) {
        try {
            const session = this.getValidSession(sessionId);
            const groupMetadata = await session.sock.groupMetadata(groupJid);
            
            const participant = groupMetadata?.participants?.find(p => p.id === userJid);
            return participant && ['admin', 'superadmin'].includes(participant.admin);

        } catch (error) {
            console.error('Error checking group admin:', error);
            return false;
        }
    }

    /**
     * Tag all members
     */
    async tagAllMembers(sessionId, groupJid, message = '') {
        const session = this.getValidSession(sessionId);
        const groupMetadata = await session.sock.groupMetadata(groupJid);
        
        if (!groupMetadata?.participants?.length) {
            throw new Error('No participants found');
        }

        const mentionText = this.buildMentionText(groupMetadata.participants, message);
        const mentions = groupMetadata.participants.map(p => p.id);

        await session.sock.sendMessage(groupJid, {
            text: mentionText,
            mentions: mentions
        });

        return {
            success: true,
            totalMembers: groupMetadata.participants.length,
            groupName: groupMetadata.subject
        };
    }

    /**
     * Build mention text
     */
    buildMentionText(participants, customMessage) {
        let text = customMessage?.trim() 
            ? `📢 *${customMessage}*\n\n`
            : '📢 *Tag All Members*\n\n';
        
        participants.forEach((participant, index) => {
            const number = participant.id.split('@')[0];
            text += `${index + 1}. @${number}\n`;
        });

        return text;
    }

    /**
     * Get group members
     */
    async getGroupMembers(sessionId, groupJid) {
        const session = this.getValidSession(sessionId);
        const groupMetadata = await session.sock.groupMetadata(groupJid);
        
        if (!groupMetadata) throw new Error('Group not found');

        return {
            groupName: groupMetadata.subject,
            groupId: groupJid,
            participants: groupMetadata.participants.map(p => ({
                id: p.id,
                number: p.id.split('@')[0],
                isAdmin: ['admin', 'superadmin'].includes(p.admin),
                admin: p.admin
            })),
            totalMembers: groupMetadata.participants.length
        };
    }

    /**
     * Build members text
     */
    buildMembersText(members) {
        let text = `📋 *Daftar Member ${members.groupName}*\n\n`;
        
        const admins = members.participants.filter(p => p.isAdmin);
        const regularMembers = members.participants.filter(p => !p.isAdmin);

        if (admins.length > 0) {
            text += `👑 *Admin (${admins.length}):*\n`;
            admins.forEach((admin, index) => {
                text += `${index + 1}. @${admin.number}\n`;
            });
            text += '\n';
        }

        text += `👥 *Member (${regularMembers.length}):*\n`;
        regularMembers.forEach((member, index) => {
            text += `${index + 1}. @${member.number}\n`;
        });

        text += `\n📊 Total: ${members.totalMembers} member`;
        return text;
    }

    // ==================== CONTENT MODERATION ====================

    /**
     * Handle content moderation
     */
    async handleContentModeration(sessionId, message, messageText) {
        try {
            const contentCheck = this.contentFilter.checkContent(messageText);
            if (!contentCheck.isClean) {
                const groupJid = message.key.remoteJid;
                const senderJid = this.getSenderJid(message);
                await this.handleInappropriateContent(sessionId, groupJid, senderJid, contentCheck, message);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in content moderation:', error);
            return false;
        }
    }

    /**
     * Handle inappropriate content
     */
    async handleInappropriateContent(sessionId, groupJid, senderJid, contentCheck, message) {
        try {
            // Delete message if in group
            if (this.isGroupMessage(message)) {
                try {
                    const session = this.getValidSession(sessionId);
                    await session.sock.sendMessage(groupJid, {
                        delete: message.key
                    });
                } catch (deleteError) {
                    console.warn('Could not delete message:', deleteError.message);
                }
            }

            // Send warning based on violation type
            const userNumber = senderJid.split('@')[0];
            let warningMessage = `⚠️ *Peringatan untuk @${userNumber}*\n\n`;
            
            if (contentCheck.hasBadWords && contentCheck.hasNSFW) {
                warningMessage += '❌ Pesan mengandung kata kasar dan konten NSFW\n';
            } else if (contentCheck.hasBadWords) {
                warningMessage += '❌ Pesan mengandung kata kasar\n';
            } else if (contentCheck.hasNSFW) {
                warningMessage += '❌ Pesan mengandung konten NSFW\n';
            }
            
            warningMessage += '💡 Mohon jaga etika dalam berkomunikasi';

            await this.sendMessage(sessionId, groupJid, {
                text: warningMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error handling inappropriate content:', error);
        }
    }
}

module.exports = BotService;
