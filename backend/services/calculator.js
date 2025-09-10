class CalculadoraGastos {
    constructor() {
        // Usamos un Map para asegurar que no haya personas duplicadas por nombre.
        this.personas = new Map();
        this.gastos = [];
    }

    agregarPersona(nombre) {
        if (!this.personas.has(nombre)) {
            this.personas.set(nombre, { nombre });
        }
    }

    agregarGasto(gasto) {
        // El gasto debe tener { descripcion, monto, pagador (nombre) }
        this.agregarPersona(gasto.pagador);
        this.gastos.push(gasto);
    }

    calcularDeudas() {
        if (this.personas.size === 0 || this.gastos.length === 0) {
            return [];
        }

        const saldos = this._calcularSaldos();
        return this._simplificarDeudas(saldos);
    }

    _calcularSaldos() {
        const saldos = new Map();
        this.personas.forEach(persona => {
            saldos.set(persona.nombre, 0.0);
        });

        let totalGastos = 0;
        this.gastos.forEach(gasto => {
            totalGastos += gasto.monto;
            // Sumamos lo que cada persona ha pagado
            saldos.set(gasto.pagador, saldos.get(gasto.pagador) + gasto.monto);
        });

        const gastoPorPersona = totalGastos / this.personas.size;

        // Restamos lo que cada persona debería haber pagado
        this.personas.forEach(persona => {
            const pagoRealizado = saldos.get(persona.nombre);
            saldos.set(persona.nombre, pagoRealizado - gastoPorPersona);
        });

        return saldos;
    }

    _simplificarDeudas(saldos) {
        const deudores = new Map();
        const acreedores = new Map();

        saldos.forEach((monto, nombre) => {
            if (monto < 0) {
                deudores.set(nombre, monto);
            } else if (monto > 0) {
                acreedores.set(nombre, monto);
            }
        });

        const transacciones = [];

        while (deudores.size > 0 && acreedores.size > 0) {
            const [nombreDeudor, deudaAbs] = deudores.entries().next().value;
            const [nombreAcreedor, credito] = acreedores.entries().next().value;
            
            const deuda = -deudaAbs; // Convertir a positivo
            const montoTransferido = Math.min(deuda, credito);

            transacciones.push({
                deudor: nombreDeudor,
                acreedor: nombreAcreedor,
                monto: montoTransferido
            });

            deudores.set(nombreDeudor, deudaAbs + montoTransferido);
            acreedores.set(nombreAcreedor, credito - montoTransferido);

            if (Math.abs(deudores.get(nombreDeudor)) < 0.01) deudores.delete(nombreDeudor);
            if (Math.abs(acreedores.get(nombreAcreedor)) < 0.01) acreedores.delete(nombreAcreedor);
        }

        return transacciones;
    }
}

module.exports = CalculadoraGastos;
