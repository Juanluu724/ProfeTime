const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "profe_time_db"
});

db.connect(err => {
  if (err) {
    console.error("Error al conectar a MySQL:", err);
  } else {
    console.log("Conectado a MySQL correctamente");
    console.log("BASE DE DATOS ACTUAL: profe_time_clean");
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

module.exports = db;
