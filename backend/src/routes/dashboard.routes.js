const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; 

    if (!userId) {
      return res.status(401).json({ msg: "No autorizado. Falta ID de usuario." });
    }

    const [conteo] = await db.promise().query(
      `SELECT tipo, COUNT(*) total
       FROM evento
       WHERE codigo_usuario_fk = ?
       GROUP BY tipo`,
      [userId]
    );

    const menuCounts = { examenes: 0, tareas: 0, reuniones: 0, otros: 0 };
    conteo.forEach(c => {
      if (c.tipo === "examen") menuCounts.examenes = c.total;
      if (c.tipo === "tarea") menuCounts.tareas = c.total;
      if (c.tipo === "reunion") menuCounts.reuniones = c.total;
      if (c.tipo === "otro") menuCounts.otros = c.total;
    });

    const [calendarEvents] = await db.promise().query(
      `SELECT
         codigo_evento,
         DATE_FORMAT(fec_inicio, '%Y-%m-%d') AS date,
         tipo AS type,
         titulo AS title,
         descripcion AS description,
         hora_inicio AS startTime,
         hora_fin AS endTime,
         ubicacion AS location
       FROM evento
       WHERE codigo_usuario_fk = ?`,
      [userId]
    );

    res.json({ menuCounts, calendarEvents });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando dashboard" });
  }
});

module.exports = router;