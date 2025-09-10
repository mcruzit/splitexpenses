const db = require('../db');
const { broadcastToGroup, sendPushNotificationToGroup } = require('../services/notificationService');

exports.addPersonToGroup = async (req, res) => {
    const { groupUuid } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre de la persona es requerido.' });
    }
    try {
        const groupResult = await db.query('SELECT id, name FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const { id: groupId, name: groupName } = groupResult.rows[0];
        const result = await db.query('INSERT INTO persons (group_id, name) VALUES ($1, $2) RETURNING *', [groupId, name]);
        const pushPayload = JSON.stringify({ title: `Grupo: ${groupName}`, body: `${name} se ha unido al grupo.`, data: { uuid: groupUuid } });
        const excludeEndpoint = req.headers['x-client-endpoint'];
        await sendPushNotificationToGroup(groupId, pushPayload, excludeEndpoint);
        broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'Person added' });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Una persona con este nombre ya existe en el grupo.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al añadir la persona.' });
    }
};

exports.updatePerson = async (req, res) => {
    const { groupUuid, personId } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido.' });
    }

    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const groupId = groupResult.rows[0].id;

        const result = await db.query(
            `UPDATE persons p SET name = $1
             FROM groups g
             WHERE p.id = $2 AND p.group_id = g.id AND g.uuid = $3
             RETURNING p.*, g.name as group_name`,
            [name, personId, groupUuid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Persona no encontrada en el grupo especificado.' });
        }

        const updatedPerson = result.rows[0];
        const groupName = updatedPerson.group_name;

        const pushPayload = JSON.stringify({ title: `Grupo: ${groupName}`, body: `El nombre de una persona ha sido actualizado a "${updatedPerson.name}".`, data: { uuid: groupUuid } });

        const excludeEndpoint = req.headers['x-client-endpoint'];
        await sendPushNotificationToGroup(groupId, pushPayload, excludeEndpoint);
        broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'Person updated' });
        
        delete updatedPerson.group_name; // Limpiar el objeto de respuesta
        res.json(updatedPerson);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe una persona con ese nombre en el grupo.' });
        }
        res.status(500).json({ error: 'Error del servidor al actualizar la persona.' });
    }
};

exports.deletePerson = async (req, res) => {
    const { groupUuid, personId } = req.params;
    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const groupId = groupResult.rows[0].id;

        const expenseCheck = await db.query('SELECT id FROM expenses WHERE person_id = $1 LIMIT 1', [personId]);
        if (expenseCheck.rows.length > 0) {
            return res.status(409).json({ error: 'No se puede eliminar a una persona con gastos registrados. Elimina sus gastos primero.' });
        }
        const personGroupCheck = await db.query('SELECT p.id FROM persons p JOIN groups g ON p.group_id = g.id WHERE p.id = $1 AND g.uuid = $2', [personId, groupUuid]);
        if (personGroupCheck.rows.length === 0) {
            return res.status(404).json({ error: 'La persona no pertenece al grupo especificado o no existe.' });
        }
        await db.query('DELETE FROM persons WHERE id = $1', [personId]);
        const groupNameResult = await db.query('SELECT name FROM groups WHERE uuid = $1', [groupUuid]);
        const groupName = groupNameResult.rows[0].name;
        const pushPayload = JSON.stringify({ title: `Grupo: ${groupName}`, body: `Una persona ha sido eliminada del grupo.`, data: { uuid: groupUuid } });
        const excludeEndpoint = req.headers['x-client-endpoint'];
        await sendPushNotificationToGroup(groupId, pushPayload, excludeEndpoint);
        broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'Person deleted' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al eliminar la persona.' });
    }
};