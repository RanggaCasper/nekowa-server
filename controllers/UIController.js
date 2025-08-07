class UIController {
    renderMainUI = (req, res) => {
        res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Gateway Multi-Device</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
    <div x-data="whatsappGateway()" x-init="init()" class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">
                <i class="fab fa-whatsapp text-green-500"></i>
                WhatsApp Gateway
            </h1>
            <p class="text-gray-600">Multi-Device Session Manager</p>
        </div>

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100 text-green-600">
                        <i class="fas fa-mobile-alt text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-2xl font-bold text-gray-800" x-text="sessions.length"></p>
                        <p class="text-gray-600">Total Sessions</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                        <i class="fas fa-check-circle text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-2xl font-bold text-gray-800" x-text="connectedCount"></p>
                        <p class="text-gray-600">Connected</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <i class="fas fa-qrcode text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-2xl font-bold text-gray-800" x-text="qrCount"></p>
                        <p class="text-gray-600">Waiting QR</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="mb-8 flex flex-wrap gap-4">
            <button @click="createSession()" 
                    class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                <i class="fas fa-plus mr-2"></i>Create New Session
            </button>
            
            <button @click="refreshSessions()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                <i class="fas fa-sync-alt mr-2"></i>Refresh
            </button>
            
            <button @click="showMessageModal = true" 
                    class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                <i class="fas fa-paper-plane mr-2"></i>Send Message
            </button>
        </div>

        <!-- Sessions List -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <template x-for="session in sessions" :key="session.sessionId">
                <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                    <!-- Session Header -->
                    <div class="bg-gray-50 px-6 py-4 border-b">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="font-semibold text-gray-800" x-text="session.sessionId"></h3>
                                <div class="flex items-center mt-1">
                                    <div class="w-2 h-2 rounded-full mr-2" 
                                         :class="session.connected ? 'bg-green-500' : 'bg-gray-400'"></div>
                                    <span class="text-sm text-gray-600" 
                                          x-text="session.connected ? 'Connected' : 'Disconnected'"></span>
                                </div>
                            </div>
                            <button @click="deleteSession(session.sessionId)" 
                                    class="text-red-500 hover:text-red-700 p-2">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Session Content -->
                    <div class="p-6">
                        <!-- Connected State -->
                        <template x-if="session.connected && session.user">
                            <div class="text-center">
                                <div class="mb-4">
                                    <i class="fas fa-user-circle text-4xl text-green-500"></i>
                                </div>
                                <h4 class="font-semibold text-gray-800" x-text="session.user.name || session.user.id"></h4>
                                <p class="text-sm text-gray-600" x-text="session.user.id"></p>
                                <div class="mt-4 flex justify-center space-x-2">
                                    <button @click="sendTestMessage(session.sessionId)" 
                                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm">
                                        <i class="fas fa-paper-plane mr-1"></i>Test
                                    </button>
                                    <button @click="logoutSession(session.sessionId)" 
                                            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm">
                                        <i class="fas fa-sign-out-alt mr-1"></i>Logout
                                    </button>
                                </div>
                            </div>
                        </template>

                        <!-- QR Code State -->
                        <template x-if="!session.connected && session.qrCode">
                            <div class="text-center">
                                <div class="mb-4">
                                    <img :src="session.qrCode" class="mx-auto w-48 h-48 border-2 border-gray-200 rounded-lg">
                                </div>
                                <p class="text-sm text-gray-600 mb-4">Scan QR Code dengan WhatsApp</p>
                                <button @click="refreshSession(session.sessionId)" 
                                        class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">
                                    <i class="fas fa-sync-alt mr-1"></i>Refresh QR
                                </button>
                            </div>
                        </template>

                        <!-- Loading State -->
                        <template x-if="!session.connected && !session.qrCode">
                            <div class="text-center py-8">
                                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                                <p class="text-gray-600">Connecting...</p>
                                <template x-if="session.retryCount > 0">
                                    <p class="text-sm text-yellow-600 mt-2">
                                        Retry attempt: <span x-text="session.retryCount"></span>/5
                                    </p>
                                </template>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </div>

        <!-- Empty State -->
        <template x-if="sessions.length === 0">
            <div class="text-center py-12">
                <i class="fas fa-mobile-alt text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No Sessions Available</h3>
                <p class="text-gray-500 mb-6">Create a new WhatsApp session to get started</p>
                <button @click="createSession()" 
                        class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold">
                    Create First Session
                </button>
            </div>
        </template>

        <!-- Message Modal -->
        <div x-show="showMessageModal" 
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0"
             x-transition:enter-end="opacity-100"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100"
             x-transition:leave-end="opacity-0"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4" @click.away="showMessageModal = false">
                <h3 class="text-lg font-semibold mb-4">Send Message</h3>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Session</label>
                    <select x-model="messageForm.sessionId" 
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Session</option>
                        <template x-for="session in sessions.filter(s => s.connected)" :key="session.sessionId">
                            <option :value="session.sessionId" x-text="session.sessionId + ' (' + (session.user?.name || 'Unknown') + ')'"></option>
                        </template>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input type="text" x-model="messageForm.number" 
                           placeholder="e.g., 6281234567890"
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea x-model="messageForm.message" 
                              rows="4" 
                              placeholder="Enter your message here..."
                              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button @click="showMessageModal = false" 
                            class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button @click="sendMessage()" 
                            :disabled="sending"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50">
                        <span x-show="!sending">Send</span>
                        <span x-show="sending">Sending...</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div x-show="toast.show" 
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0 translate-y-2"
             x-transition:enter-end="opacity-100 translate-y-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100 translate-y-0"
             x-transition:leave-end="opacity-0 translate-y-2"
             class="fixed bottom-4 right-4 z-50">
            <div class="px-6 py-4 rounded-lg shadow-lg text-white"
                 :class="toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'">
                <div class="flex items-center">
                    <i class="fas mr-3" 
                       :class="toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'"></i>
                    <span x-text="toast.message"></span>
                </div>
            </div>
        </div>
    </div>

    <script>
        function whatsappGateway() {
            return {
                sessions: [],
                showMessageModal: false,
                sending: false,
                messageForm: {
                    sessionId: '',
                    number: '',
                    message: ''
                },
                toast: {
                    show: false,
                    type: 'info',
                    message: ''
                },

                get connectedCount() {
                    return this.sessions.filter(s => s.connected).length;
                },

                get qrCount() {
                    return this.sessions.filter(s => !s.connected && s.qrCode).length;
                },

                init() {
                    this.refreshSessions();
                    setInterval(() => {
                        this.refreshSessions();
                    }, 5000);
                },

                async refreshSessions() {
                    try {
                        const response = await fetch('/api/sessions');
                        const data = await response.json();
                        this.sessions = data.data || [];
                    } catch (error) {
                        console.error('Error fetching sessions:', error);
                        this.showToast('error', 'Failed to fetch sessions');
                    }
                },

                async createSession() {
                    try {
                        const response = await fetch('/api/sessions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'Session created successfully');
                            this.refreshSessions();
                        }
                    } catch (error) {
                        console.error('Error creating session:', error);
                        this.showToast('error', 'Failed to create session');
                    }
                },

                async deleteSession(sessionId) {
                    if (!confirm('Are you sure you want to delete this session?')) return;
                    
                    try {
                        const response = await fetch(\`/api/sessions/\${sessionId}\`, {
                            method: 'DELETE'
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'Session deleted successfully');
                            this.refreshSessions();
                        }
                    } catch (error) {
                        console.error('Error deleting session:', error);
                        this.showToast('error', 'Failed to delete session');
                    }
                },

                async logoutSession(sessionId) {
                    if (!confirm('Are you sure you want to logout this session?')) return;
                    
                    try {
                        const response = await fetch(\`/api/sessions/\${sessionId}/logout\`, {
                            method: 'POST'
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'Session logged out successfully');
                            this.refreshSessions();
                        }
                    } catch (error) {
                        console.error('Error logging out session:', error);
                        this.showToast('error', 'Failed to logout session');
                    }
                },

                async refreshSession(sessionId) {
                    try {
                        const response = await fetch(\`/api/sessions/\${sessionId}/refresh\`, {
                            method: 'POST'
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'QR Code refreshed');
                            this.refreshSessions();
                        }
                    } catch (error) {
                        console.error('Error refreshing session:', error);
                        this.showToast('error', 'Failed to refresh session');
                    }
                },

                async sendTestMessage(sessionId) {
                    const session = this.sessions.find(s => s.sessionId === sessionId);
                    if (!session || !session.user) return;
                    
                    try {
                        const response = await fetch('/api/send-message', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: sessionId,
                                number: session.user.id,
                                message: '🤖 Test message from WhatsApp Gateway\\n\\nTime: ' + new Date().toLocaleString('id-ID')
                            })
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'Test message sent successfully');
                        }
                    } catch (error) {
                        console.error('Error sending test message:', error);
                        this.showToast('error', 'Failed to send test message');
                    }
                },

                async sendMessage() {
                    if (!this.messageForm.sessionId || !this.messageForm.number || !this.messageForm.message) {
                        this.showToast('error', 'Please fill all fields');
                        return;
                    }
                    
                    this.sending = true;
                    
                    try {
                        const response = await fetch('/api/send-message', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(this.messageForm)
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            this.showToast('error', data.message);
                        } else {
                            this.showToast('success', 'Message sent successfully');
                            this.showMessageModal = false;
                            this.messageForm = { sessionId: '', number: '', message: '' };
                        }
                    } catch (error) {
                        console.error('Error sending message:', error);
                        this.showToast('error', 'Failed to send message');
                    } finally {
                        this.sending = false;
                    }
                },

                showToast(type, message) {
                    this.toast = { show: true, type, message };
                    setTimeout(() => {
                        this.toast.show = false;
                    }, 5000);
                }
            }
        }
    </script>
</body>
</html>
        `);
    }
}

module.exports = new UIController();
