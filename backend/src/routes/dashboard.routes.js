const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Tu conexión a la DB

router.get("/", async (req, res) => {
  try {
    // 1. OBTENER EL ID DEL USUARIO
    // Si tienes middleware de auth, usa: const userId = req.user.codigo_usuario;
    // Por ahora, usaremos uno fijo para probar (asegúrate de que este usuario exista en tu DB)
    const userId = 'U001'; 

    // 2. CONSULTAS A LA BASE DE DATOS
    
    // A) Obtener Eventos del Calendario
    // (Asumiendo que usas mysql2 con promesas. Si usas callbacks, avísame)
    const [eventos] = await db.promise().query(
      `SELECT codigo_evento, fec_inicio, tipo 
       FROM evento 
       WHERE codigo_usuario_fk = ?`, 
      [userId]
    );

    // B) Contar tipos de eventos para el menú lateral
    const [conteo] = await db.promise().query(
      `SELECT tipo, COUNT(*) as total 
       FROM evento 
       WHERE codigo_usuario_fk = ? 
       GROUP BY tipo`, 
      [userId]
    );

    // C) Obtener Notificaciones
    // Unimos con la tabla evento para saber la fecha
    const [notificaciones] = await db.promise().query(
      `SELECT n.codigo_notificacion, n.nombre as titulo, n.codigo_evento, e.fec_inicio, e.tipo
       FROM notificacion n
       JOIN evento e ON n.codigo_evento = e.codigo_evento
       WHERE e.codigo_usuario_fk = ?
       ORDER BY e.fec_inicio ASC
       LIMIT 3`,
      [userId]
    );

    // 3. PROCESAR DATOS PARA EL FRONTEND
    
    // Formatear contadores
    const counts = { examenes: 0, tareas: 0, reuniones: 0 };
    conteo.forEach(c => {
      if (c.tipo === 'examen') counts.examenes = c.total;
      if (c.tipo === 'tarea') counts.tareas = c.total;
      if (c.tipo === 'reunion') counts.reuniones = c.total;
    });

    // Formatear notificaciones (calcular "hace X horas" o "en X días")
    const notifFormatted = notificaciones.map(n => {
      const fechaEvento = new Date(n.fec_inicio);
      const hoy = new Date();
      const diffTime = Math.abs(fechaEvento - hoy);
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); 
      
      return {
        id: n.codigo_notificacion,
        type: n.tipo,
        title: n.titulo,
        time: `Fecha: ${fechaEvento.toLocaleDateString()}`, // Puedes mejorar esto con una librería como dayjs
        badge: `${diffHours}h`
      };
    });

    // Formatear eventos para el calendario
    const calendarEvents = eventos.map(e => ({
      date: e.fec_inicio, // Asegúrate de que el formato sea YYYY-MM-DD
      type: e.tipo
    }));

    // 4. RESPONDER AL FRONTEND
    res.json({
      menuCounts: counts,
      notifications: notifFormatted,
      calendarEvents: calendarEvents
    });

  } catch (error) {
    console.error("Error en dashboard:", error);
    res.status(500).json({ message: "Error al obtener datos del dashboard" });
  }
});

module.exports = router;