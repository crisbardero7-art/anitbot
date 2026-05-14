const fs = require('fs');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

// Handlers importados
const { handleSticker, handleSteal } = require('./commands/stickers');
const { handleVideo, handleAudio } = require('./commands/downloads');
const { handleShip, handleKiss, handlePir, handleCum } = require('./commands/fun');
const { handleGroupOptions, handleSpam } = require('./commands/group');
const { handleDiscord, handleVer, handleMenu } = require('./commands/utils');

async function handleMessage(sock, msg, store) {
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

  // Utils para simplificar respuestas
  const reply = (text) => sock.sendMessage(remoteJid, { text }, { quoted: msg });

  console.log(`[COMANDO] ${command} ejecutado por ${pushName}`);

  try {
    switch (command) {
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
      case 'cerrar':
      case 'abrir':
      case 'link':
      case 'del':
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
