export type StudentInput = {
  name: string;
  class_name: string;
};

export function validId(raw: string | string[]): number | null {
  if (typeof raw !== "string" || !/^[1-9][0-9]*$/.test(raw)) {
    return null;
  }

  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export function validateStudentInput(body: unknown): StudentInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const class_name =
    typeof input.class_name === "string" ? input.class_name.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return null;
  }

  if (class_name.length < 2 || class_name.length > 30) {
    return null;
  }

  return { name, class_name };
}