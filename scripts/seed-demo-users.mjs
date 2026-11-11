import { pbkdf2Sync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const iterations = 10000;

const accounts = [
  { email: "viewer@paas.local", role: "viewer" },
  { email: "editor@paas.local", role: "editor" },
  { email: "admin@paas.local", role: "admin" }
];

function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

const statements = [];

console.log("\nKREDENSIAL DEMO — SIMPAN UNTUK PRAKTIKUM\n");

for (const account of accounts) {
  const password = randomBytes(12).toString("base64url");
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");

  const storedHash = [
    "pbkdf2-sha256",
    String(iterations),
    salt.toString("base64"),
    hash
  ].join("$");

  console.log(account.role.toUpperCase() + " | " + account.email + " | " + password);

  const statement =
    "INSERT INTO users (email, password_hash, role) VALUES (" +
    sqlQuote(account.email) + ", " +
    sqlQuote(storedHash) + ", " +
    sqlQuote(account.role) + ") " +
    "ON CONFLICT(email) DO UPDATE SET " +
    "password_hash = excluded.password_hash, role = excluded.role;";

  statements.push(statement);
}

const output = statements.join("\n\n") + "\n";
writeFileSync(new URL("./seed-demo-users.sql", import.meta.url), output, "utf8");

console.log("\nFile scripts/seed-demo-users.sql berhasil dibuat.");
console.log("Jangan jalankan script ini lagi sebelum selesai memakai kredensial yang tercetak.");