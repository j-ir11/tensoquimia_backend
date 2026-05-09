import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { usuario, contraseña } = req.body;

  try {
    // 1. Buscar al usuario en la base de datos
    const [rows] = await pool.query(
      'SELECT id_usuario, nombre, usuario, contraseña, rol FROM usuarios WHERE usuario = ? AND activo = TRUE', 
      [usuario]
    );
    const user = rows[0];

    // 2. Si no existe el usuario
    if (!user) {
      return res.status(401).json({ message: 'El usuario no existe o está inactivo' });
    }

    // 3. Verificar si la contraseña coincide (Bcrypt compara el texto plano con el hash)
    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // 4. Crear el Token (Payload: id, rol y nombre)
    // El secreto debe estar en tu archivo .env como JWT_SECRET
    const token = jwt.sign(
      { 
        id: user.id_usuario, 
        rol: user.rol, 
        nombre: user.nombre 
      }, 
      process.env.JWT_SECRET || 'clave_secreta_provisional', 
      { expiresIn: '12h' } // El token expira en 12 horas
    );

    // 5. Enviar respuesta exitosa
    res.json({
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user.id_usuario,
        nombre: user.nombre,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error("Error en Login:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};