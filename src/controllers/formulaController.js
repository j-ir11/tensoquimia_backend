import pool from '../config/database.js';
import { calcularCostoSintetizado, limpiarCacheCostos } from '../services/calculoService.js';

/**
 * Obtener historial de versiones de un producto
 */
export const getVersionesByProducto = async (req, res) => {
  try {
    const { id_producto } = req.params;

    const [versiones] = await pool.query(`
      SELECT v.*, 
             h.valor as tc_valor,
             (SELECT COUNT(*) FROM ingredientes_formula WHERE id_version = v.id_version) as total_ingredientes
      FROM versiones_formula v
      LEFT JOIN historial_tipo_cambio h ON v.id_tc = h.id_tc
      WHERE v.id_producto = ?
      ORDER BY v.numero_version DESC
    `, [id_producto]);

    res.json(versiones);
  } catch (error) {
    console.error("Error en getVersionesByProducto:", error);
    res.status(500).json({ message: 'Error al obtener versiones' });
  }
};

/**
 * Obtener la versión más reciente de un producto
 */
export const getUltimaVersion = async (req, res) => {
  try {
    const { id_producto } = req.params;
    const [rows] = await pool.query(`
      SELECT * FROM versiones_formula 
      WHERE id_producto = ? 
      ORDER BY numero_version DESC LIMIT 1
    `, [id_producto]);

    res.json(rows[0] || null);
  } catch (error) {
    console.error("Error en getUltimaVersion:", error);
    res.status(500).json({ message: 'Error al obtener última versión' });
  }
};

/**
 * CREAR NUEVA VERSIÓN DE FÓRMULA
 */
export const createVersionFormula = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const { 
        id_producto, 
        id_tc, 
        nombre_proceso, 
        factor_proceso, 
        ingredientes = [] 
    } = req.body;

    let tcIdToUse = id_tc;
    if (!tcIdToUse) {
      const [tcRows] = await connection.query(`SELECT id_tc FROM historial_tipo_cambio ORDER BY id_tc DESC LIMIT 1`);
      tcIdToUse = tcRows[0]?.id_tc;
    }

    const [last] = await connection.query(`SELECT MAX(numero_version) as maxv FROM versiones_formula WHERE id_producto = ?`, [id_producto]);
    const numero_version = (last[0].maxv || 0) + 1;

    const [result] = await connection.query(
      `INSERT INTO versiones_formula 
       (id_producto, numero_version, fecha, id_tc, nombre_proceso, factor_proceso, costo_final) 
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?)`,
      [id_producto, numero_version, tcIdToUse, nombre_proceso, factor_proceso, 0]
    );
    const id_version = result.insertId;

    if (ingredientes.length > 0) {
      const values = ingredientes.map(ing => [id_version, ing.id_componente, ing.porcentaje]);
      await connection.query(`INSERT INTO ingredientes_formula (id_version, id_componente, porcentaje) VALUES ?`, [values]);
    }

    limpiarCacheCostos();
    const costoReal = await calcularCostoSintetizado(id_producto, null, new Set(), connection);
    
    await connection.query(`UPDATE versiones_formula SET costo_final = ? WHERE id_version = ?`, [costoReal, id_version]);
    await connection.query(`UPDATE productos SET costo = ? WHERE id_producto = ?`, [costoReal, id_producto]);

    await connection.commit();
    res.status(201).json({ message: 'Guardado con éxito', id_version, numero_version, costo_final: costoReal });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ ERROR EN FÓRMULA:", error);
    res.status(500).json({ message: 'Error interno al procesar fórmula' });
  } finally {
    connection.release();
  }
};

/**
 * ✅ FUNCIÓN RECUPERADA: Obtener ingredientes de una versión
 */
export const getIngredientesByVersion = async (req, res) => {
  try {
    const { id_version } = req.params;
    const [ingredientes] = await pool.query(`
      SELECT i.*, p.clave_producto, p.descripcion_producto, p.tipo_producto, p.unidad_producto
      FROM ingredientes_formula i
      JOIN productos p ON i.id_componente = p.id_producto
      WHERE i.id_version = ?
    `, [id_version]);

    res.json(ingredientes);
  } catch (error) {
    console.error("Error en getIngredientesByVersion:", error);
    res.status(500).json({ message: 'Error al obtener ingredientes' });
  }
};

/**
 * ACTUALIZAR VERSIÓN ACTUAL (Sobrescribir)
 */
export const actualizarVersionActual = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_producto } = req.params;
    const { nombre_proceso, factor_proceso, ingredientes } = req.body;

    const [versiones] = await connection.query(
      "SELECT id_version FROM versiones_formula WHERE id_producto = ? ORDER BY numero_version DESC LIMIT 1",
      [id_producto]
    );

    if (versiones.length === 0) return res.status(404).json({ message: "No existe fórmula." });

    const id_v = versiones[0].id_version;

    await connection.query("DELETE FROM ingredientes_formula WHERE id_version = ?", [id_v]);
    const values = ingredientes.map(ing => [id_v, ing.id_componente, ing.porcentaje]);
    await connection.query("INSERT INTO ingredientes_formula (id_version, id_componente, porcentaje) VALUES ?", [values]);

    await connection.query(
      "UPDATE versiones_formula SET nombre_proceso = ?, factor_proceso = ?, fecha = CURDATE() WHERE id_version = ?",
      [nombre_proceso, factor_proceso, id_v]
    );

    limpiarCacheCostos();
    const costoReal = await calcularCostoSintetizado(id_producto, null, new Set(), connection);

    await connection.query("UPDATE versiones_formula SET costo_final = ? WHERE id_version = ?", [costoReal, id_v]);
    await connection.query("UPDATE productos SET costo = ? WHERE id_producto = ?", [costoReal, id_producto]);

    await connection.commit();
    res.json({ message: "Actualizado con éxito", costo: costoReal });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * Obtener reporte completo
 */
export const getReporteCompletoVersion = async (req, res) => {
  try {
    const { id_version } = req.params;
    const [versionMaster] = await pool.query(`
      SELECT v.*, p.clave_producto, p.descripcion_producto, p.unidad_producto, h.valor as tc_valor
      FROM versiones_formula v
      JOIN productos p ON v.id_producto = p.id_producto
      JOIN historial_tipo_cambio h ON v.id_tc = h.id_tc
      WHERE v.id_version = ?
    `, [id_version]);

    if (versionMaster.length === 0) return res.status(404).json({ message: 'No existe' });

    const [ingredientes] = await pool.query(`
      SELECT i.porcentaje, p.clave_producto, p.descripcion_producto, p.unidad_producto, p.moneda as moneda_base, p.costo as costo_base_unitario
      FROM ingredientes_formula i
      JOIN productos p ON i.id_componente = p.id_producto
      WHERE i.id_version = ?
    `, [id_version]);

    res.json({ master: versionMaster[0], ingredientes });
  } catch (error) {
    res.status(500).json({ message: 'Error reporte' });
  }
};

/**
 * Historial completo global
 */
export const getHistorialCompleto = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*, h.valor as tc_valor, p.clave_producto, p.descripcion_producto
      FROM versiones_formula v
      JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN historial_tipo_cambio h ON v.id_tc = h.id_tc
      ORDER BY p.clave_producto ASC, v.numero_version ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error historial' });
  }
};