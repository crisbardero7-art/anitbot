const axios = require('axios');
const { Jimp, BlendMode } = require('jimp');
const { getMedia } = require('./stickers');

const piropos = [
    "Si la belleza fuera pecado, no tendrías perdón de Dios.",
    "¿De qué juguetería te escapaste, muñeca?",
    "Quisiera ser el aire que respiras para estar siempre dentro de ti.",
    "Si fueras un banco, te depositaría todo mi amor.",
    "Tus ojos son como dos luceros que iluminan mi camino.",
    "¿Tienes un mapa? Porque me he perdido en tus ojos.",
    "Si amarte fuera trabajo, no habría desempleo.",
    "Quisiera ser sol para calentar tus mañanas.",
    "Estás como para invitarte a dormir y no pegar un ojo en toda la noche.",
    "Si los besos fueran agua, te daría un océano."
];

async function handleShip(sock, msg, reply) {
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    if (!isGroup) return await reply('⚠️ Este comando solo se puede usar en grupos.');

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let user1, user2;

    if (mentioned.length >= 2) {
        user1 = mentioned[0];
        user2 = mentioned[1];
    } else if (mentioned.length === 1) {
        user1 = msg.key.participant;
        user2 = mentioned[0];
    } else {
        return await reply('⚠️ Menciona a dos personas para el ship, o a una persona para shipearla contigo.\nEjemplo: `.ship @usuario1 @usuario2`');
    }

    const percentage = Math.floor(Math.random() * 101);
    let comment = '';
    if (percentage < 20) comment = '💔 No hay mucha química, mejor como amigos.';
    else if (percentage < 50) comment = '🤔 Tienen potencial, pero requiere trabajo.';
    else if (percentage < 80) comment = '🥰 ¡Harían una linda pareja!';
    else comment = '🔥 ¡Son el uno para el otro, cásense ya!';

    const text = `💞 *MÁQUINA DEL AMOR* 💞\n\n@${user1.split('@')[0]} y @${user2.split('@')[0]}\nSu porcentaje de amor es: *${percentage}%*\n\n${comment}`;
    
    await sock.sendMessage(remoteJid, { text, mentions: [user1, user2] }, { quoted: msg });
}

async function handleKiss(sock, msg, reply) {
    const remoteJid = msg.key.remoteJid;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const sender = msg.key.participant || msg.key.remoteJid;

    let targetUser = '';
    if (mentioned.length > 0) {
        targetUser = mentioned[0];
    } else if (quotedUser) {
        targetUser = quotedUser;
    } else {
        return await reply('⚠️ Menciona o responde al mensaje de la persona a la que quieres besar.');
    }

    try {
        // Usar API de nekos.life para obtener un gif de beso aleatorio
        const res = await axios.get('https://nekos.life/api/v2/img/kiss');
        const imgUrl = res.data.url;

        const text = `😘 @${sender.split('@')[0]} le dio un beso a @${targetUser.split('@')[0]}!`;

        await sock.sendMessage(remoteJid, { 
            video: { url: imgUrl }, 
            gifPlayback: true,
            caption: text,
            mentions: [sender, targetUser]
        }, { quoted: msg });

    } catch (err) {
        console.error('Error en kiss:', err);
        // Fallback en caso de que la API falle
        await sock.sendMessage(remoteJid, { text: `😘 @${sender.split('@')[0]} le dio un beso a @${targetUser.split('@')[0]}!`, mentions: [sender, targetUser] }, { quoted: msg });
    }
}

async function handlePir(sock, msg, reply) {
    const randomIndex = Math.floor(Math.random() * piropos.length);
    const piropo = piropos[randomIndex];
    await reply(`💘 *Piropo:* \n${piropo}`);
}

async function handleCum(sock, msg, reply) {
    try {
        const media = await getMedia(msg, 'image');
        if (!media || media.type !== 'imageMessage') {
            return await reply('⚠️ Por favor, responde a una imagen con el comando .cum');
        }

        const img = await Jimp.read(media.buffer);
        const width = img.bitmap.width;
        const height = img.bitmap.height;

        let overlay;
        try {
            overlay = await Jimp.read('./cum.png');
        } catch (err) {
            return await reply('⚠️ No se encontró el archivo "cum.png" en la carpeta del bot. Por favor, asegúrate de guardarlo ahí.');
        }

        // Ajustar el tamaño del overlay al mismo tamaño que la imagen original
        overlay.resize({ w: width, h: height });
        
        img.composite(overlay, 0, 0, {
            mode: BlendMode.SRC_OVER,
            opacitySource: 0.95,
            opacityDest: 1
        });

        const finalBuffer = await img.getBuffer('image/jpeg');

        await sock.sendMessage(msg.key.remoteJid, { image: finalBuffer, caption: '💦' }, { quoted: msg });
        
    } catch (err) {
        console.error('Error en .cum:', err);
        await reply('❌ Ocurrió un error al procesar la imagen.');
    }
}

module.exports = { handleShip, handleKiss, handlePir, handleCum };
