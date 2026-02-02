<div align="center">
  <img src="frontend/src/assets/logo.jpg" alt="ProfeTime Logo" width="120" height="auto" style="border-radius: 20px"/>
  <h1>ProfeTime</h1>
  <p><strong>Gestión de Tiempo y Eventos Académicos Inteligente</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firestore" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  </p>
</div>

---

## Visión General

**ProfeTime** es una aplicación web integral diseñada para optimizar la gestión del tiempo de profesores y estudiantes. Permite la planificación de eventos académicos, sincronización con herramientas de Google y colaboración en tiempo real.

La aplicación sigue una arquitectura moderna **Cliente-Servidor** desacoplada (SPA + API REST), garantizando escalabilidad y una experiencia de usuario fluida.

---

## Características Principales

* ** Calendario Interactivo:** Vista mensual detallada con filtrado por tipo de evento (Exámenes, Tareas, Reuniones).
* ** Gestión Académica:** Clasificación específica para Ciclos Formativos y Másteres FP (grados, cursos).
* ** Integración Profunda con Google:**
    * Inicio de sesión con **Google/Firebase Auth**.
    * Sincronización bidireccional con **Google Calendar**.
    * Generación automática de enlaces de **Google Meet**.
    * Adjuntar archivos directamente desde **Google Drive** usando el *Google Picker*.
* ** Tiempo Real:** Sistema de notificaciones instantáneas mediante WebSockets (Socket.io) para eventos compartidos y actualizaciones.
* ** Colaboración:** Comparte eventos con otros usuarios por correo electrónico.

---

## Stack Tecnológico

### Frontend (Cliente)
* **Framework:** Angular v16 (Standalone components, Typed Forms).
* **Lenguaje:** TypeScript.
* **Estilos:** SCSS (Diseño modular y responsive).
* **Comunicación:** RxJS para manejo de flujos asíncronos y HTTP.
* **Real-time:** `socket.io-client`.

### Backend (API REST & WebSocket)
* **Runtime:** Node.js.
* **Framework:** Express.js.
* **Base de Datos:** Firebase Firestore (NoSQL). *Nota: El proyecto incluye dependencias de MySQL, pero la implementación actual utiliza Firestore*.
* **Autenticación:** Firebase Admin SDK.
* **APIs Externas:** `googleapis` (Calendar, Drive, Meet).

---

## Arquitectura del Sistema

El sistema utiliza un enfoque híbrido de comunicación para garantizar la consistencia de datos y la inmediatez.

```mermaid
graph TD
    User((Usuario))
    Client[Angular SPA]
    Server[Node.js Express API]
    DB[(Firestore DB)]
    Socket[Socket.io Service]
    Google[Google Cloud Platform]
    Firebase[Firebase Auth]

    User --> Client
    Client -- REST API (HTTP) --> Server
    Client -- WebSocket (Eventos) <--> Socket
    Socket --- Server
    
    Server -- Read/Write --> DB
    Server -- Verificación Token --> Firebase
    Server -- OAuth2 / APIs --> Google
    
    subgraph Google Ecosystem
      Firebase
      Google
    end
