import db from '../config/db.js';
import bcrypt from 'bcryptjs';

export const crearUsuario = async (nombre, usuario, contraseña, rol) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(contraseña, salt);

  const query = `
    INSERT INTO usuarios (nombre, usuario, contraseña, rol) 
    VALUES (?, ?, ?, ?)
  `;
  
  return db.query(query, [nombre, usuario, hashedPass, rol]);
};