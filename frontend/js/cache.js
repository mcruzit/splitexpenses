// Usar un nombre de caché consistente es crucial. Exportarlo permite
// que tanto el Service Worker como la aplicación usen la misma constante.
export const CACHE_NAME = 'gastos-divisor-cache-v1.1.0';

/**
 * Abre la caché utilizada por la aplicación.
 * @returns {Promise<Cache>} Una promesa que resuelve al objeto Cache.
 */
async function openCache() {
    return await caches.open(CACHE_NAME);
}

/**
 * Actualiza la respuesta cacheada para un grupo específico.
 * Esencial para las actualizaciones de UI optimistas.
 * @param {string} uuid - El UUID del grupo.
 * @param {object} groupData - El nuevo objeto de datos del grupo a cachear.
 */
export async function updateGroupInCache(uuid, groupData) {
    if (!uuid || !groupData) return;

    const cache = await openCache();
    const url = `/api/groups/${uuid}`;
    
    // Crea un nuevo objeto Response con los datos actualizados.
    // Esto imita cómo se almacena una respuesta de red real.
    const response = new Response(JSON.stringify(groupData), {
        headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(url, response);
}

/**
 * Recupera los datos de un grupo directamente desde la caché.
 * @param {string} uuid - El UUID del grupo.
 * @returns {Promise<object|null>} Una promesa que resuelve al objeto de datos del grupo o null si no se encuentra.
 */
export async function getGroupFromCache(uuid) {
    try {
        const cache = await openCache();
        const url = `/api/groups/${uuid}`;
        const response = await cache.match(url);
        if (response) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error al obtener grupo de la caché:', error);
        return null;
    }
}
