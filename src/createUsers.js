import pool from './config/database.js'; // Ajusta la ruta a tu conexión
import bcrypt from 'bcryptjs';

const seed = async () => {
  const salt = await bcrypt.genSalt(10);
  
  // 1. Datos del ADMIN
  const passAdmin = await bcrypt.hash('admin123', salt);
  await pool.query(
    'INSERT INTO usuarios (nombre, usuario, contraseña, rol) VALUES (?, ?, ?, ?)',
    ['Uriel', 'Uriel123', passAdmin, 'ADMIN']
  );

  // 2. Datos del AUXILIAR
  const passAux = await bcrypt.hash('aux123', salt);
  await pool.query(
    'INSERT INTO usuarios (nombre, usuario, contraseña, rol) VALUES (?, ?, ?, ?)',
    ['Adrian', 'Adrian123', passAux, 'PRODUCCION']
  );

  console.log("✅ Usuarios de prueba creados");
  process.exit();
};

seed();