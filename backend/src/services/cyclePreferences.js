const { admin, db } = require("../config/firebase");
const { ACADEMIC_DEGREES } = require("../constants/academicDegrees");

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toStringArray(value) {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value.map((v) => normalizeString(v)).filter(Boolean);
}

function uniqStrings(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function mapDegreeAlias(value) {
  const raw = normalizeString(value);
  if (!raw) return "";
  const key = raw.toLowerCase();

  const aliasMap = {
    dam: "Aplicaciones Multiplataforma",
    daw: "Aplicaciones Web"
  };

  return aliasMap[key] || raw;
}

function normalizeDegreeList(value) {
  return uniqStrings(toStringArray(value).map(mapDegreeAlias).filter(Boolean));
}

function extractAllowedDegreesFromUserData(userData) {
  const cf = [];
  const mf = [];

  const objectCandidates = [
    userData?.allowedDegrees,
    userData?.allowed_degrees,
    userData?.ciclosPermitidos,
    userData?.ciclos_permitidos,
    userData?.gradosPermitidos,
    userData?.grados_permitidos,
    userData?.ciclos,
    userData?.grados
  ];

  objectCandidates.forEach((cand) => {
    if (!cand || typeof cand !== "object") return;
    cf.push(
      ...toStringArray(
        cand.ciclo_formativo ??
          cand.ciclos_formativos ??
          cand.ciclosFormativos ??
          cand.ciclos ??
          cand.cf
      )
    );
    mf.push(...toStringArray(cand.master_fp ?? cand.masterFp ?? cand.mf ?? cand.master));
  });

  const arrayCandidatesCf = [
    userData?.ciclos_imparte,
    userData?.ciclosImparte,
    userData?.grados_imparte,
    userData?.gradosImparte,
    userData?.ciclos_formativos,
    userData?.ciclosFormativos
  ];
  arrayCandidatesCf.forEach((cand) => cf.push(...toStringArray(cand)));

  const arrayCandidatesMf = [
    userData?.master_fp_imparte,
    userData?.masterFpImparte,
    userData?.grados_master_fp,
    userData?.gradosMasterFp,
    userData?.masters_imparte,
    userData?.mastersImparte
  ];
  arrayCandidatesMf.forEach((cand) => mf.push(...toStringArray(cand)));

  const normalizedCf = normalizeDegreeList(cf).filter((g) =>
    ACADEMIC_DEGREES.ciclo_formativo.includes(g)
  );
  const normalizedMf = normalizeDegreeList(mf).filter((g) => ACADEMIC_DEGREES.master_fp.includes(g));

  return { ciclo_formativo: normalizedCf, master_fp: normalizedMf };
}

function normalizeRole(raw) {
  const value = normalizeString(raw).toLowerCase().replace(/\s+/g, " ").trim();
  if (!value) return { role: "profesor", isAdmin: false };

  if (value.includes("director")) return { role: "director", isAdmin: true };

  if (value.includes("jefe") && value.includes("estudios")) {
    return { role: "jefe_estudios", isAdmin: true };
  }

  if (value.includes("admin") || value.includes("administrador")) {
    return { role: "admin", isAdmin: true };
  }

  if (value.includes("prof")) return { role: "profesor", isAdmin: false };

  return { role: value, isAdmin: false };
}

function pickFirstNonEmpty(values) {
  for (const v of values) {
    const s = normalizeString(v);
    if (s) return s;
  }
  return "";
}

async function getUserData(userId) {
  const snap = await db.collection("users").doc(userId).get();
  return snap.exists ? snap.data() || {} : {};
}

async function getAllowedDegreesForUser(userId, userClaims) {
  const userData = await getUserData(userId);

  const roleRaw = pickFirstNonEmpty([
    userClaims?.role,
    userClaims?.rol,
    userClaims?.perfil,
    userClaims?.type,
    userClaims?.tipo,
    userData?.role,
    userData?.rol,
    userData?.perfil,
    userData?.tipo_usuario,
    userData?.tipoUsuario,
    userData?.tipo
  ]);

  const roleInfo = normalizeRole(roleRaw);
  let allowedDegrees = roleInfo.isAdmin
    ? {
        ciclo_formativo: [...ACADEMIC_DEGREES.ciclo_formativo],
        master_fp: [...ACADEMIC_DEGREES.master_fp]
      }
    : extractAllowedDegreesFromUserData(userData);

  const isEmptyAllowed =
    !(allowedDegrees?.ciclo_formativo || []).length && !(allowedDegrees?.master_fp || []).length;

  // Backward-compatible fallback: existing users don't have cycles assigned in Firestore yet.
  // Allow seeing/selecting all cycles unless an explicit assignment exists.
  if (!roleInfo.isAdmin && isEmptyAllowed) {
    allowedDegrees = {
      ciclo_formativo: [...ACADEMIC_DEGREES.ciclo_formativo],
      master_fp: [...ACADEMIC_DEGREES.master_fp]
    };
  }

  return { role: roleInfo.role, isAdmin: roleInfo.isAdmin, allowedDegrees, userData };
}

function normalizeDegreesPayload(payload) {
  return {
    ciclo_formativo: normalizeDegreeList(payload?.ciclo_formativo),
    master_fp: normalizeDegreeList(payload?.master_fp)
  };
}

async function getStoredSelectedDegrees(userId) {
  const snap = await db.collection("user_preferences").doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (!data.selectedDegrees || typeof data.selectedDegrees !== "object") return null;
  return normalizeDegreesPayload(data.selectedDegrees);
}

async function getEffectiveSelectedDegreesForUser(userId, allowedDegrees) {
  const stored = await getStoredSelectedDegrees(userId);
  if (!stored) {
    return {
      ciclo_formativo: [...(allowedDegrees?.ciclo_formativo || [])],
      master_fp: [...(allowedDegrees?.master_fp || [])]
    };
  }

  return {
    ciclo_formativo: stored.ciclo_formativo.filter((g) =>
      (allowedDegrees?.ciclo_formativo || []).includes(g)
    ),
    master_fp: stored.master_fp.filter((g) => (allowedDegrees?.master_fp || []).includes(g))
  };
}

function validateSelectedDegreesInput(selectedDegrees, allowedDegrees) {
  const next = normalizeDegreesPayload(selectedDegrees);

  const notAllowedCf = next.ciclo_formativo.filter(
    (g) => !(allowedDegrees?.ciclo_formativo || []).includes(g)
  );
  const notAllowedMf = next.master_fp.filter((g) => !(allowedDegrees?.master_fp || []).includes(g));

  if (notAllowedCf.length || notAllowedMf.length) {
    return {
      ok: false,
      msg: "Hay ciclos no permitidos para este usuario.",
      detail: {
        ciclo_formativo: notAllowedCf,
        master_fp: notAllowedMf
      }
    };
  }

  return { ok: true, selectedDegrees: next };
}

async function saveSelectedDegreesForUser(userId, selectedDegrees) {
  await db
    .collection("user_preferences")
    .doc(userId)
    .set(
      {
        codigo_usuario: userId,
        selectedDegrees: normalizeDegreesPayload(selectedDegrees),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
}

async function getCyclePreferencesForUser(userId, userClaims) {
  const { role, allowedDegrees } = await getAllowedDegreesForUser(userId, userClaims);
  const selectedDegrees = await getEffectiveSelectedDegreesForUser(userId, allowedDegrees);
  return { role, allowedDegrees, selectedDegrees };
}

module.exports = {
  getAllowedDegreesForUser,
  getEffectiveSelectedDegreesForUser,
  validateSelectedDegreesInput,
  saveSelectedDegreesForUser,
  getCyclePreferencesForUser
};
