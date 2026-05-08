import express from 'express';
import productoRoutes from './productoRoutes.js';
import tcRoutes from './tcRoutes.js';  
import formulaRoutes from './formulaRoutes.js';




const router = express.Router();

router.use('/productos', productoRoutes);
router.use('/tipo-cambio', tcRoutes);
router.use('/formulas', formulaRoutes);



export default router;