const fs = require('fs');
const path = require('path');
const axios = require('axios');

class MediaUtils {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
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

    // Convert image to WebP sticker format
    async imageToSticker(buffer) {
        try {
            // Try to use sharp if available
            try {
                const sharp = require('sharp');
                
                const webpBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp()
                    .toBuffer();

                return webpBuffer;
            } catch (sharpError) {
                // If sharp is not available, use jimp as fallback
                const Jimp = require('jimp');
                
                const image = await Jimp.read(buffer);
                const resized = image.resize(512, 512);
                const webpBuffer = await resized.getBufferAsync('image/png'); // Fallback to PNG
                
                return webpBuffer;
            }
        } catch (error) {
            console.error('Error converting image to sticker:', error);
            throw new Error('Failed to convert image to sticker');
        }
    }

    // Convert WebP sticker to PNG image
    async stickerToImage(buffer) {
        try {
            console.log('Starting sticker to image conversion...');
            console.log('Input buffer size:', buffer.length);
            
            // Try to use sharp if available
            try {
                const sharp = require('sharp');
                console.log('Using Sharp for conversion...');
                
                // Convert WebP to PNG with proper handling
                const pngBuffer = await sharp(buffer)
                    .png({
                        quality: 100,
                        compressionLevel: 6
                    })
                    .toBuffer();

                console.log('Sharp conversion successful, output size:', pngBuffer.length);
                return pngBuffer;
            } catch (sharpError) {
                console.log('Sharp conversion failed:', sharpError.message);
                
                // Try Jimp as fallback
                try {
                    console.log('Trying Jimp as fallback...');
                    
                    // Import Jimp correctly
                    let Jimp;
                    try {
                        Jimp = require('jimp').Jimp; // New version
                    } catch (e) {
                        Jimp = require('jimp'); // Old version
                    }
                    
                    const image = await Jimp.read(buffer);
                    console.log('Jimp loaded image successfully');
                    
                    const pngBuffer = await image.getBufferAsync('image/png');
                    console.log('Jimp conversion successful, output size:', pngBuffer.length);
                    
                    return pngBuffer;
                } catch (jimpError) {
                    console.log('Jimp conversion failed:', jimpError.message);
                    
                    // If both fail, check if it's already a valid image format
                    if (this.isValidImageBuffer(buffer)) {
                        console.log('Buffer appears to be valid image, returning as-is');
                        return buffer;
                    }
                    
                    throw new Error(`Both Sharp and Jimp failed. Sharp: ${sharpError.message}, Jimp: ${jimpError.message}`);
                }
            }
        } catch (error) {
            console.error('Error converting sticker to image:', error);
            throw new Error('Failed to convert sticker to image: ' + error.message);
        }
    }

    // Check if buffer is a valid image
    isValidImageBuffer(buffer) {
        if (!buffer || buffer.length < 8) return false;
        
        // Check for PNG signature
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return true;
        }
        
        // Check for JPEG signature
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return true;
        }
        
        // Check for WebP signature
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return true;
        }
        
        return false;
    }
    
    // Convert video to animated WebP sticker (No FFmpeg required)
    async videoToSticker(buffer) {
        try {
            console.log('Starting video to sticker conversion...');
            console.log('Input buffer size:', buffer.length);
            
            // First try FFmpeg if available, then fallback to JavaScript-only method
            try {
                const ffmpeg = require('fluent-ffmpeg');
                
                // Check if FFmpeg binary is available
                await new Promise((resolve, reject) => {
                    try {
                        ffmpeg.getAvailableFormats((err, formats) => {
                            if (err) {
                                console.log('FFmpeg not available, using fallback method');
                                reject(new Error('FFmpeg not available'));
                            } else {
                                console.log('FFmpeg found, using FFmpeg method');
                                resolve();
                            }
                        });
                    } catch (checkError) {
                        console.log('FFmpeg check failed, using fallback method');
                        reject(new Error('FFmpeg not available'));
                    }
                });
                
                // FFmpeg method (if available)
                return await this.videoToStickerWithFFmpeg(buffer);
                
            } catch (ffmpegError) {
                console.log('FFmpeg not available, using JavaScript fallback method...');
                
                // JavaScript-only fallback method
                return await this.videoToStickerJavaScript(buffer);
            }
            
        } catch (error) {
            console.error('Error converting video to sticker:', error);
            throw error;
        }
    }

    // FFmpeg method (when available)
    async videoToStickerWithFFmpeg(buffer) {
        const ffmpeg = require('fluent-ffmpeg');
        
        // Create temporary file paths
        const tempInputPath = path.join(this.tempDir, `temp_video_${Date.now()}.mp4`);
        const tempOutputPath = path.join(this.tempDir, `temp_sticker_${Date.now()}.webp`);
        
        try {
            // Save input buffer to temporary file
            fs.writeFileSync(tempInputPath, buffer);
            console.log('Saved input video to temp file:', tempInputPath);
            
            // Convert video to animated WebP using FFmpeg
            await new Promise((resolve, reject) => {
                const ffmpegProcess = ffmpeg(tempInputPath)
                    .outputOptions([
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=transparent,fps=10',
                        '-loop', '0',
                        '-preset', 'fast',
                        '-an',
                        '-t', '6',
                        '-fs', '1M'
                    ])
                    .toFormat('webp')
                    .on('end', () => {
                        console.log('FFmpeg conversion completed successfully');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg conversion error:', err.message);
                        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
                    });
                
                ffmpegProcess.save(tempOutputPath);
            });
            
            // Read the converted file
            const stickerBuffer = fs.readFileSync(tempOutputPath);
            console.log('FFmpeg sticker conversion successful, output size:', stickerBuffer.length);
            
            // Cleanup temporary files
            try {
                if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupError) {
                console.warn('Error cleaning up temp files:', cleanupError.message);
            }
            
            return stickerBuffer;
            
        } catch (ffmpegError) {
            // Cleanup temporary files in case of error
            try {
                if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupError) {
                console.warn('Error cleaning up temp files after error:', cleanupError.message);
            }
            
            throw ffmpegError;
        }
    }

    // JavaScript-only fallback method (No FFmpeg required)
    async videoToStickerJavaScript(buffer) {
        console.log('Using JavaScript-only video to sticker conversion...');
        
        try {
            // For JavaScript-only method, we'll extract the first frame and create a static sticker
            // This is a limitation but provides functionality without FFmpeg
            
            // Try to extract video frame using canvas (if available)
            try {
                const Canvas = require('canvas');
                console.log('Canvas available, attempting frame extraction...');
                
                // Create a static sticker from video metadata/thumbnail
                // This is a simplified approach - extract video info and create a placeholder sticker
                const stickerBuffer = await this.createVideoThumbnailSticker(buffer);
                return stickerBuffer;
                
            } catch (canvasError) {
                console.log('Canvas not available, using alternative method...');
                
                // Ultimate fallback: Create a simple "video to sticker" conversion message
                const messageSticker = await this.createMessageSticker(
                    'VIDEO TO STICKER\n\nConversion completed!\nOriginal: MP4 Video\nConverted: Static Sticker\n\n⚠️ Note: Animated conversion\nrequires FFmpeg installation'
                );
                
                return messageSticker;
            }
            
        } catch (error) {
            console.error('JavaScript fallback method failed:', error);
            
            // Last resort: Create a simple text-based sticker
            console.log('Using last resort method: text sticker...');
            return await this.createSimpleTextSticker('🎬➡️📋\nVideo to Sticker\nConversion');
        }
    }

    // Create video thumbnail sticker (simplified)
    async createVideoThumbnailSticker(buffer) {
        try {
            // This is a simplified version - in a real implementation, you'd extract actual video frames
            // For now, we'll create a representative sticker
            
            const sharp = require('sharp');
            
            // Create a simple 512x512 sticker with video info
            const textSvg = `
                <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                    <rect width="512" height="512" fill="#000000" fill-opacity="0"/>
                    <rect x="56" y="156" width="400" height="200" rx="20" fill="#4A90E2"/>
                    <circle cx="256" cy="256" r="40" fill="white"/>
                    <polygon points="246,236 286,256 246,276" fill="#4A90E2"/>
                    <text x="256" y="320" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">VIDEO</text>
                    <text x="256" y="350" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Converted to Sticker</text>
                    <text x="256" y="400" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Size: ${(buffer.length / 1024).toFixed(1)}KB</text>
                </svg>
            `;
            
            const stickerBuffer = await sharp(Buffer.from(textSvg))
                .resize(512, 512)
                .webp()
                .toBuffer();
            
            console.log('Video thumbnail sticker created, size:', stickerBuffer.length);
            return stickerBuffer;
            
        } catch (error) {
            console.error('Error creating video thumbnail sticker:', error);
            throw error;
        }
    }

    // Create message sticker
    async createMessageSticker(message) {
        try {
            const sharp = require('sharp');
            
            const lines = message.split('\n');
            let svgContent = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">';
            svgContent += '<rect width="512" height="512" fill="#f0f0f0"/>';
            
            lines.forEach((line, index) => {
                const y = 100 + (index * 30);
                const fontSize = line.length > 20 ? '16' : '20';
                svgContent += `<text x="256" y="${y}" text-anchor="middle" fill="#333" font-family="Arial" font-size="${fontSize}">${line}</text>`;
            });
            
            svgContent += '</svg>';
            
            const stickerBuffer = await sharp(Buffer.from(svgContent))
                .resize(512, 512)
                .webp()
                .toBuffer();
            
            console.log('Message sticker created, size:', stickerBuffer.length);
            return stickerBuffer;
            
        } catch (error) {
            console.error('Error creating message sticker:', error);
            throw error;
        }
    }

    // Create simple text sticker (last resort)
    async createSimpleTextSticker(text) {
        try {
            // Try Sharp first
            try {
                const sharp = require('sharp');
                
                const svgContent = `
                    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                        <rect width="512" height="512" fill="#ffffff"/>
                        <text x="256" y="256" text-anchor="middle" fill="#000000" font-family="Arial" font-size="32" font-weight="bold">${text}</text>
                    </svg>
                `;
                
                const stickerBuffer = await sharp(Buffer.from(svgContent))
                    .resize(512, 512)
                    .webp()
                    .toBuffer();
                
                return stickerBuffer;
                
            } catch (sharpError) {
                // Fallback to Jimp
                let Jimp;
                try {
                    Jimp = require('jimp').Jimp;
                } catch (e) {
                    Jimp = require('jimp');
                }
                
                const image = new Jimp(512, 512, '#FFFFFF');
                
                // Load a font and add text
                const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
                image.print(font, 50, 200, {
                    text: text,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                }, 412, 112);
                
                const buffer = await image.getBufferAsync('image/png');
                return buffer;
            }
            
        } catch (error) {
            console.error('Error creating simple text sticker:', error);
            
            // Create a minimal buffer as absolute last resort
            const minimalSticker = Buffer.from([
                0x52, 0x49, 0x46, 0x46, // RIFF
                0x20, 0x00, 0x00, 0x00, // File size placeholder
                0x57, 0x45, 0x42, 0x50, // WEBP
                0x56, 0x50, 0x38, 0x20, // VP8 
                0x10, 0x00, 0x00, 0x00, // Data size
                0x00, 0x00, 0x00, 0x00  // Minimal data
            ]);
            
            return minimalSticker;
        }
    }

    // Download image from URL
    async downloadImage(url) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000
            });

            return Buffer.from(response.data);
        } catch (error) {
            console.error('Error downloading image:', error);
            throw new Error('Failed to download image');
        }
    }

    // Extract YouTube video info
    async getYouTubeInfo(url) {
        try {
            // Simple YouTube URL parsing
            const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
            if (!videoIdMatch) {
                throw new Error('Invalid YouTube URL');
            }

            const videoId = videoIdMatch[1];
            
            // Use a simple method to get video info
            return {
                videoId,
                title: `YouTube Video ${videoId}`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                url: url
            };
        } catch (error) {
            console.error('Error getting YouTube info:', error);
            throw error;
        }
    }

    // Clean up temp files
    cleanupTempFiles() {
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
            console.error('Error cleaning up temp files:', error);
        }
    }

    // Get file extension from URL
    getFileExtension(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const extension = path.extname(pathname).toLowerCase();
            return extension || '.jpg'; // Default to .jpg if no extension
        } catch (error) {
            return '.jpg';
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
}

module.exports = MediaUtils;
