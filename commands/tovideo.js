const fs = require('fs');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const path = require('path');
const ff = require('fluent-ffmpeg');
const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');

// Usar ffmpeg-static si está instalado
try {
    const ffmpegStatic = require('ffmpeg-static');
    ff.setFfmpegPath(ffmpegStatic);
} catch (e) {
    ff.setFfmpegPath('ffmpeg');
}

function isAnimatedWebp(buffer) {
    return buffer.indexOf(Buffer.from('ANIM')) !== -1;
}

// Convertidor usando Ezgif API para stickers animados
async function webp2mp4File(filepath) {
    return new Promise((resolve, reject) => {
        const form = new FormData()
        form.append('new-image-url', '')
        form.append('new-image', fs.createReadStream(filepath))
        axios({
            method: 'post',
            url: 'https://ezgif.com/webp-to-mp4',
            data: form,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            }
        }).then(({ data }) => {
            const bodyFormThen = new FormData()
            const $ = cheerio.load(data)
            const file = $('input[name="file"]').attr('value')
            if (!file) return reject(new Error('No se pudo subir a ezgif'));
            bodyFormThen.append('file', file)
            bodyFormThen.append('convert', "Convert WebP to MP4!")
            axios({
                method: 'post',
                url: 'https://ezgif.com/webp-to-mp4/' + file,
                data: bodyFormThen,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${bodyFormThen._boundary}`
                }
            }).then(({ data }) => {
                const $ = cheerio.load(data)
                const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
                resolve(result)
            }).catch(reject)
        }).catch(reject)
    })
}

async function convertSticker(buffer) {
    const animated = isAnimatedWebp(buffer);
    const tmpIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    fs.writeFileSync(tmpIn, buffer);

    if (animated) {
        // Usa ezgif para convertir webp animado a mp4
        const videoUrl = await webp2mp4File(tmpIn);
        const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        fs.unlinkSync(tmpIn);
        return { type: 'video', buffer: Buffer.from(response.data) };
    } else {
        // Sticker estático
        const tmpOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.png`);
        await new Promise((resolve, reject) => {
            ff(tmpIn)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions(['-vframes', '1'])
                .save(tmpOut);
        });

        const resultBuf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        return { type: 'image', buffer: resultBuf };
    }
}

module.exports = { convertSticker };
