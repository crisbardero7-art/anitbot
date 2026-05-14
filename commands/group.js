const fs = require('fs');

async function checkAdmin(sock, remoteJid, sender) {
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const participants = groupMetadata.participants;
    const admin = participants.find(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    return !!admin;
}

async function checkBotAdmin(sock, remoteJid) {
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const participants = groupMetadata.participants;
    const botAdmin = participants.find(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    return !!botAdmin;
}

async function handleGroupOptions(sock, msg, command, args, isGroup, reply) {
    if (!isGroup) return await reply('⚠️ Este comando solo se puede usar en grupos.');

    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant;

    // Verificar si el que envió el comando es admin
    const isAdmin = await checkAdmin(sock, remoteJid, sender);
    if (!isAdmin) {
        return await reply('⚠️ Este comando es solo para administradores del grupo.');
    }

    // Verificar si el bot es admin (necesario para cerrar, abrir, y obtener link)
    if (['cerrar', 'abrir', 'link'].includes(command)) {
        const botIsAdmin = await checkBotAdmin(sock, remoteJid);
        if (!botIsAdmin) {
            return await reply('⚠️ Necesito ser administrador del grupo para ejecutar esta acción.');
        }
    }

    try {
        switch (command) {
            case 'cerrar':
                await sock.groupSettingUpdate(remoteJid, 'announcement');
                await reply('🔒 El grupo ha sido cerrado. Solo los administradores pueden enviar mensajes.');
                break;
            case 'abrir':
                await sock.groupSettingUpdate(remoteJid, 'not_announcement');
                await reply('🔓 El grupo ha sido abierto. Todos los participantes pueden enviar mensajes.');
                break;
            case 'link':
                const code = await sock.groupInviteCode(remoteJid);
                await reply(`🔗 *Enlace del grupo:*\nhttps://chat.whatsapp.com/${code}`);
                break;
            case 'del':
                if (!args[0]) {
                    return await reply('⚠️ Usa `.del on` para encender o `.del off` para apagar el anti-delete.');
                }
                const status = args[0].toLowerCase();
                if (status !== 'on' && status !== 'off') {
                    return await reply('⚠️ Opción inválida. Usa `on` o `off`.');
                }

                let db = { antiDelete: {} };
                if (fs.existsSync('./database.json')) {
                    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
                }

                if (status === 'on') {
                    db.antiDelete[remoteJid] = true;
                    await reply('✅ *Anti-Delete activado.* Reenviaré los mensajes que sean borrados.');
                } else {
                    db.antiDelete[remoteJid] = false;
                    await reply('❌ *Anti-Delete desactivado.* Ya no reenviaré los mensajes borrados.');
                }

                fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
                break;
        }
    } catch (err) {
        console.error(`Error en comando de grupo (${command}):`, err);
        await reply('❌ Ocurrió un error al ejecutar la acción.');
    }
}

module.exports = { handleGroupOptions };
