const fs = require('fs');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

// Handlers importados
const { handleSticker, handleSteal } = require('./commands/stickers');
const { handleVideo, handleAudio } = require('./commands/downloads');
const { handleShip, handleKiss, handlePir, handleCum } = require('./commands/fun');
const { handleGroupOptions, handleSpam, handleHidetag, checkAdmin } = require('./commands/group');
const { handleDiscord, handleVer, handleMenu } = require('./commands/utils');

async function handleMessage(sock, msg, store) {
  const owners = ['19546440982@s.whatsapp.net', '195005020926199@s.whatsapp.net']; // Números autorizados


  // Extraer el texto del mensaje dependiendo de cómo venga empacado

  const type = getContentType(msg.message);
  let body = '';
  if (type === 'conversation') {
    body = msg.message.conversation;
  } else if (type === 'imageMessage') {
    body = msg.message.imageMessage.caption || '';
  } else if (type === 'videoMessage') {
    body = msg.message.videoMessage.caption || '';
  } else if (type === 'extendedTextMessage') {
    body = msg.message.extendedTextMessage.text || '';
  }

  // Detectar comando
  const isCmd = body.startsWith('.');
  if (!isCmd) return;

  const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();
  const args = body.trim().split(/ +/).slice(1);
  const q = args.join(' ');

  const remoteJid = msg.key.remoteJid;
  const isGroup = remoteJid.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
  const pushName = msg.pushName || 'Usuario';

  // Cargar base de datos para verificar activación y anti-delete
  let db = { antiDelete: {}, activated: {} };
  if (fs.existsSync('./database.json')) {
    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  }

  // Utils para simplificar respuestas
  const reply = (text) => sock.sendMessage(remoteJid, { text }, { quoted: msg });

  // Sistema de activación secreta para grupos
  if (isGroup && !db.activated?.[remoteJid] && command !== 'activebot') {
    return; // Ignorar comandos si el grupo no está activado
  }

  try {
    switch (command) {
      case 'activebot':
        if (!isGroup) return;
        
        // Depuración: Ver quién intenta activar
        console.log(`[DEBUG] Intento de activación por: ${sender}`);
        
        // Solo el dueño puede activar (comprobando si el ID coincide con la lista)
        const isOwner = owners.some(o => sender.includes(o.split('@')[0]));
        if (!isOwner) return; 


        if (db.activated?.[remoteJid]) return await reply('✅ El bot ya está activo en este grupo.');



        
        if (!db.activated) db.activated = {};
        db.activated[remoteJid] = true;
        fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
        await reply('🔓 *¡BOT ACTIVADO!* Ahora responderé a todos los comandos en este grupo.');
        break;
      case 's':

        await handleSticker(sock, msg, type, q);
        break;
      case 'wq':
        await handleSteal(sock, msg, type, q);
        break;
      case 'vid':
        await handleVideo(sock, msg, args, reply);
        break;
      case 'aud':
        await handleAudio(sock, msg, args, reply);
        break;
      case 'ship':
        await handleShip(sock, msg, reply);
        break;
      case 'kiss':
        await handleKiss(sock, msg, reply);
        break;
      case 'pir':
        await handlePir(sock, msg, reply);
        break;
      case 'cum':
        await handleCum(sock, msg, reply);
        break;
      case 'dc':
        await handleDiscord(sock, msg, reply);
        break;
      case 'spam':
        await handleSpam(sock, msg, args, reply);
        break;
      case 'n':
        await handleHidetag(sock, msg, args, reply);
        break;
      case 'cerrar':
      case 'abrir':
      case 'link':
      case 'del':
      case 'admin':
      case 'quitar':
      case 'kick':
        await handleGroupOptions(sock, msg, command, args, isGroup, reply);
        break;

      case 'ver':
        await handleVer(sock, msg, reply);
        break;
      case 'menu':
        await handleMenu(sock, msg, reply);
        break;
      default:
        // Comando no reconocido
        break;
    }
  } catch (error) {
    console.error(`Error ejecutando comando ${command}:`, error);
    await reply('❌ Ocurrió un error al ejecutar el comando.');
  }
}

module.exports = { handleMessage };
