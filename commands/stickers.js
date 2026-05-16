const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { imageToWebp, videoToWebp, writeExif } = require('../lib/exif');

async function getMedia(msg, type) {
  // Manejar el caso normal o cuando se responde a un mensaje (quoted)
  const isQuoted = msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.quotedMessage;
  let targetMessage = isQuoted ? msg.message.extendedTextMessage.contextInfo.quotedMessage : msg.message;

  // Extraer el tipo del quoted message
  let targetType = Object.keys(targetMessage)[0];
  if (targetType === 'conversation' || targetType === 'extendedTextMessage') {
      return null;
  }
  
  // Fake wrap para downloadMediaMessage
  const fakeMsg = {
    key: msg.key,
    message: targetMessage
  };

  const buffer = await downloadMediaMessage(
    fakeMsg,
    'buffer',
    {},
    { 
        reuploadRequest: sock => sock.updateMediaMessage(fakeMsg)
    }
  );

  return { buffer, type: targetType };
}

async function handleSticker(sock, msg, type, args) {
    const authorName = args || '';
    const remoteJid = msg.key.remoteJid;
    
    try {
        const media = await getMedia(msg, type);
        if (!media) {
            return await sock.sendMessage(remoteJid, { text: 'Por favor, responde a una imagen o video, o envía una imagen con el comando.' }, { quoted: msg });
        }

        let webpBuffer;
        if (media.type === 'imageMessage') {
            webpBuffer = await imageToWebp(media.buffer);
        } else if (media.type === 'videoMessage') {
            webpBuffer = await videoToWebp(media.buffer);
        } else {
            return await sock.sendMessage(remoteJid, { text: 'Formato no soportado para stickers.' }, { quoted: msg });
        }

        // Aplicar el nombre al autor y dejar el paquete en blanco
        const stickerBuf = await writeExif(webpBuffer, '', authorName);

        await sock.sendMessage(remoteJid, { sticker: stickerBuf }, { quoted: msg });

    } catch (err) {
        console.error('Error creando sticker:', err);
        await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al crear el sticker.' }, { quoted: msg });
    }
}

async function handleSteal(sock, msg, type, args) {
    const authorName = args || '';
    const remoteJid = msg.key.remoteJid;

    try {
        const media = await getMedia(msg, type);
        if (!media || media.type !== 'stickerMessage') {
            return await sock.sendMessage(remoteJid, { text: 'Por favor, responde a un sticker con el comando .wq' }, { quoted: msg });
        }

        // Aplicar el nombre al autor y dejar el paquete en blanco
        const stickerBuf = await writeExif(media.buffer, '', authorName);

        await sock.sendMessage(remoteJid, { sticker: stickerBuf }, { quoted: msg });

    } catch (err) {
        console.error('Error robando sticker:', err);
        await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al robar el sticker.' }, { quoted: msg });
    }
}

module.exports = { handleSticker, handleSteal, getMedia };
