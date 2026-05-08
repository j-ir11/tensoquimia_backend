import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mainRoutes from './routes/index.js';

dotenv.config();

const app = express();

// Configuramos CORS para permitir tu URL de Vercel del Frontend después
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '✅ TensoQuimia Backend v1.0' });
});

app.use('/api', mainRoutes);

// 🚀 CAMBIO CLAVE: Exportamos la app para que Vercel la pueda usar
// Solo ejecutamos listen si NO estamos en Vercel (entorno local)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local en → http://localhost:${PORT}`);
  });
}

export default app;