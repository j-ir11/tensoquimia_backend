import pool from '../config/database.js';
import { calcularCostoSintetizado, limpiarCacheCostos } from '../services/calculoService.js';

// ======================
// FUNCIONES BÁSICAS
// ======================

export const getHistorialTC = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM historial_tipo_cambio 
      ORDER BY fecha DESC, id_tc DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener historial TC' });
  }
};

export const getTCActual = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM historial_tipo_cambio 
      ORDER BY fecha DESC, id_tc DESC LIMIT 1
    `);
    
    if (rows.length === 0) {
      return res.json({ id_tc: null, fecha: null, valor: 18.00 });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener TC actual' });
  }
};

// ==========================================
// ACTUALIZACIÓN MASIVA (EL CORAZÓN DEL SISTEMA)
// ==========================================
export const actualizarTipoCambioMasivo = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { valor } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ message: 'Debe proporcionar un valor válido de TC' });
    }

    // 🚀 1. LIMPIAR CACHÉ ANTES DE EMPEZAR
    limpiarCacheCostos();

    await connection.beginTransaction();

    const fecha = new Date().toISOString().split('T')[0];

    // 2. Registrar el nuevo TC en el historial
    const [tcResult] = await connection.query(`
      INSERT INTO historial_tipo_cambio (fecha, valor)
      VALUES (?, ?)
    `, [fecha, valor]);

    const id_tc_nuevo = tcResult.insertId;

    // 3. Obtener todos los Productos Intermedios que tienen al menos una versión
    const [pis] = await connection.query(`
      SELECT DISTINCT p.id_producto 
      FROM productos p
      INNER JOIN versiones_formula v ON p.id_producto = v.id_producto
      WHERE p.tipo_producto = 'PI'
    `);

    let actualizaciones = 0;

    // 4. Iterar y generar nuevas versiones basadas en el nuevo TC
    for (const pi of pis) {
      const id_producto = pi.id_producto;

      // Obtener la configuración de la última versión
      const [ultima] = await connection.query(`
        SELECT * FROM versiones_formula 
        WHERE id_producto = ? 
        ORDER BY numero_version DESC LIMIT 1
      `, [id_producto]);

      if (ultima.length === 0) continue;

      const vAnt = ultima[0];

      // Calculamos el costo pasando el nuevo valor de TC y la conexión actual
      const nuevoCosto = await calcularCostoSintetizado(id_producto, valor, new Set(), connection);

      // 5. INSERTAR NUEVA VERSIÓN (Ajustado al nuevo esquema)
      // Eliminamos 'id_metodo' y agregamos 'nombre_proceso'
      const [nuevaVersion] = await connection.query(`
        INSERT INTO versiones_formula 
        (id_producto, numero_version, fecha, id_tc, nombre_proceso, factor_proceso, costo_final)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?)
      `, [
        id_producto,
        vAnt.numero_version + 1,
        id_tc_nuevo,
        vAnt.nombre_proceso, // Clonamos el nombre que ya tenía
        vAnt.factor_proceso, // Clonamos el factor que ya tenía
        nuevoCosto
      ]);

      const id_version_nueva = nuevaVersion.insertId;

      // 6. Clonar los ingredientes
      await connection.query(`
        INSERT INTO ingredientes_formula (id_version, id_componente, porcentaje)
        SELECT ?, id_componente, porcentaje 
        FROM ingredientes_formula 
        WHERE id_version = ?
      `, [id_version_nueva, vAnt.id_version]);

      // 7. Sincronizar el costo en la tabla principal de productos
      await connection.query(`
        UPDATE productos SET costo = ? WHERE id_producto = ?
      `, [nuevoCosto, id_producto]);

      actualizaciones++;
    }

    await connection.commit();
    limpiarCacheCostos();

    res.json({
      success: true,
      message: 'Actualización masiva completada',
      nuevo_tc: valor,
      productos_actualizados: actualizaciones
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error en actualización masiva:", error);
    res.status(500).json({ 
      message: 'Error durante la actualización masiva',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};