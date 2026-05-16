const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./messageHandler');

const msgCache = new Map();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (msgCache.has(key.id)) {
        return msgCache.get(key.id).message;
      }
      return { conversation: 'Hola' };
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('↑↑ Escanea este código QR con tu WhatsApp ↑↑');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada debido a ', lastDisconnect.error, ', reconectando ', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('Conexión abierta');
    }
  });

  // Manejador principal de mensajes
  sock.ev.on('messages.upsert', async m => {
    if (m.type !== 'notify') return;
    const msg = m.messages[0];
    if (!msg.message) return;
    
    // Ignorar mensajes enviados por el propio bot (si se desea) o de status
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    // Guardar en caché para anti-delete
    if (msg.key && msg.key.id) {
      msgCache.set(msg.key.id, msg);
      // Limitar el tamaño de caché a 1000 mensajes
      if (msgCache.size > 1000) {
        const firstKey = msgCache.keys().next().value;
        msgCache.delete(firstKey);
      }
    }

    // Detectar si el mensaje entrante es en realidad una orden de borrado (Revoke)
    if (msg.message.protocolMessage && (msg.message.protocolMessage.type === 0 || msg.message.protocolMessage.type === 14)) {
      const deletedKey = msg.message.protocolMessage.key;
      await checkAntiDelete(deletedKey);
      return;
    }

    try {
      await handleMessage(sock, msg);
    } catch (err) {
      console.error('Error al manejar el mensaje:', err);
    }
  });

  async function checkAntiDelete(deletedKey) {
    if (!deletedKey || !deletedKey.id) return;
    try {
      if (!fs.existsSync('./database.json')) return;
      const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
      const remoteJid = deletedKey.remoteJid;
      const antiDeleteActivo = db.antiDelete?.[remoteJid];
      
      if (antiDeleteActivo) {
        const deletedMsg = msgCache.get(deletedKey.id);
        if (deletedMsg && deletedMsg.message) {
          const participant = deletedMsg.key.participant || deletedMsg.key.remoteJid;
          let replyText = `[ ⚠️ ANTI-DELETE ⚠️ ]\n`;
          replyText += `*Se detectó un mensaje borrado.*\n`;
          replyText += `*Autor:* @${participant.split('@')[0]}`;
          
          await sock.sendMessage(remoteJid, { text: replyText, mentions: [participant] });
          await sock.sendMessage(remoteJid, { forward: deletedMsg }, { quoted: deletedMsg });
        }
      }
    } catch (err) {
      console.error('Error en anti-delete:', err);
    }
  }

  sock.ev.on('messages.update', async updates => {
    for (const update of updates) {
      if (update.update.message?.protocolMessage?.type === 0 || update.update.message?.protocolMessage?.type === 14) {
        const deletedKey = update.update.message.protocolMessage.key;
        await checkAntiDelete(deletedKey);
      }
    }
  });

  sock.ev.on('messages.delete', async item => {
    if (item && item.keys) {
      for (const key of item.keys) {
        await checkAntiDelete(key);
      }
    }
  });

  sock.ev.on('message.delete', async item => {
    if (item && item.id) {
      await checkAntiDelete(item);
    }
  });

}

startBot();
