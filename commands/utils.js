const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

async function handleDiscord(sock, msg, reply) {
    await reply('👾 *Únete a nuestro servidor de Discord:*\n\nhttps://discord.gg/popped');
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
    const menu = `╭━━━ 🤖 *putitq de josh* 🤖 ━━━╮
┃ Hola, *${pushName}* 👋
┃
┣ 🎨 *STICKERS*
┃ ├ 🏷️ .s [nombre] - Crea un sticker
┃ └ 🥷 .wq [nombre] - Roba un sticker
┃
┣ 📥 *DESCARGAS*
┃ ├ 🎬 .vid [url] - Descarga videos
┃ └ 🎵 .aud [url] - Descarga audios
┃
┣ 🎉 *DIVERSIÓN*
┃ ├ 💘 .ship - Shipea a 2 personas
┃ ├ 😘 .kiss - Besa a alguien
┃ ├ 🌹 .pir - Te dice un piropo
┃ └ 💦 .cum - jeje
┃
┣ 👥 *GRUPOS*
┃ ├ 🔒 .cerrar - Solo admins hablan
┃ ├ 🔓 .abrir - Todos hablan
┃ ├ 🔗 .link - Obtén enlace del grupo
┃ ├ 👁️ .del on/off - Anti-Delete
┃ ├ 👑 .admin @user - Da admin
┃ ├ 🚫 .quitar @user - Quita admin
┃ ├ 👢 .kick @user - Expulsa al usuario
┃ ├ 📢 .n [texto] - Hidetag (menciona a todos)
┃ └ 💥 .spam [n] [texto] - Spamea un mensaje
┃
┣ 🛠️ *UTILIDADES*
┃ ├ 👻 .ver - Reenvía mensaje "ver 1 vez"
┃ ├ 👾 .dc - Nuestro Discord
┃ └ 📜 .menu - Muestra este menú
╰━━━━━━━━━━━━━━━━━━━━━╯`;

    await reply(menu);
}

module.exports = { handleDiscord, handleVer, handleMenu };
