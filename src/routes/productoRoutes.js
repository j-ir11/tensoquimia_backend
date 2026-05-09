import express from 'express';
import { 
  getProductos, 
  getProductoById, 
  createProducto, 
  updateProducto, 
  deleteProducto,
  getCostoActual 
} from '../controllers/productoController.js';
// Importamos los seguros
import { permitirRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * RUTAS DE LECTURA
 * Disponibles para ADMIN, VENTAS y PRODUCCION (Auxiliar)
 */
router.get('/', getProductos);
router.get('/:id', getProductoById);
router.get('/:id/costo', getCostoActual);

/**
 * RUTAS DE ESCRITURA
 * SOLO el ADMIN puede ejecutar estas acciones en la base de datos
 */
router.post('/', permitirRoles('ADMIN'), createProducto);
router.put('/:id', permitirRoles('ADMIN'), updateProducto);
router.delete('/:id', permitirRoles('ADMIN'), deleteProducto);

export default router;