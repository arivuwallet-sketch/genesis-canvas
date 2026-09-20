import type { MacroSaveEnvelope } from "./MacroTypes";

const MAGIC = new Uint8Array([0x47, 0x4e, 0x53, 0x4d]); // GNSM
const VERSION = 1;

const concat = (a: Uint8Array, b: Uint8Array) => {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
};

export async function serializeMacroSave(
  save: Omit<MacroSaveEnvelope, "version" | "savedAt">,
): Promise<Uint8Array> {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      ...save,
      version: VERSION,
      savedAt: new Date().toISOString(),
    }),
  );

  if (typeof CompressionStream === "undefined") {
    return concat(MAGIC, payload);
  }

  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(payload);
  await writer.close();

  const buffer = await new Response(stream.readable).arrayBuffer();
  return concat(MAGIC, new Uint8Array(buffer));
}

export async function deserializeMacroSave(
  bytes: Uint8Array,
): Promise<MacroSaveEnvelope> {
  if (bytes.length < MAGIC.length) throw new Error("Macro save is truncated.");
  if (!MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error("Invalid macro save header.");
  }

  const compressed = bytes.slice(MAGIC.length);
  let payload: Uint8Array;

  if (typeof DecompressionStream === "undefined") {
    payload = compressed;
  } else {
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    void writer.write(compressed);
    await writer.close();
    payload = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  }

  const decoded = JSON.parse(new TextDecoder().decode(payload)) as MacroSaveEnvelope;
  if (decoded.version !== VERSION) {
    throw new Error(`Unsupported macro save version: ${decoded.version}`);
  }
  return decoded;
}
