const express = require("express");
const router = express.Router();
const db = require("../config/db");

// LOGIN (adaptado a tu tabla)
router.post("/login", (req, res) => {
  const { correo, password } = req.body;

  const sql = "SELECT * FROM usuario WHERE correo = ? AND contraseña = ?";
  db.query(sql, [correo, password], (err, rows) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ msg: "Error interno del servidor" });
    }

    if (rows.length === 0) {
      return res.status(401).json({ msg: "Credenciales incorrectas" });
    }

    const user = rows[0];

    res.json({
      msg: "Login correcto",
      user: {
        id: user.codigo_usuario,
        nombre: user.nom,
        apellidos: user.apes,
        correo: user.correo
      }
    });
  });
});

module.exports = router;
