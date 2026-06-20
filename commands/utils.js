const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

async function handleDiscord(sock, msg, reply) {
    await reply('👾 *Únete a nuestro servidor de Discord:*\n\nhttps://discord.gg/heartbreak');
}

async function handleVer(sock, msg, reply) {
    const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!isQuoted) {
        return await reply('⚠️ Por favor, responde a un mensaje de "ver una vez" usando el comando `.ver`.');
    }

    const viewOnceWrapper = isQuoted.viewOnceMessage || isQuoted.viewOnceMessageV2 || isQuoted.viewOnceMessageV2Extension;
    let viewOnceMsg;

    if (viewOnceWrapper) {
        viewOnceMsg = viewOnceWrapper.message;
    } else if (isQuoted.imageMessage?.viewOnce || isQuoted.videoMessage?.viewOnce || isQuoted.audioMessage?.viewOnce) {
        // A veces no viene envuelto, sino con la propiedad viewOnce: true
        viewOnceMsg = isQuoted;
    }

    if (!viewOnceMsg) {
        return await reply('⚠️ El mensaje al que respondiste no es de "ver una vez".');
    }

    const mediaType = Object.keys(viewOnceMsg)[0]; // imageMessage o videoMessage o audioMessage

    if (mediaType !== 'imageMessage' && mediaType !== 'videoMessage' && mediaType !== 'audioMessage') {
        return await reply('⚠️ Este tipo de mensaje de "ver una vez" no está soportado.');
    }

    try {
        await reply('⏳ Obteniendo el contenido de "ver una vez"...');

        // Fake wrap para la descarga
        const fakeMsg = {
            key: msg.message.extendedTextMessage.contextInfo,
            message: viewOnceMsg
        };

        const buffer = await downloadMediaMessage(
            fakeMsg,
            'buffer',
            {},
            {
                reuploadRequest: sock => sock.updateMediaMessage(fakeMsg)
            }
        );

        const caption = viewOnceMsg[mediaType].caption || '';

        // Reenviar el medio de forma visible
        if (mediaType === 'imageMessage') {
            await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption: `📸 *Mensaje de ver una vez (Imagen)*\n\n${caption}` }, { quoted: msg });
        } else if (mediaType === 'videoMessage') {
            await sock.sendMessage(msg.key.remoteJid, { video: buffer, caption: `🎥 *Mensaje de ver una vez (Video)*\n\n${caption}` }, { quoted: msg });
        } else if (mediaType === 'audioMessage') {
            // Nota de voz de ver una vez
            await sock.sendMessage(msg.key.remoteJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
        }

    } catch (err) {
        console.error('Error procesando .ver:', err);
        await reply('❌ No se pudo recuperar el mensaje de "ver una vez".');
    }
}

async function handleMenu(sock, msg, reply) {
    const pushName = msg.pushName || 'Usuario';

    const menu = `👋 Hola, *${pushName}*

⚙️ *Administración*

.cerrar — Cierra el grupo, solo admins hablan
.abrir — Abre el grupo, todos pueden hablar
.link — Obtén el enlace del grupo
.admin @user — Da admin a un usuario
.quitar @user — Quita admin a un usuario
.kick @user — Expulsa a un usuario del grupo
.del on/off — Activa/desactiva el Anti-Delete
.n [texto] — Hidetag, menciona a todos
.spam [n] [texto] — Envía un mensaje varias veces

🎨 *Stickers*

.s [nombre] — Convierte imagen/video a sticker
.wq [nombre] — Roba un sticker
.txs [texto] — Crea un sticker estilo brat

🎬 *Videos y Medios*

.vid [url] — Descarga un video
.aud [url] — Descarga un audio
.cimg — Convierte un sticker a imagen o video

🎉 *Diversión*

.ship — Shipea a dos personas del grupo
.kiss — Besa a alguien del grupo
.pir — Te dice un piropo
.cum — jeje

🛠️ *Utilidades*

.ver — Recupera un mensaje de "ver una vez"
.dc — Enlace de nuestro Discord
.menu — Muestra este menú`;

    await reply(menu);
}

module.exports = { handleDiscord, handleVer, handleMenu };
