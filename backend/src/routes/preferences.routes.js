const express = require("express");
const firebaseAuth = require("../middleware/firebaseAuth");
const {
  getAllowedDegreesForUser,
  getEffectiveSelectedDegreesForUser,
  validateSelectedDegreesInput,
  saveSelectedDegreesForUser
} = require("../services/cyclePreferences");

const router = express.Router();

router.use(firebaseAuth);

router.get("/ciclos", async (req, res) => {
  try {
    const userId = req.userId;
    const { role, allowedDegrees } = await getAllowedDegreesForUser(userId, req.userClaims);
    const selectedDegrees = await getEffectiveSelectedDegreesForUser(userId, allowedDegrees);

    return res.json({
      role,
      allowed: allowedDegrees,
      selected: selectedDegrees
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error cargando preferencias." });
  }
});

router.put("/ciclos", async (req, res) => {
  try {
    const userId = req.userId;
    const incoming = req.body?.selected || req.body?.selectedDegrees || req.body?.ciclos || null;

    const { role, allowedDegrees } = await getAllowedDegreesForUser(userId, req.userClaims);
    const validated = validateSelectedDegreesInput(incoming, allowedDegrees);
    if (!validated.ok) {
      return res.status(400).json({ msg: validated.msg, detail: validated.detail });
    }

    await saveSelectedDegreesForUser(userId, validated.selectedDegrees);
    const selectedDegrees = await getEffectiveSelectedDegreesForUser(userId, allowedDegrees);

    return res.json({
      role,
      allowed: allowedDegrees,
      selected: selectedDegrees
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error guardando preferencias." });
  }
});

module.exports = router;

