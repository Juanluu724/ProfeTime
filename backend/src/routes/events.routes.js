const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const userId = "U001";

    const [rows] = await db.promise().query(
      `SELECT
         DATE_FORMAT(fec_inicio, '%Y-%m-%d') AS date,
         tipo AS type,
         titulo,
         descripcion AS description,
         hora_inicio AS startTime,
         hora_fin AS endTime,
         ubicacion AS location
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

router.post("/", async (req, res) => {
  try {
    const userId = "U001";
    const { date, type, endDate, duration, title, description, startTime, endTime, location } = req.body;

    if (!date) {
      return res.status(400).json({ msg: "La fecha es obligatoria" });
    }

    const allowedTypes = ["examen", "tarea", "reunion", "otro"];
    const eventType = allowedTypes.includes(type) ? type : "otro";
    const code = `E${Date.now()}`;
    const fecInicio = date;
    const fecFin = endDate || date;
    const duracion = Number.isFinite(Number(duration)) ? Number(duration) : 60;

    await db.promise().query(
      `INSERT INTO evento
       (codigo_evento, codigo_usuario_fk, codigo_modulo, fec_inicio, fec_fin, duracion_estimada, tipo, titulo, descripcion, hora_inicio, hora_fin, ubicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        userId,
        null,
        fecInicio,
        fecFin,
        duracion,
        eventType,
        title || null,
        description || null,
        startTime || null,
        endTime || null,
        location || null
      ]
    );

    res.status(201).json({
      codigo_evento: code,
      date: fecInicio,
      type: eventType,
      title: title || null,
      description: description || null,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando evento" });
  }
});

module.exports = router;
