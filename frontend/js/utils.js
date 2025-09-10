/**
 * Formatea un número como una cadena de moneda en formato español (España).
 * Ej: 1234.56 -> "1.234,56"
 * @param {number} value El número a formatear.
 * @returns {string} La cadena de moneda formateada.
 */
export function formatCurrency(value) {
    if (typeof value !== 'number') {
        return '0,00';
    }
    // Usar el localismo 'es-ES' para obtener el formato de miles con punto y decimales con coma.
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
