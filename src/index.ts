import express, {
  type NextFunction,
  type Request,
  type Response
} from "express";
import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import authRouter from "./routes/auth";
import { requireAuth } from "./middleware/auth";
import { allowRoles } from "./middleware/authorize";
import { validId, validateStudentInput } from "./lib/validation";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "student-management-api" });
});

app.use("/api/auth", authRouter);

// READ ALL: viewer, editor, admin
app.get("/api/students", requireAuth, async (_req, res) => {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, class_name, created_at FROM students ORDER BY id DESC"
    ).all();

    return res.json({ data: results });
  } catch {
    console.error("GET students failed");
    return res.status(500).json({ error: "Database error" });
  }
});

// READ ONE: viewer, editor, admin
app.get("/api/students/:id", requireAuth, async (req, res) => {
  const id = validId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid student ID" });
  }

  try {
    const student = await env.DB.prepare(
      "SELECT id, name, class_name, created_at FROM students WHERE id = ?"
    ).bind(id).first();

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json({ data: student });
  } catch {
    console.error("GET student failed");
    return res.status(500).json({ error: "Database error" });
  }
});

// CREATE: editor, admin
app.post(
  "/api/students",
  requireAuth,
  allowRoles("editor", "admin"),
  async (req, res) => {
    const input = validateStudentInput(req.body);

    if (!input) {
      return res.status(400).json({
        error: "name must be 2-80 characters and class_name 2-30 characters"
      });
    }

    try {
      const result = await env.DB.prepare(
        "INSERT INTO students (name, class_name) VALUES (?, ?)"
      ).bind(input.name, input.class_name).run();

      return res.status(201).json({
        id: result.meta.last_row_id,
        name: input.name,
        class_name: input.class_name
      });
    } catch {
      console.error("CREATE student failed");
      return res.status(500).json({ error: "Database error" });
    }
  }
);

// UPDATE: editor, admin
app.put(
  "/api/students/:id",
  requireAuth,
  allowRoles("editor", "admin"),
  async (req, res) => {
    const id = validId(req.params.id);
    const input = validateStudentInput(req.body);

    if (!id) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    if (!input) {
      return res.status(400).json({
        error: "name must be 2-80 characters and class_name 2-30 characters"
      });
    }

    try {
      const result = await env.DB.prepare(
        "UPDATE students SET name = ?, class_name = ? WHERE id = ?"
      ).bind(input.name, input.class_name, id).run();

      if (result.meta.changes === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      return res.json({
        id,
        name: input.name,
        class_name: input.class_name,
        updated: true
      });
    } catch {
      console.error("UPDATE student failed");
      return res.status(500).json({ error: "Database error" });
    }
  }
);

// DELETE: admin only
app.delete(
  "/api/students/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res) => {
    const id = validId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    try {
      const result = await env.DB.prepare(
        "DELETE FROM students WHERE id = ?"
      ).bind(id).run();

      if (result.meta.changes === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      return res.json({ deleted: true, id });
    } catch {
      console.error("DELETE student failed");
      return res.status(500).json({ error: "Database error" });
    }
  }
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// JSON/body parser errors
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const details = error as { type?: string };

  if (details?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  if (error instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.error("Unhandled API error");
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(3000);
export default httpServerHandler({ port: 3000 });