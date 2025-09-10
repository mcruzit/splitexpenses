const { Pool } = require('pg');

// El pool de conexiones usará automáticamente la variable de entorno DATABASE_URL
// que le pasaremos desde docker-compose.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initializeDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Habilitar la extensión para generar UUIDs si no existe
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 1. Tabla para los grupos de gastos
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT groups_uuid_unique UNIQUE (uuid)
      );
    `);

    // 2. Tabla para las personas, vinculadas a un grupo
    await client.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        UNIQUE(group_id, name)
      );
    `);

    // 3. Tabla para los gastos, vinculados a una persona y un grupo
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL
      );
    `);

    // 4. Tabla para las suscripciones a notificaciones push
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        subscription_info JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database tables checked/created successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error initializing database', e);
    throw e;
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initializeDb,
};