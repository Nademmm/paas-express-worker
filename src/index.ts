import { httpServerHandler } from "cloudflare:node";
import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({
    message: "Hello Express on Cloudflare Workers!"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    subject: "PaaS",
    week: 5,
    platform: "Cloudflare Workers"
  });
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });