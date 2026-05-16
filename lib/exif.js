const fs = require('fs');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ff = require('fluent-ffmpeg');

// Intentar usar ffmpeg-static si existe (PC), si no, usar el del sistema (Termux)
try {
    const ffmpegStatic = require('ffmpeg-static');
    ff.setFfmpegPath(ffmpegStatic);
} catch (e) {
    ff.setFfmpegPath('ffmpeg');
}
const webp = require('node-webpmux');
const path = require('path');


async function imageToWebp(media) {
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);

    fs.writeFileSync(tmpFileIn, media);

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut);
    });

    const buff = fs.readFileSync(tmpFileOut);
    fs.unlinkSync(tmpFileOut);
    fs.unlinkSync(tmpFileIn);
    return buff;
}

async function videoToWebp(media) {
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);

    fs.writeFileSync(tmpFileIn, media);

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
                "-loop",
                "0",
                "-ss",
                "00:00:00",
                "-t",
                "00:00:05",
                "-preset",
                "default",
                "-an",
                "-vsync",
                "0"
            ])
            .toFormat("webp")
            .save(tmpFileOut);
    });

    const buff = fs.readFileSync(tmpFileOut);
    fs.unlinkSync(tmpFileOut);
    fs.unlinkSync(tmpFileIn);
    return buff;
}

async function writeExif(media, packname, author) {
    // Si no se envía packname ni autor, usamos string vacío, según lo pedido
    // El usuario especificó: "quiero q se guarde unicamente con el nombre q se le coloca al lado del comando nada de pack solo el nombre del autor"
    // packname = '', author = el texto ingresado.
    let wMedia = media;
    // Si es un buffer y ya es un webp o necesita conversión
    // Aquí asumiremos que "media" es ya un buffer WebP
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    fs.writeFileSync(tmpFileIn, wMedia);

    if (packname || author) {
        const img = new webp.Image();
        const json = { "sticker-pack-id": "anitbot", "sticker-pack-publisher": author || " ", "emojis": ["🎈"] };
        if (packname) json["sticker-pack-name"] = packname;
        
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        await img.load(tmpFileIn);
        fs.unlinkSync(tmpFileIn);
        img.exif = exif;
        await img.save(tmpFileOut);
        return fs.readFileSync(tmpFileOut);
    } else {
        const img = new webp.Image();
        const json = { "sticker-pack-id": "anitbot", "sticker-pack-publisher": " ", "emojis": ["🎈"] };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        await img.load(tmpFileIn);
        fs.unlinkSync(tmpFileIn);
        img.exif = exif;
        await img.save(tmpFileOut);
        return fs.readFileSync(tmpFileOut);
    }
}

module.exports = { imageToWebp, videoToWebp, writeExif };
