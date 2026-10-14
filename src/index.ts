import { httpServerHandler } from "cloudflare:node";
import express from "express";
import { env } from "cloudflare:workers";

const app = express();

app.use(express.json());

// 1. Custom Express Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// JSON Endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Hello Express on Cloudflare Workers!"
  });
});

// 2. Response HTML Sederhana
app.get("/html", (req, res) => {
  const appEnv = process.env.APP_ENV || "development";
  const appName = process.env.APP_NAME || "PaaS Express Worker";

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${appName}</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 90%; }
        h1 { color: #38bdf8; margin-top: 0; }
        .badge { background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 0.875rem; display: inline-block; margin-bottom: 1rem; }
        ul { text-align: left; background: #0f172a; padding: 1rem 1.5rem; border-radius: 8px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🚀 ${appName}</h1>
        <span class="badge">Environment: ${appEnv}</span>
        <p>Aplikasi Express JS berjalan di <strong>Cloudflare Workers</strong>!</p>
        <ul>
          <li>GET /api/status</li>
          <li>GET /api/info</li>
          <li>GET /api/time</li>
          <li>GET /api/hello</li>
          <li>GET /api/db-prep (Persiapan D1)</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    subject: "PaaS",
    week: 5,
    platform: "Cloudflare Workers",
    env: process.env.APP_ENV || "development"
  });
});

app.get("/api/log-test", (req, res) => {
  console.log("Endpoint /api/log-test dipanggil");
  res.json({ logged: true });
});

app.get("/api/info", (req, res) => {
  res.json({
    framework: "Express",
    runtime: "Cloudflare Workers",
    course: "Platform as a Service",
    appName: process.env.APP_NAME || "PaaS Express Worker"
  });
});

app.get("/api/time", (req, res) => {
  res.json({
    timestamp: new Date().toISOString()
  });
});

app.get("/api/hello", (req, res) => {
  const name = "Nadem";
  res.json({
    message: `Hello ${name}`
  });
});

// 5. Persiapan Endpoint untuk Cloudflare D1
app.get("/api/db-prep", (req, res) => {
  res.json({
    message: "Endpoint ini disiapkan untuk integrasi Cloudflare D1 SQLite pada materi berikutnya.",
    status: "Ready for D1 Binding",
    hint: "Tambahkan binding d1_databases di wrangler.jsonc lalu gunakan binding DB dalam handler."
  });
});

function validId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fields(body: any) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const class_name = typeof body?.class_name === "string" ? body.class_name.trim() : "";
  return { name, class_name };
}

// READ ALL
app.get("/api/students", async (_req, res) => {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, class_name FROM students ORDER BY id DESC"
    ).all();
    res.json({ data: results });
  } catch (error) {
    console.error("READ ALL failed", error);
    res.status(500).json({ error: "Database error" });
  }
});

// READ ONE
app.get("/api/students/:id", async (req, res) => {
  const id = validId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const student = await env.DB.prepare(
      "SELECT id, name, class_name FROM students WHERE id = ?"
    ).bind(id).first();
    if (!student) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ data: student });
  } catch (error) {
    console.error("READ ONE failed", error);
    res.status(500).json({ error: "Database error" });
  }
});

// CREATE
app.post("/api/students", async (req, res) => {
  const { name, class_name } = fields(req.body);
  if (!name || !class_name) {
    res.status(400).json({ error: "name and class_name are required" });
    return;
  }
  try {
    const result = await env.DB.prepare(
      "INSERT INTO students (name, class_name) VALUES (?, ?)"
    ).bind(name, class_name).run();
    res.status(201).json({ id: result.meta.last_row_id, name, class_name });
  } catch (error) {
    console.error("CREATE failed", error);
    res.status(500).json({ error: "Database error" });
  }
});

// UPDATE
app.put("/api/students/:id", async (req, res) => {
  const id = validId(req.params.id);
  const { name, class_name } = fields(req.body);
  if (!id || !name || !class_name) {
    res.status(400).json({ error: "Valid ID, name and class_name required" });
    return;
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE students SET name = ?, class_name = ? WHERE id = ?"
    ).bind(name, class_name, id).run();
    if (result.meta.changes === 0) {
      res.status(404).json({ error: "Not found" }); return;
    }
    res.json({ id, name, class_name, updated: true });
  } catch (error) {
    console.error("UPDATE failed", error);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE
app.delete("/api/students/:id", async (req, res) => {
  const id = validId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const result = await env.DB.prepare(
      "DELETE FROM students WHERE id = ?"
    ).bind(id).run();
    if (result.meta.changes === 0) {
      res.status(404).json({ error: "Not found" }); return;
    }
    res.json({ deleted: true, id });
  } catch (error) {
    console.error("DELETE failed", error);
    res.status(500).json({ error: "Database error" });
  }
});


app.listen(3000);
export default httpServerHandler({ port: 3000 });