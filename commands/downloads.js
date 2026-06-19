const axios = require('axios');
const https = require('https');

// Agente para ignorar errores de certificado SSL en APIs públicas
const agent = new https.Agent({  
  rejectUnauthorized: false
});

// Función para buscar una URL de descarga en cualquier parte del objeto JSON
function findDownloadUrl(obj) {
    if (!obj || typeof obj !== 'object') return null;
    
    // 1. Buscar en campos clave conocidos (Prioridad)
    const priorityKeys = ['url', 'video', 'no_watermark', 'play', 'download', 'link', 'mp4', 'nowm'];
    for (const key of priorityKeys) {
        if (typeof obj[key] === 'string' && obj[key].startsWith('http')) return obj[key];
        if (obj[key] && typeof obj[key] === 'object') {
            const res = findDownloadUrl(obj[key]);
            if (res) return res;
        }
    }

    // 2. Búsqueda recursiva general
    for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].startsWith('http') && 
           (obj[key].includes('video') || obj[key].includes('cdn') || obj[key].includes('googlevideo') || obj[key].includes('tiktokcdn'))) {
            return obj[key];
        }
        if (obj[key] && typeof obj[key] === 'object') {
            const res = findDownloadUrl(obj[key]);
            if (res) return res;
        }
    }
    return null;
}

async function getMediaUrl(url, isAudioOnly = false) {
    try {
        console.log(`[DEBUG] Intentando descargar: ${url} (Audio: ${isAudioOnly})`);
        
        // --- TIKTOK ---
        if (url.includes('tiktok.com')) {
            const providers = [
                { name: 'TikWM', url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}` },
                { name: 'Siputzx TikTok', url: `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}` },
                { name: 'Tiklydown', url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}` }
            ];
            
            for (const p of providers) {
                try {
                    const res = await axios.get(p.url, { httpsAgent: agent, timeout: 10000 });
                    const data = res.data.data || res.data.result || res.data;
                    
                    const downloadUrl = isAudioOnly ? (data.music || data.audio || data.music_info?.url) : findDownloadUrl(data);
                    
                    if (downloadUrl) return downloadUrl;
                    console.log(`[DEBUG] TikTok Provider ${p.name} falló. Estructura:`, JSON.stringify(data).slice(0, 100));
                } catch (e) { 
                    console.error(`[DEBUG] TikTok Provider ${p.name} error:`, e.message);
                }
            }
        }
        
        // --- YOUTUBE / OTROS ---
        const type = isAudioOnly ? 'ytmp3' : 'ytmp4';
        const ytProviders = [
            { name: 'Siputzx YouTube', url: `https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(url)}` },
            { name: 'Ryzendesu', url: `https://api.ryzendesu.vip/api/downloader/${type}?url=${encodeURIComponent(url)}` },
            { name: 'Agatz YouTube', url: `https://api.agatz.xyz/api/youtube?url=${encodeURIComponent(url)}` }
        ];

        for (const p of ytProviders) {
            try {
                const res = await axios.get(p.url, { httpsAgent: agent, timeout: 10000 });
                const data = res.data.data || res.data.result || res.data;
                
                const downloadUrl = findDownloadUrl(data);
                
                if (downloadUrl) return downloadUrl;
                console.log(`[DEBUG] YouTube Provider ${p.name} falló. Estructura:`, JSON.stringify(data).slice(0, 100));
            } catch (e) {
                console.error(`[DEBUG] YouTube Provider ${p.name} error:`, e.message);
            }
        }

        return null;
    } catch (error) {
        console.error('Error general en getMediaUrl:', error.message);
        return null;
    }
}







async function handleVideo(sock, msg, args, reply) {
    if (!args[0]) {
        return await reply('⚠️ Por favor, envía un enlace de YouTube o TikTok.\nEjemplo: `.vid https://youtu.be/...`');
    }

    const url = args[0];
    await reply('⏳ Procesando video, por favor espera...');

    const downloadUrl = await getMediaUrl(url, false);

    if (!downloadUrl) {
        return await reply('❌ Error al obtener el video. Verifica el enlace o intenta con otro.');
    }

    try {
        await sock.sendMessage(msg.key.remoteJid, {
            video: { url: downloadUrl },
            caption: '🎬 Aquí tienes tu video.'
        }, { quoted: msg });
    } catch (err) {
        console.error('Error enviando video:', err);
        await reply('❌ Error al enviar el video. Puede que sea muy pesado.');
    }
}

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Intentar usar ffmpeg-static si existe (PC), si no, usar el del sistema (Termux)
try {
    const ffmpegPath = require('ffmpeg-static');
    ffmpeg.setFfmpegPath(ffmpegPath);
} catch (e) {
    // En Termux o sistemas sin ffmpeg-static, usa el comando global
    ffmpeg.setFfmpegPath('ffmpeg');
}


async function handleAudio(sock, msg, args, reply) {
    if (!args[0]) {
        return await reply('⚠️ Por favor, envía un enlace de TikTok o YouTube.\nEjemplo: `.aud https://vm.tiktok.com/...`');
    }

    const url = args[0];
    await reply('⏳ Procesando y convirtiendo audio, por favor espera...');

    const downloadUrl = await getMediaUrl(url, true);

    if (!downloadUrl) {
        return await reply('❌ Error al obtener el audio. Verifica el enlace o intenta con otro.');
    }

    const tempInput = path.join(__dirname, `../temp_${Date.now()}`);
    const tempOutput = path.join(__dirname, `../temp_${Date.now()}.mp3`);

    try {
        // Descargar el archivo
        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream',
            httpsAgent: agent
        });

        const writer = fs.createWriteStream(tempInput);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Convertir a MP3 estándar usando FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(tempInput)
                .toFormat('mp3')
                .audioBitrate('128k')
                .on('end', resolve)
                .on('error', reject)
                .save(tempOutput);
        });

        const audioBuffer = fs.readFileSync(tempOutput);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: msg });

        // Limpiar archivos temporales
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

    } catch (err) {
        console.error('Error procesando audio:', err);
        await reply('❌ Error al procesar el audio. Intenta de nuevo.');
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    }
}


module.exports = { handleVideo, handleAudio };
