import pool from '../config/database.js';

/**
 * =========================
 * CACHE GLOBAL (RAM)
 * =========================
 */
const cacheCostos = new Map();
const cacheProductos = new Map();
const cacheVersiones = new Map();
const redondearCostoEstricto = (valor) => {
  const num = parseFloat(valor);
  if (isNaN(num) || num < 0) return 0;
  
  const multiplicado = num * 100;
  const parteEntera = Math.floor(multiplicado);
  const residuoDecimal = multiplicado - parteEntera;

  if (residuoDecimal >= 0.49999) {
    return parseFloat(((parteEntera + 1) / 100).toFixed(2));
  } else {
    return parseFloat((parteEntera / 100).toFixed(2));
  }
};
/**
 * Tipo de cambio
 */
const getUltimoTCValor = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT valor FROM historial_tipo_cambio 
      ORDER BY fecha DESC, id_tc DESC LIMIT 1
    `);

    const valor = rows.length > 0 ? parseFloat(rows[0].valor) : 18.00;
    // 🔍 LOG: Verificar que el TC no sea 0
    console.log(`💵 TC Recuperado: ${valor}`);
    return valor;
  } catch (error) {
    console.error("Error al obtener TC actual:", error);
    return 18.00;
  }
};

/**
 * =========================
 * MOTOR PRINCIPAL OPTIMIZADO
 * =========================
 */
/**
 * MOTOR DE CÁLCULO RECURSIVO (Soporta Transacciones)
 */
export const calcularCostoSintetizado = async (id_producto, tcManual = null, stack = new Set(), db = null) => {
  try {
    // 💡 Usar la conexión de la transacción si existe, sino usar el pool global
    const executor = db || pool;

    if (stack.has(id_producto)) {
      console.warn(`⚠️ Ciclo detectado en producto ${id_producto}`);
      return 0;
    }

    if (cacheCostos.has(id_producto)) return cacheCostos.get(id_producto);

    stack.add(id_producto);

    // 1. Obtener Producto
    let prod;
    const [pRows] = await executor.query(`SELECT * FROM productos WHERE id_producto = ?`, [id_producto]);
    
    if (pRows.length === 0) {
        stack.delete(id_producto);
        return 0;
    }
    prod = pRows[0];

    // 2. Obtener Tipo de Cambio
    const tcActual = tcManual || await getUltimoTCValor();

    // 3. Lógica Materia Prima

    if (prod.tipo_producto === 'MP') {
      const costoBase = parseFloat(prod.costo || 0);
      // Cambiamos el .toFixed(4) por nuestra nueva regla estricta de 2 decimales
      const costoFinal = prod.moneda === 'USD' 
        ? redondearCostoEstricto(costoBase * tcActual) 
        : costoBase;
      
      cacheCostos.set(id_producto, costoFinal);
      stack.delete(id_producto);
      return costoFinal;
    }

    // 4. Lógica Producto Intermedio (PI)
    const [vRows] = await executor.query(`
      SELECT * FROM versiones_formula 
      WHERE id_producto = ? 
      ORDER BY numero_version DESC LIMIT 1
    `, [id_producto]);

    if (vRows.length === 0) {
      console.warn(`   ⚠️ PI ID ${id_producto} no tiene versiones visibles.`);
      stack.delete(id_producto);
      return 0;
    }

    const versionActual = vRows[0];
    const [ingredientes] = await executor.query(`
      SELECT id_componente, porcentaje FROM ingredientes_formula WHERE id_version = ?
    `, [versionActual.id_version]);

    let costoMezcla = 0;
    for (const ing of ingredientes) {
      const costoComp = await calcularCostoSintetizado(
        ing.id_componente,
        tcActual,
        stack,
        executor 
      );
      // 1. Redondeamos el aporte de cada ingrediente a 2 decimales antes de sumarlo
      const aporteFila = redondearCostoEstricto(costoComp * (parseFloat(ing.porcentaje) / 100));
      costoMezcla += aporteFila;
    }

    // 2. El resultado final con su factor de proceso se procesa con la regla estricta
    const resultado = redondearCostoEstricto(costoMezcla + parseFloat(versionActual.factor_proceso || 0));

    cacheCostos.set(id_producto, resultado);
    stack.delete(id_producto);
    return resultado;

  } catch (error) {
    console.error(`Error en motor para ID ${id_producto}:`, error);
    stack.delete(id_producto);
    return 0;
  }
};

export const calcularCostoPorVersion = async (id_version) => {
  try {
    const [v] = await pool.query(
      `SELECT * FROM versiones_formula WHERE id_version = ?`,
      [id_version]
    );

    if (v.length === 0) return 0;
    return await calcularCostoSintetizado(v[0].id_producto);
  } catch (error) {
    console.error(error);
    return 0;
  }
};

export const limpiarCacheCostos = () => {
    cacheCostos.clear();
    cacheProductos.clear();
    cacheVersiones.clear();
    console.log("🔥 Cache de costos purgado exitosamente");
};