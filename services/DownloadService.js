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
            const videoInfo = await this.getYouTubeInfo(url);
            
            // Enhanced mock response for YouTube Music specifically
            throw new Error(`
🎵 *YouTube Music Downloader*

📱 *Fitur dalam pengembangan...*

Untuk mengaktifkan fitur ini diperlukan:
• Library ytdl-core atau yt-dlp
• FFmpeg untuk konversi MP3
• Server dengan storage memadai

💡 *Alternatif sementara:*
• Gunakan website converter: ytmp3.cc
• Copy link: ${url}

🔧 *Progress:* 75% - Coming Soon!
            `.trim());

        } catch (error) {
            console.error('Error downloading YouTube music:', error);
            
            // If it's our custom error, throw as is
            if (error.message.includes('YouTube Music Downloader')) {
                throw error;
            }
            
            throw new Error('Gagal download musik: ' + error.message);
        }
    }

    // Download audio from YouTube
    async downloadYouTubeAudio(url) {
        try {
            const videoInfo = await this.getYouTubeInfo(url);
            
            // For now, provide a mock response with proper error message
            // In production, you would install ytdl-core: npm install ytdl-core
            // and implement real YouTube download functionality
            
            throw new Error(`
📱 *Fitur Download YouTube Audio*

Untuk mengaktifkan fitur ini, diperlukan:
• Install library ytdl-core
• Konfigurasi server tambahan
• Pengaturan proxy (opsional)

💡 *Alternatif sementara:*
• Gunakan website converter online
• Copy link: ${url}

🔧 *Status:* Dalam pengembangan
            `.trim());

        } catch (error) {
            console.error('Error downloading YouTube audio:', error);
            
            // If it's our custom error, throw as is
            if (error.message.includes('Fitur Download YouTube Audio')) {
                throw error;
            }
            
            throw new Error('Gagal download audio: ' + error.message);
        }
    }

    // Download video from YouTube
    async downloadYouTubeVideo(url) {
        try {
            const videoInfo = await this.getYouTubeInfo(url);
            
            throw new Error(`
📹 *Fitur Download YouTube Video*

Untuk mengaktifkan fitur ini, diperlukan:
• Install library ytdl-core
• Server dengan bandwidth tinggi
• Storage yang cukup besar

💡 *Alternatif sementara:*
• Gunakan website converter online
• Copy link: ${url}

🔧 *Status:* Dalam pengembangan
            `.trim());

        } catch (error) {
            console.error('Error downloading YouTube video:', error);
            
            // If it's our custom error, throw as is
            if (error.message.includes('Fitur Download YouTube Video')) {
                throw error;
            }
            
            throw new Error('Gagal download video: ' + error.message);
        }
    }

    // Get YouTube video info
    async getYouTubeInfo(url) {
        try {
            // Enhanced regex for YouTube URLs
            const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
            if (!videoIdMatch) {
                throw new Error('URL YouTube tidak valid');
            }

            const videoId = videoIdMatch[1];
            
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
                //             url: url
                //         };
                //     }
                // }
                
                // Fallback to basic info
                return {
                    videoId,
                    title: `YouTube Video - ${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    url: url,
                    channel: 'Unknown Channel'
                };
                
            } catch (apiError) {
                console.log('YouTube API not available, using basic info');
                return {
                    videoId,
                    title: `YouTube Video - ${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    url: url
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

    // Check if URL is YouTube
    isYouTubeUrl(url) {
        return /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)/.test(url);
    }

    // Validate image URL
    isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
    }

    // Download from direct URL
    async downloadFromDirectUrl(url, type = 'file') {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            
            let extension = '.bin';
            if (type === 'image') {
                extension = this.getImageExtension(contentType);
            } else if (type === 'audio') {
                extension = contentType.includes('audio/mp3') ? '.mp3' : 
                           contentType.includes('audio/mp4') ? '.mp4' : 
                           contentType.includes('audio/wav') ? '.wav' : '.mp3';
            }
            
            const filename = `${type}_${Date.now()}${extension}`;
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
            throw new Error(`Gagal download ${type}: ` + error.message);
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

    // YouTube download
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
            
            return {
                success: true,
                buffer: buffer,
                title: videoDetails.title,
                duration: this.formatDuration(duration),
                views: this.formatViews(videoDetails.viewCount),
                author: videoDetails.author.name,
                size: this.formatFileSize(buffer.length)
            };
            
        } catch (error) {
            console.error('YouTube download error:', error);
            return {
                success: false,
                error: error.message || 'Gagal download YouTube'
            };
        }
    }

    // Instagram download
    async downloadInstagram(url) {
        try {
            const { instagramdl } = require('instagram-url-direct');
            
            const result = await instagramdl(url);
            
            if (!result || result.length === 0) {
                throw new Error('Media tidak ditemukan');
            }
            
            const media = result[0];
            const downloadUrl = media.download_link;
            
            // Download media
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
                }
            });
            
            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || '';
            const isVideo = contentType.includes('video') || downloadUrl.includes('.mp4');
            
            return {
                success: true,
                buffer: buffer,
                type: isVideo ? 'video' : 'image',
                caption: media.caption || '',
                size: this.formatFileSize(buffer.length)
            };
            
        } catch (error) {
            console.error('Instagram download error:', error);
            return {
                success: false,
                error: error.message || 'Gagal download Instagram'
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
}

module.exports = DownloadService;
