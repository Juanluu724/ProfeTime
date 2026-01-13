const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET: Obtener eventos propios Y compartidos
// GET: Eventos propios y compartidos con datos del remitente
router.get("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    // Consulta UNION mejorada
    const query = `
      /* Eventos PROPIOS */
      SELECT e.codigo_evento, DATE_FORMAT(e.fec_inicio, '%Y-%m-%d') AS date, e.tipo AS type, 
       e.titulo AS title, e.descripcion AS description, e.hora_inicio AS startTime, 
       e.hora_fin AS endTime, e.ubicacion AS location,
       'propio' as ownership,
       NULL as senderName /* No necesitamos remitente si es propio */
       FROM evento e WHERE e.codigo_usuario_fk = ?
       
       UNION
       
       /* Eventos COMPARTIDOS (traemos nombre del dueño) */
       SELECT e.codigo_evento, DATE_FORMAT(e.fec_inicio, '%Y-%m-%d') AS date, e.tipo AS type, 
       e.titulo AS title, e.descripcion AS description, e.hora_inicio AS startTime, 
       e.hora_fin AS endTime, e.ubicacion AS location,
       'compartido' as ownership,
       CONCAT(u.nom, ' ', u.apes) as senderName
       FROM evento e 
       JOIN evento_participante ep ON e.codigo_evento = ep.codigo_evento
       JOIN usuario u ON e.codigo_usuario_fk = u.codigo_usuario
       WHERE ep.codigo_usuario = ?
    `;

    const [rows] = await db.promise().query(query, [userId, userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando eventos" });
  }
});
// POST: Crear evento con opción de compartir
router.post("/", async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { date, type, title, description, startTime, endTime, location, sharedWithEmail } = req.body; // [NUEVO] sharedWithEmail
    const code = `E${Date.now()}`;
    const io = req.app.get('io'); // Obtener instancia de socket

    // 1. Insertar evento
    await db.promise().query(
      `INSERT INTO evento (codigo_evento, codigo_usuario_fk, fec_inicio, tipo, titulo, descripcion, hora_inicio, hora_fin, ubicacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, userId, date, type, title, description, startTime, endTime, location]
    );

    // 2. Si hay email para compartir, buscar usuario y vincular
    if (sharedWithEmail) {
        const [users] = await db.promise().query("SELECT codigo_usuario FROM usuario WHERE correo = ?", [sharedWithEmail]);
        
        if (users.length > 0) {
            const guestId = users[0].codigo_usuario;
            // Insertar en tabla intermedia
            await db.promise().query("INSERT INTO evento_participante (codigo_evento, codigo_usuario) VALUES (?, ?)", [code, guestId]);

            // [REAL-TIME] Enviar notificación al usuario invitado
            // Enviamos el evento completo para que el frontend lo pinte sin recargar
            io.to(guestId).emit("nuevo_evento_compartido", {
                codigo_evento: code,
                title,
                date,
                type,
                description,
                ownership: 'compartido'
            });
        }
    }

    res.status(201).json({ codigo_evento: code, ...req.body });
  } catch (err) {
    console.error(err);
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