const db = require('../db');
const { broadcastToGroup, sendPushNotificationToGroup } = require('../services/notificationService');

exports.addExpenseToGroup = async (req, res) => {
    const { groupUuid } = req.params;
    const { description, amount, person_id } = req.body;
    if (!description || !amount || !person_id) {
        return res.status(400).json({ error: 'Descripción, monto y pagador son requeridos.' });
    }
    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        const groupId = groupResult.rows[0].id;

        const expenseResult = await db.query('INSERT INTO expenses (group_id, person_id, description, amount) VALUES ($1, $2, $3, $4) RETURNING *', [groupId, person_id, description, amount]);

        const personName = await db.query('SELECT name FROM persons WHERE id = $1', [person_id]);
        const personNameValue = personName.rows[0].name;

        const pushPayload = JSON.stringify({ title: `Nuevo Gasto Añadido`, body: `Se ha añadido un nuevo gasto: "${description}".`, data: { uuid: groupUuid } });

        const excludeEndpoint = req.headers['x-client-endpoint'];
        await sendPushNotificationToGroup(groupId, pushPayload, excludeEndpoint);
        broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'New expense added' });
        res.status(201).json(Object.assign(expenseResult.rows[0], {pagador: personNameValue}));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al añadir el gasto.' });
    }
};

exports.updateExpense = async (req, res) => {
    const { groupUuid, expenseId } = req.params;
    const { description, amount, person_id } = req.body;

    if (!description || !(amount > 0 || !person_id)) {
        return res.status(400).json({ error: 'Descripción, monto y un pagador válido son requeridos.' });
    }

    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }

        const result = await db.query(
            'UPDATE expenses SET description = $1, amount = $2, person_id = $3 WHERE id = $4 RETURNING id, description, amount, person_id',
            [description, amount, person_id, expenseId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado.' });
        }
        
        const updatedExpense = result.rows[0];

        const groupInfoResult = await db.query('SELECT name FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupInfoResult.rows.length > 0) {
            const { name } = groupInfoResult.rows[0];

            const pushPayload = JSON.stringify({
                title: `Grupo: ${name}`,
                body: `Se ha actualizado el gasto: "${updatedExpense.description}".`,
                data: { uuid: groupUuid }
            });

            const excludeEndpoint = req.headers['x-client-endpoint'];
            await sendPushNotificationToGroup(groupResult.rows[0].id, pushPayload, excludeEndpoint);
            broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'Expense updated' });
        }

        const personName = await db.query('SELECT name FROM persons p JOIN expenses e ON p.id = e.person_id WHERE e.id = $1', [expenseId]);
        const personNameValue = personName.rows[0].name;

        res.json({
            ...updatedExpense,
            amount: parseFloat(updatedExpense.amount),
            pagador: personNameValue
        });
    } catch (error) {
        console.info('ERROR:', error);
        res.status(500).json({ error: 'Error del servidor al actualizar el gasto.' });
    }
};

exports.deleteExpense = async (req, res) => {
    const { groupUuid, expenseId } = req.params;

    try {
        const groupResult = await db.query('SELECT id FROM groups WHERE uuid = $1', [groupUuid]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }

        const result = await db.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado.' });
        }

        const pushPayload = JSON.stringify({
            title: `Grupo Actualizado`,
            body: `Se ha eliminado un gasto.`,
            data: { uuid: groupUuid }
        });
        const excludeEndpoint = req.headers['x-client-endpoint'];
        await sendPushNotificationToGroup(groupId, pushPayload, excludeEndpoint);
        broadcastToGroup(groupUuid, { type: 'GROUP_UPDATED', uuid: groupUuid, reason: 'Expense deleted' });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al eliminar el gasto.' });
    }
};
