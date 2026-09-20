const crypto = require("node:crypto");
const zlib = require("node:zlib");

const MAGIC = Buffer.from([0x47, 0x4e, 0x53, 0x4d]);
const VERSION = 1;

function serializeMacroSave(snapshot) {
  const payload = Buffer.from(JSON.stringify({
    ...snapshot,
    version: VERSION,
    savedAt: new Date().toISOString(),
  }), "utf8");

  const compressed = zlib.gzipSync(payload, { level: 1 });
  return Buffer.concat([MAGIC, Buffer.from([VERSION]), compressed]);
}

function deserializeMacroSave(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (
    buffer.length < MAGIC.length + 1 ||
    !buffer.subarray(0, MAGIC.length).equals(MAGIC) ||
    buffer[4] !== VERSION
  ) {
    throw new Error("Invalid macro save envelope.");
  }

  const json = zlib.gunzipSync(buffer.subarray(5)).toString("utf8");
  const decoded = JSON.parse(json);

  if (decoded.version !== VERSION) {
    throw new Error("Unsupported macro save version.");
  }

  return decoded;
}

function createSaveId(playerId) {
  return crypto.createHash("sha256").update(String(playerId)).digest("hex");
}

module.exports = {
  serializeMacroSave,
  deserializeMacroSave,
  createSaveId,
};
