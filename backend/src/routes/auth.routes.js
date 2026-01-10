const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/login", (req, res) => {

  const { correo, password } = req.body;

  console.log("BODY RECIBIDO:", correo, password);

  const sql = `
    SELECT codigo_usuario, nom, apes, correo
    FROM usuario
    WHERE correo = ? AND password = ?
  `;

  db.query(sql, [correo, password], (err, rows) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ msg: "Error interno del servidor" });
    }

    console.log("FILAS DEVUELTAS:", rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ msg: "Correo o contraseña incorrectos" });
    }

    const user = rows[0];

    res.status(200).json({
      msg: "Login correcto",
      user
    });
  });
});

module.exports = router;
