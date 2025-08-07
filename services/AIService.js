const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        console.log("🤖 AI Service Status:");
        console.log("- GEMINI_API_KEY:", this.apiKey ? "✅ Loaded" : "❌ Missing");

        // Initialize Google AI
        this.genAI = null;
        if (this.apiKey && this.apiKey !== "gemini-api-key") {
            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                console.log("✅ AI Service initialized successfully");
            } catch (error) {
                console.error("❌ AI initialization failed:", error);
            }
        } else {
            console.log("⚠️ No valid API key found, running in demo mode");
        }

        this.currentModel = "gemini-2.0-flash";
    }

    async askAI(question, modelName = null) {
        try {
            if (!this.genAI) {
                return this.getMockResponse(question);
            }

            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
            });

            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            return this.parseAIResponse(text);
        } catch (error) {
            console.error("AI Error:", error.message);
            return this.getMockResponse(question);
        }
    }

    parseAIResponse(response) {
        if (typeof response !== "string" || !response.trim()) {
            return "Maaf, tidak ada response.";
        }

        return response
            // Gabungkan penomoran yang terpisah: "1.\nText" → "1. Text"
            .replace(/^(\d+)\.\s*\n\s*/gm, '$1. ')

            // Perbaiki bullet points dengan underscore: "_   _Label:*" → "• *Label:*"
            .replace(/^_\s*_([^:*\n]+):\*/gm, '• *$1:*')
            
            // Perbaiki bullet points biasa: "_   " → "• "
            .replace(/^_\s+/gm, '• ')
            
            // Perbaiki nested bullet points dengan indentasi
            .replace(/^\s{4,}_\s+/gm, '  • ')

            // Tangani markdown WhatsApp dengan lebih baik
            .replace(/\*\*([^*]+)\*\*/g, '*$1*')        // **bold** → *bold*
            .replace(/__([^_]+)__/g, '*$1*')            // __bold__ → *bold*
            .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '_$1_')  // *italic* → _italic_ (tidak mengganggu bold)
            .replace(/~~(.*?)~~/g, '~$1~')              // strikethrough tetap
            .replace(/`([^`]+)`/g, '$1')                // inline code → hilangkan backtick
            .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)') // [text](url) → text (url)

            // Bersihkan spasi berlebih pada awal baris
            .replace(/^\s+/gm, '')
            
            // Bersihkan newline bertumpuk
            .replace(/\n{3,}/g, '\n\n')

            // Pangkas spasi akhir
            .trim();
    }

    getMockResponse(question) {
        return `Hai! Pertanyaan: "${question}"

Saya adalah AI assistant. Untuk mengaktifkan AI penuh, silakan set GEMINI_API_KEY di environment variables.

Dalam mode produksi, saya dapat membantu dengan berbagai pertanyaan!`;
    }

    async analyzeImage(imageData, prompt = "Jelaskan gambar ini") {
        try {
            if (!this.genAI) {
                return "Mode demo - fitur analisis gambar tersedia dengan API key.";
            }

            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
            });

            const imagePart = {
                inlineData: {
                    data: imageData,
                    mimeType: "image/jpeg",
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;

            return this.parseAIResponse(response.text());
        } catch (error) {
            console.error("Image analysis error:", error);
            return "Maaf, gagal menganalisis gambar.";
        }
    }

    async translateText(text, targetLang) {
        try {
            if (!this.genAI) {
                return `Terjemahan demo: "${text}" -> (${targetLang.toUpperCase()})`;
            }

            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
            });

            const prompt = `Translate the following text to ${targetLang}. Only return the translation, no additional text or explanation:

${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;

            return this.parseAIResponse(response.text());
        } catch (error) {
            console.error("Translation error:", error);
            return `Error: Gagal menerjemahkan teks.`;
        }
    }

    // Methods needed by BotService
    isValidQuestion(question) {
        if (!question || typeof question !== "string") return false;
        if (question.trim().length < 3) return false;
        if (question.length > 1000) return false;
        return true;
    }

    prepareQuestion(question) {
        return question.trim().replace(/\n+/g, " ").substring(0, 1000);
    }

    formatAIResponse(question, answer) {
        const cleanAnswer = this.parseAIResponse(answer);

        return `🤖 *AI Assistant*

❓ *Pertanyaan:*
${question}

💡 *Jawaban:*
${cleanAnswer}

---
_Powered by Gemini AI_`;
    }
}

module.exports = AIService;
