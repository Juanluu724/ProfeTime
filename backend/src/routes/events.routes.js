const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const userId = "U001";

    const [rows] = await db.promise().query(
      `SELECT DATE(fec_inicio) AS fecha, tipo
       FROM evento
       WHERE codigo_usuario_fk = ?`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando eventos" });
  }
});

module.exports = router;
