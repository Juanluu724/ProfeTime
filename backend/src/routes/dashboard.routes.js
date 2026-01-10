const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const userId = "U001";

    const [conteo] = await db.promise().query(
      `SELECT tipo, COUNT(*) total
       FROM evento
       WHERE codigo_usuario_fk = ?
       GROUP BY tipo`,
      [userId]
    );

    const menuCounts = { examenes: 0, tareas: 0, reuniones: 0 };

    conteo.forEach(c => {
      if (c.tipo === "examen") menuCounts.examenes = c.total;
      if (c.tipo === "tarea") menuCounts.tareas = c.total;
      if (c.tipo === "reunion") menuCounts.reuniones = c.total;
    });

    res.json({
      menuCounts,
      notifications: [] // luego lo ampliamos
    });

  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ msg: "Error dashboard" });
  }
});

module.exports = router;
