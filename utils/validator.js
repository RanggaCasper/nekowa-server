class Validator {
    static validatePhoneNumber(number) {
        // Basic phone number validation
        const phoneRegex = /^(\+?[1-9]\d{1,14})$/;
        return phoneRegex.test(number.replace(/\s+/g, ''));
    }
    
    static validateSessionId(sessionId) {
        // Basic session ID validation
        return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 50;
    }
    
    static validateMessage(message) {
        // Basic message validation
        return typeof message === 'string' && message.length > 0 && message.length <= 4096;
    }
    
    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = Validator;
