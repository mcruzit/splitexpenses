const db = require('../db');
const CalculadoraGastos = require('../services/calculator');
const { broadcastToGroup, sendPushNotificationToGroup } = require('../services/notificationService');

exports.createGroup = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre del grupo es requerido.' });
    }
    try {
        const result = await db.query(
            'INSERT INTO groups (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al crear el grupo.' });
    }
};

exports.getGroup = async (req, res) => {
    const { groupUuid } = req.params;
    try {
        const groupResult = await db.query('SELECT * FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const group = groupResult.rows[0];
        const peopleResult = await db.query('SELECT id, name FROM persons WHERE group_id = $1 ORDER BY name', [group.id]);
        const expensesResult = await db.query(
            `SELECT e.id, e.description, e.amount, e.person_id, p.name as pagador
             FROM expenses e
             JOIN persons p ON e.person_id = p.id
             WHERE e.group_id = $1
             ORDER BY e.id DESC`,
            [group.id]
        );
        group.people = peopleResult.rows;
        group.expenses = expensesResult.rows.map(e => ({ ...e, amount: parseFloat(e.amount) }));
        res.json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al obtener el grupo.' });
    }
};

exports.updateGroup = async (req, res) => {
    const { groupUuid } = req.params;
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

        const result = await db.query('UPDATE groups SET name = $1 WHERE uuid = $2 RETURNING *', [name, groupUuid]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }

        const updatedGroup = result.rows[0];
        const pushPayload = JSON.stringify({ title: `Grupo Actualizado`, body: `El nombre del grupo ha sido actualizado a "${updatedGroup.name}".`, data: { uuid: updatedGroup.uuid } });

        await sendPushNotificationToGroup(groupId, pushPayload);
        broadcastToGroup(updatedGroup.uuid, { type: 'GROUP_UPDATED', uuid: updatedGroup.uuid, reason: 'Group name updated' });

        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al actualizar el grupo.' });
    }
};

exports.deleteGroup = async (req, res) => {
    const { groupUuid } = req.params;
    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const groupId = groupResult.rows[0].id;

        const result = await db.query('DELETE FROM groups WHERE uuid = $1 RETURNING *', [groupUuid]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }

        const pushPayload = JSON.stringify({ title: `Grupo Eliminado`, body: `El grupo ${result.rows[0].name} ha sido eliminado.`, data: { uuid: result.rows[0].uuid } });

        await sendPushNotificationToGroup(groupId, pushPayload);
        broadcastToGroup(result.rows[0].uuid, { type: 'GROUP_UPDATED', uuid: result.rows[0].uuid, reason: 'Group deleted' });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Error del servidor al eliminar el grupo.' });
    }
};

exports.calculateDebts = async (req, res) => {
    const { groupUuid } = req.params;
    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const groupId = groupResult.rows[0].id;
        const personsResult = await db.query('SELECT name FROM persons WHERE group_id = $1', [groupId]);
        const persons = personsResult.rows.map(p => p.name);
        const expensesResult = await db.query(`SELECT e.description, e.amount, p.name as pagador FROM expenses e JOIN persons p ON e.person_id = p.id WHERE e.group_id = $1`, [groupId]);
        const expenses = expensesResult.rows.map(e => ({ descripcion: e.description, monto: parseFloat(e.amount), pagador: e.pagador }));
        const calculadora = new CalculadoraGastos();
        persons.forEach(p => calculadora.agregarPersona(p));
        expenses.forEach(g => calculadora.agregarGasto(g));
        const transacciones = calculadora.calcularDeudas();
        res.json(transacciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al calcular el balance.' });
    }
};