const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const [rows] = await db.promise().query(
      `SELECT codigo_evento, DATE_FORMAT(fec_inicio, '%Y-%m-%d') AS date, tipo AS type, 
       titulo AS title, descripcion AS description, hora_inicio AS startTime, 
       hora_fin AS endTime, ubicacion AS location 
       FROM evento WHERE codigo_usuario_fk = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ msg: "Error cargando eventos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { date, type, title, description, startTime, endTime, location } = req.body;
    const code = `E${Date.now()}`;
    
    await db.promise().query(
      `INSERT INTO evento (codigo_evento, codigo_usuario_fk, fec_inicio, tipo, titulo, descripcion, hora_inicio, hora_fin, ubicacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, userId, date, type, title, description, startTime, endTime, location]
    );
    res.status(201).json({ codigo_evento: code, ...req.body });
  } catch (err) {
    res.status(500).json({ msg: "Error creando evento" });
  }
});

router.put("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const { date, type, title, description, startTime, endTime, location } = req.body;

    const [result] = await db.promise().query(
      `UPDATE evento 
       SET fec_inicio = ?, tipo = ?, titulo = ?, descripcion = ?, hora_inicio = ?, hora_fin = ?, ubicacion = ? 
       WHERE codigo_evento = ?`,
      [date, type, title, description, startTime, endTime, location, codigo_evento]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Evento no encontrado" });
    }

    res.json({ msg: "Evento actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error en el servidor al actualizar" });
  }
});

router.delete("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const [result] = await db.promise().query("DELETE FROM evento WHERE codigo_evento = ?", [codigo_evento]);
    
    if (result.affectedRows === 0) return res.status(404).json({ msg: "No encontrado" });
    res.json({ msg: "Eliminado" });
  } catch (err) {
    res.status(500).json({ msg: "Error al eliminar" });
  }
});

module.exports = router;