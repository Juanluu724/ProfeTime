require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http"); 
const { Server } = require("socket.io"); 

const app = express();
const server = http.createServer(app); 

// Configurar Socket.io con CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});

// Guardar io en app para usarlo en las rutas
app.set('io', io); 

app.use(cors());
app.use((req, res, next) => {
    console.log(`Petición recibida: ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require("./src/config/db");

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/events", require("./src/routes/events.routes")); 
app.use("/api/google", require("./src/routes/google.routes"));

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
