require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

const configuredFrontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (origin === configuredFrontendUrl) return true;

  // Dev convenience: allow any localhost/127.0.0.1 origin (Angular dev server, Vite, etc.).
  if (!isProduction) {
    if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;
  }

  return false;
}

// Configurar Socket.io con CORS
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) return callback(null, true);
          return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST"]
    }
});

// Guardar io en app para usarlo en las rutas
app.set('io', io);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use((req, res, next) => {
    console.log(`Petición recibida: ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require("./src/config/firebase");

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/events", require("./src/routes/events.routes"));
app.use("/api/google", require("./src/routes/google.routes"));

// Servir Angular (build) desde el mismo backend en Render
const clientDist = path.join(__dirname, "../frontend/dist/frontend");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
    return res.sendFile(path.join(clientDist, "index.html"));
});

// Escuchar conexiones de clientes
io.on("connection", (socket) => {
    console.log("Usuario conectado al socket:", socket.id);

    // Un usuario se une a una "sala" con su propio ID de usuario para recibir mensajes privados
    socket.on("join_room", (userId) => {
        socket.join(userId);
        console.log(`Usuario ${userId} unido a su sala privada`);
    });

    socket.on("disconnect", () => {
        console.log("Usuario desconectado", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
// IMPORTANTE: Usar server.listen en lugar de app.listen
server.listen(PORT, () => {
    console.log(`>>> Servidor corriendo con Sockets en http://localhost:${PORT}`);
});
/*cooment*/
