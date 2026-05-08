import express from 'express';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getCostoActual
} from '../controllers/productoController.js';

const router = express.Router();

// 1. Rutas sin parámetros dinámicos
router.get('/', getProductos);
router.post('/', createProducto);

// 2. Rutas con prefijos específicos (COSTO)
// Esto debe ir ANTES de las rutas con :id solo
router.get('/costo/:id', getCostoActual); 

// 3. Rutas con parámetros dinámicos generales (:id)
router.get('/:id', getProductoById);
router.put('/:id', updateProducto);
router.delete('/:id', deleteProducto);

export default router;