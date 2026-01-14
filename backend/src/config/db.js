const mysql = require("mysql2");

const dbName = process.env.DB_NAME || "profe_time_clean";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: dbName
});

db.connect(err => {
  if (err) {
    console.error("Error al conectar a MySQL:", err);
  } else {
    console.log("Conectado a MySQL correctamente");
    console.log(`BASE DE DATOS ACTUAL: ${dbName}`);
  }
});

db.query(
  `CREATE TABLE IF NOT EXISTS google_tokens (
    codigo_usuario VARCHAR(20) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    scope TEXT,
    token_type VARCHAR(50),
    expiry_date BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (codigo_usuario),
    CONSTRAINT fk_google_tokens_usuario
      FOREIGN KEY (codigo_usuario) REFERENCES usuario(codigo_usuario)
      ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("Error creando tabla google_tokens:", err);
    }
  }
);

db.query(
  `CREATE TABLE IF NOT EXISTS evento_participante (
    codigo_evento VARCHAR(20) NOT NULL,
    codigo_usuario VARCHAR(20) NOT NULL,
    PRIMARY KEY (codigo_evento, codigo_usuario),
    CONSTRAINT fk_evento_participante_evento
      FOREIGN KEY (codigo_evento) REFERENCES evento(codigo_evento)
      ON DELETE CASCADE,
    CONSTRAINT fk_evento_participante_usuario
      FOREIGN KEY (codigo_usuario) REFERENCES usuario(codigo_usuario)
      ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("Error creando tabla evento_participante:", err);
    }
  }
);

module.exports = db;
