const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const qrcode = require('qrcode');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

class WhatsAppSession {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.sock = null;
        this.qrCode = null;
        this.pairingCode = null;
        this.pairingNumber = null;
        this.loginMode = 'qr'; // 'qr' or 'pairing'
        this.isConnected = false;
        this.isConnecting = false;
        this.authPath = `./sessions/${sessionId}`;
        this.retryCount = 0;
        this.maxRetries = 2; // Reduced from 3 to 2
        this.messageHandlers = new Map();
        this.reconnectDelay = 15000; // Increased to 15 seconds
        this.lastDisconnectTime = 0;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 3;
        this.cooldownPeriod = 300000; // 5 minutes cooldown
        this.lastCooldownStart = 0;
        this.manualDisconnect = false;
        
        this.ensureSessionFolder();
    }

    async ensureSessionFolder() {
        try {
            await fs.mkdir(`./sessions/${this.sessionId}`, { recursive: true });
        } catch (error) {
            console.error(`Error creating session folder for ${this.sessionId}:`, error);
        }
    }

    async hasValidAuth() {
        try {
            const credsPath = `${this.authPath}/creds.json`;
            const credsExists = await fs.access(credsPath).then(() => true).catch(() => false);
            if (!credsExists) return false;
            
            const creds = JSON.parse(await fs.readFile(credsPath, 'utf-8'));
            return creds && creds.me && creds.me.id;
        } catch (error) {
            console.log(`[${this.sessionId}] No valid auth found:`, error.message);
            return false;
        }
    }

    // Set login mode and pairing number
    setLoginMode(mode, phoneNumber = null) {
        this.loginMode = mode;
        if (mode === 'pairing' && phoneNumber) {
            // Clean phone number (remove non-digits)
            this.pairingNumber = phoneNumber.replace(/\D/g, '');
            console.log(`[${this.sessionId}] Set to pairing mode with number: ${this.pairingNumber}`);
        } else if (mode === 'qr') {
            this.pairingNumber = null;
            this.pairingCode = null;
            console.log(`[${this.sessionId}] Set to QR mode`);
        }
    }

    // Get pairing code
    getPairingCode() {
        return this.pairingCode;
    }

    // Request pairing code
    async requestPairingCode(phoneNumber) {
        if (!this.sock) {
            throw new Error('Socket not initialized. Please call connect() first.');
        }
        
        try {
            // Clean phone number
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            this.pairingNumber = cleanNumber;
            
            // Request pairing code from WhatsApp
            const code = await this.sock.requestPairingCode(cleanNumber);
            this.pairingCode = code;
            
            console.log(`[${this.sessionId}] Pairing code generated: ${code} for number: ${cleanNumber}`);
            return code;
        } catch (error) {
            console.error(`[${this.sessionId}] Error requesting pairing code:`, error);
            throw error;
        }
    }

    async connect() {
        // Prevent multiple simultaneous connections
        if (this.isConnecting || this.isConnected) {
            console.log(`[${this.sessionId}] Already connecting or connected, skipping...`);
            return;
        }
        
        // Check if we're in cooldown period
        if (this.lastCooldownStart > 0 && (Date.now() - this.lastCooldownStart) < this.cooldownPeriod) {
            const remainingCooldown = Math.ceil((this.cooldownPeriod - (Date.now() - this.lastCooldownStart)) / 1000);
            console.log(`[${this.sessionId}] Still in cooldown period, ${remainingCooldown}s remaining`);
            return;
        }
        
        try {
            this.isConnecting = true;
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            const { version, isLatest } = await fetchLatestBaileysVersion();
            
            console.log(`[${this.sessionId}] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

            // Configure socket options based on login mode
            const socketOptions = {
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: [`WhatsApp Gateway - ${this.sessionId}`, 'Chrome', '1.0.0'],
                auth: state,
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false
            };

            // Add pairing code option if in pairing mode
            if (this.loginMode === 'pairing' && this.pairingNumber) {
                socketOptions.mobile = false; // Ensure it's not mobile mode for pairing
                console.log(`[${this.sessionId}] Configuring for pairing mode with number: ${this.pairingNumber}`);
            }

            this.sock = makeWASocket(socketOptions);

            this.setupEventHandlers(saveCreds);

        } catch (error) {
            console.error(`[${this.sessionId}] Connection error:`, error);
            this.isConnected = false;
            this.isConnecting = false;
            this.consecutiveFailures++;
            
            // If too many consecutive failures, enter cooldown
            if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
                console.log(`[${this.sessionId}] Entering cooldown due to connection errors`);
                this.lastCooldownStart = Date.now();
            }
        }
    }

    setupEventHandlers(saveCreds) {
        // Connection event handler
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;
            
            if (qr && this.loginMode === 'qr') {
                this.qrCode = await qrcode.toDataURL(qr);
                console.log(`[${this.sessionId}] QR Code generated`);
            }
            
            if (connection === 'close') {
                this.handleDisconnection(lastDisconnect);
            } else if (connection === 'open') {
                this.handleConnection();
            }
        });

        // Credentials update handler
        this.sock.ev.on('creds.update', saveCreds);

        // Messages handler
        this.sock.ev.on('messages.upsert', async (m) => {
            await this.handleIncomingMessage(m);
        });

        // Group participants update handler (for welcome/goodbye messages)
        this.sock.ev.on('group-participants.update', async (update) => {
            await this.handleGroupParticipantsUpdate(update);
        });
        
        // For pairing mode, request pairing code after socket is ready
        if (this.loginMode === 'pairing' && this.pairingNumber && !this.pairingCode) {
            // Wait a bit for socket to be ready, then request pairing code
            setTimeout(async () => {
                try {
                    if (this.sock && !this.isConnected) {
                        const code = await this.sock.requestPairingCode(this.pairingNumber);
                        this.pairingCode = code;
                        console.log(`[${this.sessionId}] Pairing code generated: ${code}`);
                    }
                } catch (error) {
                    console.error(`[${this.sessionId}] Error generating pairing code:`, error);
                }
            }, 2000);
        }
    }

    handleDisconnection(lastDisconnect) {
        this.isConnected = false;
        this.isConnecting = false;
        this.lastDisconnectTime = Date.now();
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[${this.sessionId}] Connection closed:`, statusCode);
        
        // Check if this is a manual disconnect
        if (this.manualDisconnect) {
            console.log(`[${this.sessionId}] Manual disconnect detected, not reconnecting`);
            this.manualDisconnect = false;
            return;
        }
        
        // Check for specific disconnect reasons that shouldn't reconnect
        const noReconnectCodes = [
            DisconnectReason.loggedOut,
            DisconnectReason.badSession,
            DisconnectReason.multideviceMismatch,
            401, // Unauthorized
            403, // Forbidden
            440  // Connection timeout
        ];
        
        if (noReconnectCodes.includes(statusCode)) {
            console.log(`[${this.sessionId}] Not reconnecting due to status code: ${statusCode}`);
            this.consecutiveFailures++;
            return;
        }
        
        // Check if we're in cooldown period
        if (this.lastCooldownStart > 0 && (Date.now() - this.lastCooldownStart) < this.cooldownPeriod) {
            const remainingCooldown = Math.ceil((this.cooldownPeriod - (Date.now() - this.lastCooldownStart)) / 1000);
            console.log(`[${this.sessionId}] In cooldown period, ${remainingCooldown}s remaining`);
            return;
        }
        
        // Check consecutive failures
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.log(`[${this.sessionId}] Too many consecutive failures (${this.consecutiveFailures}), entering cooldown period`);
            this.lastCooldownStart = Date.now();
            this.consecutiveFailures = 0;
            this.retryCount = 0;
            return;
        }
        
        const shouldReconnect = (lastDisconnect?.error && lastDisconnect.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut 
            : true;
            
        if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`[${this.sessionId}] Reconnecting... Attempt ${this.retryCount}/${this.maxRetries}`);
            
            // Exponential backoff with cap
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.retryCount - 1), 60000); // Max 1 minute
            console.log(`[${this.sessionId}] Waiting ${delay/1000} seconds before reconnect...`);
            
            setTimeout(() => {
                // Double check conditions before reconnecting
                if (!this.isConnected && !this.isConnecting && 
                    Date.now() - this.lastDisconnectTime >= delay) {
                    this.connect();
                }
            }, delay);
        } else if (this.retryCount >= this.maxRetries) {
            console.log(`[${this.sessionId}] Max retry attempts (${this.maxRetries}) reached. Stopping reconnection.`);
            this.consecutiveFailures++;
            this.retryCount = 0;
            
            // If too many consecutive failure cycles, start cooldown
            if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
                console.log(`[${this.sessionId}] Starting cooldown period due to repeated failures`);
                this.lastCooldownStart = Date.now();
            }
        }
    }

    handleConnection() {
        console.log(`[${this.sessionId}] Connected to WhatsApp!`);
        this.isConnected = true;
        this.isConnecting = false;
        this.qrCode = null;
        this.retryCount = 0;
        this.consecutiveFailures = 0; // Reset consecutive failures on successful connection
        this.lastCooldownStart = 0; // Reset cooldown on successful connection
        this.lastDisconnectTime = 0;
    }

    async handleIncomingMessage(m) {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const messageType = Object.keys(msg.message)[0];
        const messageContent = msg.message[messageType];
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : from;
        
        console.log(`[${this.sessionId}] Message from ${sender}: ${messageContent.text || messageType}`);
        
        // Built-in command handlers
        await this.handleBuiltinCommands(messageContent, from);
        
        // Execute custom message handlers
        for (const handler of this.messageHandlers.values()) {
            try {
                await handler(msg, this);
            } catch (error) {
                console.error(`[${this.sessionId}] Message handler error:`, error);
            }
        }
    }

    async handleBuiltinCommands(messageContent, from) {
        if (!messageContent.text) return;
        
        const text = messageContent.text.toLowerCase();
        
        if (text === '/info') {
            await this.sendMessage(from, {
                text: `🤖 *WhatsApp Gateway Info*\n\n` +
                      `📱 Session: ${this.sessionId}\n` +
                      `⏰ Time: ${new Date().toLocaleString('id-ID')}\n` +
                      `✅ Status: Connected\n\n` +
                      `Commands:\n/info - Show this info\n/ping - Test connection`
            });
        }
        
        if (text === '/ping') {
            await this.sendMessage(from, { text: '🏓 Pong! Gateway is active!' });
        }
    }

    addMessageHandler(name, handler) {
        this.messageHandlers.set(name, handler);
    }

    removeMessageHandler(name) {
        this.messageHandlers.delete(name);
    }

    async sendMessage(jid, message) {
        if (!this.isConnected || !this.sock) {
            throw new Error('Session not connected');
        }
        return await this.sock.sendMessage(jid, message);
    }

    async getContactInfo(number) {
        if (!this.isConnected || !this.sock) {
            throw new Error('Session not connected');
        }
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        return await this.sock.onWhatsApp(jid);
    }

    async logout() {
        try {
            if (this.sock) {
                await this.sock.logout();
            }
            await fs.rm(this.authPath, { recursive: true, force: true });
            this.isConnected = false;
            this.qrCode = null;
        } catch (error) {
            console.error(`[${this.sessionId}] Logout error:`, error);
        }
    }

    getStatus() {
        return {
            sessionId: this.sessionId,
            connected: this.isConnected,
            user: this.sock?.user || null,
            qrCode: this.qrCode,
            pairingCode: this.pairingCode,
            pairingNumber: this.pairingNumber,
            loginMode: this.loginMode,
            retryCount: this.retryCount
        };
    }

    // Reset pairing code and QR code
    resetLoginData() {
        this.qrCode = null;
        this.pairingCode = null;
        console.log(`[${this.sessionId}] Login data reset`);
    }

    // Connect with specific login mode
    async connectWithMode(mode, phoneNumber = null) {
        this.setLoginMode(mode, phoneNumber);
        this.resetLoginData();
        await this.connect();
        
        // Pairing code will be automatically generated by event handler
        // when connection is ready
    }

    async handleGroupParticipantsUpdate(update) {
        try {
            const { id: groupJid, participants, action } = update;
            
            // Only handle add and remove actions
            if (action !== 'add' && action !== 'remove') return;
            
            // Call bot middleware to handle welcome/goodbye
            const botMiddleware = require('../middleware/botMiddleware');
            if (botMiddleware && botMiddleware.handleGroupUpdate) {
                await botMiddleware.handleGroupUpdate(this.sessionId, groupJid, participants, action);
            }
            
        } catch (error) {
            console.error(`[${this.sessionId}] Error handling group participants update:`, error);
        }
    }
}

module.exports = WhatsAppSession;