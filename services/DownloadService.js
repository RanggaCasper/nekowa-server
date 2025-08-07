const axios = require('axios');
const path = require('path');
const fs = require('fs');

class DownloadService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
        
        // API keys for services (add to .env file)
        this.unsplashApiKey = process.env.UNSPLASH_API_KEY || 'demo';
        this.pexelsApiKey = process.env.PEXELS_API_KEY || 'demo';
    }

    async ensureTempDir() {
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating temp directory:', error);
        }
    }

    // Download image
    async downloadImage(url, query = '') {
        try {
            if (!this.isValidUrl(url)) {
                // If not a direct URL, search for image
                return await this.searchAndDownloadImage(query || url);
            }

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            // Validate response
            if (!response.data || response.data.length === 0) {
                throw new Error('Gambar kosong atau tidak valid');
            }

            const buffer = Buffer.from(response.data);
            
            // Check if it's actually an image
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('File bukan gambar yang valid');
            }

            const extension = this.getImageExtension(contentType);
            const filename = `image_${Date.now()}${extension}`;
            const filepath = path.join(this.tempDir, filename);
            
            fs.writeFileSync(filepath, buffer);

            return {
                success: true,
                buffer: buffer,
                filepath: filepath,
                filename: filename,
                size: buffer.length,
                contentType: contentType
            };

        } catch (error) {
            console.error('Error downloading image:', error);
            throw new Error('Gagal download gambar: ' + error.message);
        }
    }

    // Get image extension from content type
    getImageExtension(contentType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/bmp': '.bmp',
            'image/svg+xml': '.svg'
        };
        return extensions[contentType] || '.jpg';
    }

    // Search and download image
    async searchAndDownloadImage(query) {
        try {
            console.log(`Searching for images: ${query}`);
            
            let imageUrl = null;
            
            // Try different image sources
            try {
                // Try Unsplash first (if API key available)
                if (this.unsplashApiKey && this.unsplashApiKey !== 'demo') {
                    imageUrl = await this.searchUnsplash(query);
                }
            } catch (error) {
                console.log('Unsplash search failed, trying alternatives...');
            }
            
            if (!imageUrl) {
                try {
                    // Try Pexels (if API key available)
                    if (this.pexelsApiKey && this.pexelsApiKey !== 'demo') {
                        imageUrl = await this.searchPexels(query);
                    }
                } catch (error) {
                    console.log('Pexels search failed, using fallback...');
                }
            }
            
            // Fallback to Lorem Picsum with themed approach
            if (!imageUrl) {
                imageUrl = await this.getFallbackImage(query);
            }
            
            if (!imageUrl) {
                throw new Error('Tidak dapat menemukan gambar yang sesuai');
            }

            return await this.downloadImage(imageUrl);

        } catch (error) {
            console.error('Error searching image:', error);
            throw new Error('Gagal mencari gambar: ' + error.message);
        }
    }

    // Search Unsplash
    async searchUnsplash(query) {
        try {
            const response = await axios.get('https://api.unsplash.com/search/photos', {
                params: {
                    query: query,
                    per_page: 1,
                    orientation: 'landscape'
                },
                headers: {
                    'Authorization': `Client-ID ${this.unsplashApiKey}`
                },
                timeout: 10000
            });

            if (response.data && response.data.results && response.data.results.length > 0) {
                return response.data.results[0].urls.regular;
            }
            return null;
        } catch (error) {
            console.error('Unsplash API error:', error);
            return null;
        }
    }

    // Search Pexels
    async searchPexels(query) {
        try {
            const response = await axios.get('https://api.pexels.com/v1/search', {
                params: {
                    query: query,
                    per_page: 1,
                    orientation: 'landscape'
                },
                headers: {
                    'Authorization': this.pexelsApiKey
                },
                timeout: 10000
            });

            if (response.data && response.data.photos && response.data.photos.length > 0) {
                return response.data.photos[0].src.large;
            }
            return null;
        } catch (error) {
            console.error('Pexels API error:', error);
            return null;
        }
    }

    // Get fallback image
    async getFallbackImage(query) {
        try {
            // Map query keywords to categories for better results
            const categories = {
                'nature': ['nature', 'landscape', 'forest', 'mountain', 'tree', 'flower'],
                'animals': ['cat', 'dog', 'bird', 'animal', 'pet'],
                'city': ['city', 'building', 'urban', 'street', 'architecture'],
                'people': ['people', 'person', 'human', 'face', 'portrait'],
                'food': ['food', 'eat', 'meal', 'restaurant', 'cooking'],
                'technology': ['computer', 'tech', 'phone', 'laptop', 'gadget'],
                'sports': ['sport', 'football', 'basketball', 'soccer', 'exercise'],
                'art': ['art', 'painting', 'design', 'creative', 'color']
            };

            let category = 'random';
            const lowerQuery = query.toLowerCase();
            
            for (const [cat, keywords] of Object.entries(categories)) {
                if (keywords.some(keyword => lowerQuery.includes(keyword))) {
                    category = cat;
                    break;
                }
            }

            // Use Lorem Picsum with seed for consistent results
            const seed = Math.floor(Math.random() * 1000);
            const width = 800;
            const height = 600;
            
            return `https://picsum.photos/seed/${category}-${seed}/${width}/${height}`;
            
        } catch (error) {
            console.error('Fallback image error:', error);
            return `https://picsum.photos/800/600?random=${Date.now()}`;
        }
    }

    // Download YouTube Music (MP3 format)
    async downloadYouTubeMusic(url) {
        try {
            // Validate YouTube URL
            if (!this.validateYouTubeUrl(url)) {
                throw new Error('URL YouTube tidak valid atau tidak didukung');
            }

            // Check if ytdl-core is available
            if (!this.isYtdlAvailable()) {
                throw new Error('Library ytdl-core tidak tersedia. Pastikan sudah terinstall.');
            }

            // Get video info first and convert YouTube Music URL to regular YouTube URL
            const videoInfo = await this.getYouTubeInfo(url);
            const downloadUrl = videoInfo.url; // This will be the converted regular YouTube URL
            
            // Check if this is a YouTube Music URL for better error messages
            const isYouTubeMusic = url.includes('music.youtube.com');
            
            // Try to use ytdl-core for audio download
            try {
                const ytdl = require('@distube/ytdl-core');
                
                // Get video info using the regular YouTube URL
                const info = await ytdl.getInfo(downloadUrl);
                const videoDetails = info.videoDetails;
                
                // Check duration (max 20 minutes for music from YouTube Music, 15 for regular)
                const maxDuration = isYouTubeMusic ? 1200 : 900; // 20 min for YouTube Music, 15 min for regular
                const duration = parseInt(videoDetails.lengthSeconds);
                if (duration > maxDuration) {
                    const maxMinutes = Math.floor(maxDuration / 60);
                    throw new Error(`Audio terlalu panjang! Maksimal ${maxMinutes} menit untuk ${isYouTubeMusic ? 'YouTube Music' : 'musik'}.`);
                }
                
                // Get best audio quality format
                const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                if (!audioFormats || audioFormats.length === 0) {
                    throw new Error('Format audio tidak tersedia untuk video ini');
                }
                
                // Choose highest quality audio
                const format = audioFormats.reduce((best, current) => {
                    const bestBitrate = parseInt(best.audioBitrate) || 0;
                    const currentBitrate = parseInt(current.audioBitrate) || 0;
                    return currentBitrate > bestBitrate ? current : best;
                });
                
                // Download audio stream with size monitoring
                const audioStream = ytdl(downloadUrl, { 
                    format: format,
                    quality: 'highestaudio'
                });
                
                const chunks = [];
                let totalSize = 0;
                const sizeLimit = this.getFileSizeLimit('music');
                
                for await (const chunk of audioStream) {
                    totalSize += chunk.length;
                    
                    // Check size during download
                    if (totalSize > sizeLimit) {
                        throw new Error(`File audio melebihi batas ukuran maksimal (${this.formatFileSize(sizeLimit)})`);
                    }
                    
                    chunks.push(chunk);
                }
                
                const buffer = Buffer.concat(chunks);
                
                // Save to temp file
                const filename = `${isYouTubeMusic ? 'ytmusic' : 'music'}_${Date.now()}.${format.container || 'mp4'}`;
                const filepath = path.join(this.tempDir, filename);
                fs.writeFileSync(filepath, buffer);
                
                return {
                    success: true,
                    buffer: buffer,
                    filepath: filepath,
                    filename: filename,
                    title: videoDetails.title,
                    duration: this.formatDuration(duration),
                    author: videoDetails.author.name,
                    size: this.formatFileSize(buffer.length),
                    quality: format.audioBitrate ? `${format.audioBitrate}kbps` : 'Unknown',
                    contentType: format.mimeType || 'audio/mp4',
                    source: isYouTubeMusic ? 'YouTube Music' : 'YouTube',
                    originalUrl: url
                };
                
            } catch (ytdlError) {
                console.error('ytdl-core error:', ytdlError);
                
                // Fallback to alternative method or provide helpful error
                throw new Error(`
🎵 *YouTube Music Download Error*

❌ *Gagal mengunduh:* ${ytdlError.message}

💡 *Kemungkinan penyebab:*
• Video pribadi atau terbatas
• Koneksi internet tidak stabil
• Format audio tidak tersedia
• Video terlalu panjang (>15 menit)

� *Solusi:*
• Coba link YouTube lain
• Pastikan video dapat diputar
• Gunakan link YouTube Music jika tersedia

📱 *Alternatif:* Gunakan website ytmp3.cc
Link: ${url}
                `.trim());
            }

        } catch (error) {
            console.error('Error downloading YouTube music:', error);
            
            // If it's our custom error, throw as is
            if (error.message.includes('YouTube Music Download Error') || 
                error.message.includes('Audio terlalu panjang')) {
                throw error;
            }
            
            throw new Error('Gagal download musik: ' + error.message);
        }
    }

    // Download audio from YouTube
    async downloadYouTubeAudio(url) {
        try {
            // Use the same logic as downloadYouTubeMusic
            return await this.downloadYouTubeMusic(url);

        } catch (error) {
            console.error('Error downloading YouTube audio:', error);
            throw new Error('Gagal download audio: ' + error.message);
        }
    }

    // Download video from YouTube
    async downloadYouTubeVideo(url) {
        try {
            const videoInfo = await this.getYouTubeInfo(url);
            
            // Try to use ytdl-core for video download
            try {
                const ytdl = require('@distube/ytdl-core');
                
                // Get video info
                const info = await ytdl.getInfo(url);
                const videoDetails = info.videoDetails;
                
                // Check duration (max 10 minutes for video)
                const duration = parseInt(videoDetails.lengthSeconds);
                if (duration > 600) {
                    throw new Error('Video terlalu panjang! Maksimal 10 menit.');
                }
                
                // Get best quality format with video and audio
                const format = ytdl.chooseFormat(info.formats, { 
                    quality: 'highestvideo',
                    filter: 'videoandaudio'
                });
                
                if (!format) {
                    throw new Error('Format video tidak tersedia');
                }
                
                // Download video
                const videoStream = ytdl(url, { 
                    format: format,
                    quality: 'highestvideo'
                });
                
                const chunks = [];
                for await (const chunk of videoStream) {
                    chunks.push(chunk);
                }
                
                const buffer = Buffer.concat(chunks);
                
                // Save to temp file
                const filename = `video_${Date.now()}.${format.container || 'mp4'}`;
                const filepath = path.join(this.tempDir, filename);
                fs.writeFileSync(filepath, buffer);
                
                return {
                    success: true,
                    buffer: buffer,
                    filepath: filepath,
                    filename: filename,
                    title: videoDetails.title,
                    duration: this.formatDuration(duration),
                    views: this.formatViews(videoDetails.viewCount),
                    author: videoDetails.author.name,
                    size: this.formatFileSize(buffer.length),
                    quality: format.qualityLabel || 'Unknown',
                    contentType: format.mimeType || 'video/mp4'
                };
                
            } catch (ytdlError) {
                console.error('ytdl-core error:', ytdlError);
                
                throw new Error(`
📹 *YouTube Video Download Error*

❌ *Gagal mengunduh:* ${ytdlError.message}

💡 *Kemungkinan penyebab:*
• Video pribadi atau terbatas
• File terlalu besar (>50MB)
• Format tidak tersedia
• Video terlalu panjang (>10 menit)

🔧 *Solusi:*
• Coba video YouTube lain
• Pilih video dengan durasi <10 menit
• Pastikan video dapat diputar publik

📱 *Alternatif:* Gunakan website savefrom.net
Link: ${url}
                `.trim());
            }

        } catch (error) {
            console.error('Error downloading YouTube video:', error);
            
            // If it's our custom error, throw as is
            if (error.message.includes('YouTube Video Download Error') || 
                error.message.includes('Video terlalu panjang')) {
                throw error;
            }
            
            throw new Error('Gagal download video: ' + error.message);
        }
    }

    // Get YouTube video info (including YouTube Music)
    async getYouTubeInfo(url) {
        try {
            // Enhanced regex for YouTube URLs including YouTube Music
            let videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
            
            // Try YouTube Music patterns if normal YouTube patterns don't match
            if (!videoIdMatch) {
                videoIdMatch = url.match(/music\.youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/);
                if (!videoIdMatch) {
                    videoIdMatch = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
                }
            }
            
            if (!videoIdMatch) {
                throw new Error('URL YouTube tidak valid');
            }

            const videoId = videoIdMatch[1];
            
            // Convert YouTube Music URL to regular YouTube URL for better compatibility
            const regularYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Try to get basic info from YouTube API or fallback to basic info
            try {
                // If you have YouTube API key, use it here
                // const apiKey = process.env.YOUTUBE_API_KEY;
                // if (apiKey) {
                //     const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                //         params: {
                //             part: 'snippet,contentDetails',
                //             id: videoId,
                //             key: apiKey
                //         }
                //     });
                //     
                //     if (response.data.items && response.data.items.length > 0) {
                //         const video = response.data.items[0];
                //         return {
                //             videoId,
                //             title: video.snippet.title,
                //             thumbnail: video.snippet.thumbnails.maxresdefault?.url || video.snippet.thumbnails.high.url,
                //             duration: video.contentDetails.duration,
                //             url: regularYouTubeUrl,
                //             originalUrl: url
                //         };
                //     }
                // }
                
                // Fallback to basic info
                return {
                    videoId,
                    title: `YouTube Music - ${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    url: regularYouTubeUrl,
                    originalUrl: url,
                    channel: 'Unknown Channel'
                };
                
            } catch (apiError) {
                console.log('YouTube API not available, using basic info');
                return {
                    videoId,
                    title: `YouTube Music - ${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    url: regularYouTubeUrl,
                    originalUrl: url
                };
            }
            
        } catch (error) {
            throw new Error('URL YouTube tidak valid: ' + error.message);
        }
    }

    // Check if URL is valid
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Clean up old files
    cleanupOldFiles() {
        try {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);
                
                // Delete files older than 1 hour
                if (Date.now() - stats.mtime.getTime() > 3600000) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {
            console.error('Error cleaning up files:', error);
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // YouTube download (general purpose)
    async downloadYouTube(url) {
        try {
            const ytdl = require('@distube/ytdl-core');
            
            // Get video info
            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            
            // Check duration (max 10 minutes)
            const duration = parseInt(videoDetails.lengthSeconds);
            if (duration > 600) {
                throw new Error('Video terlalu panjang! Maksimal 10 menit.');
            }
            
            // Get best quality format
            const format = ytdl.chooseFormat(info.formats, { 
                quality: 'highestvideo',
                filter: 'videoandaudio'
            });
            
            if (!format) {
                throw new Error('Format video tidak tersedia');
            }
            
            // Download video
            const videoStream = ytdl(url, { 
                format: format,
                quality: 'highestvideo'
            });
            
            const chunks = [];
            for await (const chunk of videoStream) {
                chunks.push(chunk);
            }
            
            const buffer = Buffer.concat(chunks);
            
            // Save to temp file
            const filename = `youtube_${Date.now()}.${format.container || 'mp4'}`;
            const filepath = path.join(this.tempDir, filename);
            fs.writeFileSync(filepath, buffer);
            
            return {
                success: true,
                buffer: buffer,
                filepath: filepath,
                filename: filename,
                title: videoDetails.title,
                duration: this.formatDuration(duration),
                views: this.formatViews(videoDetails.viewCount),
                author: videoDetails.author.name,
                size: this.formatFileSize(buffer.length),
                contentType: format.mimeType || 'video/mp4'
            };
            
        } catch (error) {
            console.error('YouTube download error:', error);
            return {
                success: false,
                error: error.message || 'Gagal download YouTube'
            };
        }
    }

    // Format duration from seconds
    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Format view count
    formatViews(viewCount) {
        const count = parseInt(viewCount);
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        } else {
            return count.toString();
        }
    }

    // Check if ytdl-core is available
    isYtdlAvailable() {
        try {
            require('@distube/ytdl-core');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Validate YouTube URL more strictly (including YouTube Music)
    validateYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/music\.youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }

    // Get file size limit based on type
    getFileSizeLimit(type) {
        const limits = {
            'music': 50 * 1024 * 1024,   // 50MB for music
            'video': 100 * 1024 * 1024,  // 100MB for video
            'image': 10 * 1024 * 1024    // 10MB for image
        };
        return limits[type] || 25 * 1024 * 1024; // 25MB default
    }
}

module.exports = DownloadService;
