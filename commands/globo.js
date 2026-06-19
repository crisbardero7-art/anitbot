const { Jimp } = require('jimp');
const fs = require('fs');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ff = require('fluent-ffmpeg');
const path = require('path');

try {
    const ffmpegStatic = require('ffmpeg-static');
    ff.setFfmpegPath(ffmpegStatic);
} catch (e) {
    ff.setFfmpegPath('ffmpeg');
}

async function applyGloboEffect(buffer) {
    console.log('[GLOBO] Aplicando efecto globo v3...');
    const image = await Jimp.read(buffer);
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    console.log(`[GLOBO] Imagen: ${w}x${h}`);

    // La barra blanca cubre el 40% superior
    const bubbleBottom = Math.floor(h * 0.40);
    
    // Colita GRANDE - lado izquierdo recto, lado derecho diagonal
    const tailLeftX = Math.floor(w * 0.35);       // donde empieza la colita (izquierda)
    const tailRightX = Math.floor(w * 0.55);       // donde termina arriba (derecha)
    const tailTipX = Math.floor(w * 0.37);         // punta abajo (casi alineada con el lado izquierdo)
    const tailTipY = Math.floor(h * 0.58);         // la punta baja bastante
    const tailHeight = tailTipY - bubbleBottom;
    
    // Borde negro
    const border = Math.max(4, Math.floor(w * 0.01));

    image.scan(0, 0, w, h, function(x, y, idx) {
        let makeWhite = false;
        let makeBlack = false;

        if (y < bubbleBottom) {
            // Barra blanca superior
            makeWhite = true;
            
            // Borde negro inferior (excepto donde sale la colita)
            if (y >= bubbleBottom - border) {
                if (x < tailLeftX || x > tailRightX) {
                    makeBlack = true;
                    makeWhite = false;
                }
            }
        } else if (y >= bubbleBottom && y <= tailTipY) {
            // La colita
            const progress = (y - bubbleBottom) / tailHeight; // 0=arriba, 1=punta
            
            // Lado izquierdo: casi recto vertical (baja de tailLeftX a tailTipX)
            const edgeLeft = tailLeftX + (tailTipX - tailLeftX) * progress;
            // Lado derecho: diagonal pronunciada (baja de tailRightX a tailTipX)
            const edgeRight = tailRightX + (tailTipX - tailRightX) * progress;
            
            if (x >= edgeLeft && x <= edgeRight) {
                makeWhite = true;
                
                // Bordes negros
                if (x - edgeLeft < border) {
                    makeBlack = true;
                    makeWhite = false;
                }
                if (edgeRight - x < border) {
                    makeBlack = true;
                    makeWhite = false;
                }
                // Punta
                if (progress > 0.93) {
                    makeBlack = true;
                    makeWhite = false;
                }
            }
        }

        if (makeWhite) {
            this.bitmap.data[idx + 0] = 255;
            this.bitmap.data[idx + 1] = 255;
            this.bitmap.data[idx + 2] = 255;
            this.bitmap.data[idx + 3] = 255;
        } else if (makeBlack) {
            this.bitmap.data[idx + 0] = 0;
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
            this.bitmap.data[idx + 3] = 255;
        }
    });

    console.log('[GLOBO] Efecto aplicado correctamente');
    return await image.getBuffer('image/png');
}

// WebP a 512x512 para que el sticker se vea grande
async function globoToWebp(media) {
    console.log('[GLOBO] Convirtiendo a WebP 512x512...');
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.png`);

    fs.writeFileSync(tmpFileIn, media);

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut);
    });

    const buff = fs.readFileSync(tmpFileOut);
    fs.unlinkSync(tmpFileOut);
    fs.unlinkSync(tmpFileIn);
    console.log('[GLOBO] Conversión completada');
    return buff;
}

module.exports = { applyGloboEffect, globoToWebp };
