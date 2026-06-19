const fs = require('fs');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const path = require('path');
const ff = require('fluent-ffmpeg');

// Usar ffmpeg-static si está instalado (PC), si no el del sistema (Termux)
try {
    const ffmpegStatic = require('ffmpeg-static');
    ff.setFfmpegPath(ffmpegStatic);
} catch (e) {
    ff.setFfmpegPath('ffmpeg');
}

// Detecta si un WebP tiene múltiples frames (animado)
function isAnimatedWebp(buffer) {
    // Los WebP animados tienen el chunk "ANIM" en su estructura
    const str = buffer.toString('ascii', 0, Math.min(buffer.length, 200));
    return buffer.indexOf(Buffer.from('ANIM')) !== -1;
}

async function convertSticker(buffer) {
    const animated = isAnimatedWebp(buffer);
    const tmpIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    
    fs.writeFileSync(tmpIn, buffer);

    if (animated) {
        // Sticker animado -> convertir a MP4
        const tmpOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);
        
        await new Promise((resolve, reject) => {
            ff(tmpIn)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0',
                    '-pix_fmt', 'yuv420p',
                    '-c:v', 'libx264',
                    '-movflags', '+faststart'
                ])
                .toFormat('mp4')
                .save(tmpOut);
        });

        const resultBuf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        return { type: 'video', buffer: resultBuf };

    } else {
        // Sticker estático -> convertir a PNG
        const tmpOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.png`);
        
        await new Promise((resolve, reject) => {
            ff(tmpIn)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions(['-vframes', '1'])
                .toFormat('png')
                .save(tmpOut);
        });

        const resultBuf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        return { type: 'image', buffer: resultBuf };
    }
}

module.exports = { convertSticker };
