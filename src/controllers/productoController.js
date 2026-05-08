import pool from '../config/database.js';
import { calcularCostoSintetizado, limpiarCacheCostos } from '../services/calculoService.js';

/**
 * Obtener todos los productos
 * Eliminado JOIN con métodos obsoletos.
 */
export const getProductos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM productos 
      ORDER BY tipo_producto, clave_producto
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error en getProductos:", error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};

/**
 * Obtener detalle de un producto por ID
 */
export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT * FROM productos WHERE id_producto = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getProductoById:", error);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
};

/**
 * Crear nuevo producto
 * Ya no recibe id_metodo ni factor_proceso.
 */
export const createProducto = async (req, res) => {
  try {
    const {
      clave_producto,
      descripcion_producto,
      tipo_producto,
      unidad_producto,
      familia_producto,
      costo,
      moneda
    } = req.body;

    const [result] = await pool.query(`
      INSERT INTO productos 
      (clave_producto, descripcion_producto, tipo_producto, unidad_producto, 
       familia_producto, costo, moneda)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      clave_producto,
      descripcion_producto,
      tipo_producto,
      unidad_producto,
      familia_producto,
      costo || 0,
      moneda || 'MXN'
    ]);

    limpiarCacheCostos();

    res.status(201).json({
      message: 'Producto registrado en catálogo',
      id_producto: result.insertId
    });
  } catch (error) {
    console.error("Error en createProducto:", error);
    res.status(500).json({ message: 'Error al crear producto' });
  }
};

/**
 * Actualizar producto
 */
export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clave_producto,
      descripcion_producto,
      tipo_producto,
      unidad_producto,
      familia_producto,
      costo,
      moneda
    } = req.body;

    await pool.query(`
      UPDATE productos SET 
        clave_producto = ?,
        descripcion_producto = ?,
        tipo_producto = ?,
        unidad_producto = ?,
        familia_producto = ?,
        costo = ?,
        moneda = ?
      WHERE id_producto = ?
    `, [
      clave_producto,
      descripcion_producto,
      tipo_producto,
      unidad_producto,
      familia_producto,
      costo,
      moneda,
      id
    ]);

    limpiarCacheCostos();

    res.json({ message: 'Ficha de producto actualizada' });
  } catch (error) {
    console.error("Error en updateProducto:", error);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
};

/**
 * Eliminar producto
 */
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM productos WHERE id_producto = ?', [id]);
    limpiarCacheCostos();
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error("Error en deleteProducto:", error);
    res.status(500).json({ 
      message: 'No se puede eliminar: el producto está siendo usado en fórmulas.' 
    });
  }
};

/**
 * Obtener costo sintetizado (Motor de costos)
 */
export const getCostoActual = async (req, res) => {
  try {
    const { id } = req.params;
    const costo = await calcularCostoSintetizado(id);

    const [producto] = await pool.query(`
      SELECT clave_producto, descripcion_producto, tipo_producto 
      FROM productos 
      WHERE id_producto = ?
    `, [id]);

    if (producto.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({
      id_producto: parseInt(id),
      clave: producto[0].clave_producto,
      descripcion: producto[0].descripcion_producto,
      tipo: producto[0].tipo_producto,
      costo_calculado: parseFloat(costo.toFixed(4)),
      moneda: "MXN"
    });
  } catch (error) {
    console.error("Error en getCostoActual:", error);
    res.status(500).json({ message: 'Error en el motor de costos' });
  }
};