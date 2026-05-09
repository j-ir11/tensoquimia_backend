import express from 'express';
import productoRoutes from './productoRoutes.js';
import tcRoutes from './tcRoutes.js';  
import formulaRoutes from './formulaRoutes.js';
import { login } from '../controllers/authController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * RUTAS PÚBLICAS
 */
// Usamos .post porque el login envía credenciales en el cuerpo (body)
router.post('/login', login);

/**
 * RUTAS PROTEGIDAS (Requieren Token)
 */
// Al colocarlo aquí, todas las rutas de abajo quedan protegidas automáticamente
router.use(verificarToken);

// Productos y Fórmulas
// Nota: La restricción de "solo lectura" para el Auxiliar se aplica 
// internamente en cada archivo de rutas (GET libre, POST/PUT/DELETE solo ADMIN)
router.use('/productos', productoRoutes);
router.use('/formulas', formulaRoutes);
router.use('/tipo-cambio', tcRoutes);

export default router;