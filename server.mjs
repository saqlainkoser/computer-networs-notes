#!/usr/bin/env node
import { createServer } from "node:http"
import { readFile, writeFile, readdir, mkdir, stat, rm } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const CONTENT_DIR = path.join(ROOT, "content")
const PUBLIC_DIR = path.join(ROOT, "public")
const ADMIN_DIR = path.join(ROOT, "admin")

const PORT = Number(process.env.PORT || 3000)
const ADMIN_USER = process.env.ADMIN_USER || "saqlain123"
const ADMIN_PASS = process.env.ADMIN_PASS || "123456"
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_BODY = 2 * 1024 * 1024

const SECRET_FILE = path.join(ROOT, ".admin-secret")
let SESSION_SECRET = process.env.SESSION_SECRET || ""

async function getSecret() {
  if (SESSION_SECRET) return SESSION_SECRET
  try {
    SESSION_SECRET = (await readFile(SECRET_FILE, "utf8")).trim()
  } catch {
    SESSION_SECRET = randomBytes(32).toString("hex")
    await writeFile(SECRET_FILE, SESSION_SECRET, { mode: 0o600 })
  }
  return SESSION_SECRET
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".wasm": "application/wasm",
}

function sign(value) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex")
}

async function createToken(user) {
  const secret = await getSecret()
  SESSION_SECRET = secret
  const expires = Date.now() + SESSION_TTL
  const payload = `${user}:${expires}`
  return `${expires}.${sign(payload)}`
}

async function verifyToken(token) {
  if (!token) return null
  const secret = await getSecret()
  SESSION_SECRET = secret
  const [expiresStr, mac] = token.split(".")
  if (!expiresStr || !mac) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null
  const expected = sign(`${ADMIN_USER}:${expiresStr}`)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return ADMIN_USER
}

function parseCookies(req) {
  const out = {}
  const header = req.headers.cookie
  if (header) {
    for (const part of header.split(";")) {
      const idx = part.indexOf("=")
      if (idx > -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
    }
  }
  return out
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on("data", (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error("Payload too large"))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" })
  res.end(body)
}

function sendHtml(res, html, code = 200, extraHeaders = {}) {
  const headers = { "content-type": "text/html; charset=utf-8", ...extraHeaders }
  res.writeHead(code, headers)
  res.end(html)
}

function slugFromPath(rel) {
  return rel.replace(/\.md$/i, "").replace(/\s+/g, "-").toLowerCase()
}

async function listNotes() {
  const notes = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.name.startsWith(".")) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.name.toLowerCase().endsWith(".md")) {
        const rel = path.relative(CONTENT_DIR, full)
        const st = await stat(full)
        notes.push({
          path: rel,
          slug: slugFromPath(rel),
          size: st.size,
          modified: st.mtime.toISOString(),
        })
      }
    }
  }
  await walk(CONTENT_DIR)
  notes.sort((a, b) => a.path.localeCompare(b.path))
  return notes
}

// --- content path safety ---

function resolveContentPath(rel) {
  const root = path.resolve(CONTENT_DIR)
  const resolved = path.resolve(root, rel)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return resolved
}

async function noteExists(rel) {
  const full = resolveContentPath(rel)
  if (!full) return false
  try {
    const st = await stat(full)
    return st.isFile()
  } catch {
    return false
  }
}

function sanitizeNoteName(name) {
  let n = String(name).trim().replace(/[/\\]/g, "").replace(/\.{2,}/g, ".").replace(/^\./, "")
  if (!n) throw new Error("Note name cannot be empty")
  if (!/\.md$/i.test(n)) n += ".md"
  return n
}

// --- build & publish state ---

let buildState = { running: false, ok: null, output: "", finishedAt: null }
let publishState = { running: false, ok: null, output: "", finishedAt: null }

function runCommand(cmd, args, state, label) {
  state.running = true
  state.ok = null
  state.output = ""
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT })
    const start = Date.now()
    child.stdout.on("data", (d) => (state.output += d.toString()))
    child.stderr.on("data", (d) => (state.output += d.toString()))
    child.on("close", (code) => {
      state.running = false
      state.ok = code === 0
      state.finishedAt = new Date().toISOString()
      state.output += `\n[${label}] exited with code ${code} in ${((Date.now() - start) / 1000).toFixed(1)}s`
      if (code === 0 && !state.finishedAt) state.finishedAt = new Date().toISOString()
      resolve(state)
    })
    child.on("error", (err) => {
      state.running = false
      state.ok = false
      state.output = `[${label}] failed to start: ${err.message}`
      resolve(state)
    })
  })
}

async function doRebuild() {
  if (buildState.running) throw new Error("A build is already running")
  const args = ["quartz", "build", "--directory", "content", "--output", "public"]
  const isWindows = process.platform === "win32"
  await runCommand(isWindows ? "npx.cmd" : "npx", args, buildState, "build")
  return buildState
}

async function doPublish() {
  if (publishState.running) throw new Error("A publish is already running")
  const steps = [
    ["git", ["add", "content"]],
    ["git", ["commit", "-m", "content: update notes"]],
    ["git", ["push", "origin", "HEAD"]],
  ]
  publishState.running = true
  publishState.ok = null
  publishState.output = ""
  try {
    for (const [cmd, args] of steps) {
      publishState.output += `$ ${cmd} ${args.join(" ")}\n`
      const code = await new Promise((resolve) => {
        const child = spawn(cmd, args, { cwd: ROOT })
        child.stdout.on("data", (d) => (publishState.output += d.toString()))
        child.stderr.on("data", (d) => (publishState.output += d.toString()))
        child.on("close", resolve)
        child.on("error", resolve)
      })
      const failed = typeof code === "number" && code !== 0
      if (failed) throw new Error(`"${cmd} ${args.join(" ")}" exited with code ${code}`)
      if (cmd === "commit") {
        const msg = publishState.output.toLowerCase()
        if (msg.includes("nothing to commit")) {
          publishState.ok = true
          publishState.output += "\nNo content changes to publish."
          return publishState
        }
      }
    }
    publishState.ok = true
    publishState.output += "\nPublish complete. GitHub Actions will deploy the site (~1 min)."
  } catch (err) {
    publishState.ok = false
    publishState.output += `\nERROR: ${err.message}`
  } finally {
    publishState.running = false
    publishState.finishedAt = new Date().toISOString()
  }
  return publishState
}

// --- routes ---

function isProtectedUrl(url) {
  return url.startsWith("/admin") || url.startsWith("/api")
}

function authed(req) {
  return verifyToken(parseCookies(req).qzsess)
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Login - DevNotes Admin</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    font-family: system-ui, -apple-system, sans-serif;
    background: #161618; color: #ebebec;
  }
  .card {
    width: min(360px, 92vw); padding: 2rem; border-radius: 12px;
    background: #1e1e22; border: 1px solid #393639;
    box-shadow: 0 10px 30px rgba(0,0,0,.4);
  }
  h1 { font-size: 1.3rem; margin: 0 0 .25rem; }
  p.sub { margin: 0 0 1.5rem; color: #b8b8b8; font-size: .9rem; }
  label { display: block; margin-bottom: 1rem; font-size: .85rem; color: #d4d4d4; }
  label span { display: block; margin-bottom: .4rem; }
  input {
    width: 100%; padding: .6rem .7rem; border-radius: 8px;
    border: 1px solid #393639; background: #161618; color: #ebebec;
    font-size: 1rem;
  }
  button {
    width: 100%; margin-top: .5rem; padding: .65rem; border: 0; border-radius: 8px;
    background: #7b97aa; color: #161618; font-weight: 600; font-size: 1rem; cursor: pointer;
  }
  button:hover { filter: brightness(1.1); }
  .err { margin-top: 1rem; color: #ff8d85; font-size: .85rem; text-align: center; }
</style>
</head>
<body>
  <div class="card">
    <h1>DevNotes Admin</h1>
    <p class="sub">Sign in to edit notes</p>
    <form method="post" action="/login">
      <label><span>Username</span><input name="username" autocomplete="username" autofocus required/></label>
      <label><span>Password</span><input name="password" type="password" autocomplete="current-password" required/></label>
      <button type="submit">Log in</button>
    </form>
    <div class="err">__ERROR__</div>
  </div>
</body>
</html>`

function serveStatic(res, filePath, contentType) {
  const stream = createReadStream(filePath)
  stream.on("error", () => {
    res.writeHead(404, { "content-type": "text/plain" })
    res.end("Not found")
  })
  res.writeHead(200, { "content-type": contentType, "cache-control": "no-cache" })
  stream.pipe(res)
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
  const p = url.pathname

  if (req.method === "POST" && p === "/login") {
    const body = await readBody(req)
    const params = new URLSearchParams(body)
    const user = params.get("username") || ""
    const pass = params.get("password") || ""
    if (safeEqual(user, ADMIN_USER) && safeEqual(pass, ADMIN_PASS)) {
      const token = await createToken(ADMIN_USER)
      res.writeHead(303, {
        location: "/admin",
        "set-cookie": `qzsess=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL / 1000)}`,
      })
      res.end()
    } else {
      sendHtml(res, LOGIN_HTML.replace("__ERROR__", "Invalid username or password"), 401)
    }
    return
  }

  if (req.method === "POST" && p === "/logout") {
    res.writeHead(303, {
      location: "/login",
      "set-cookie": "qzsess=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    })
    res.end()
    return
  }

  if (p === "/login") {
    if (await authed(req)) {
      res.writeHead(303, { location: "/admin" })
      res.end()
      return
    }
    sendHtml(res, LOGIN_HTML.replace("__ERROR__", ""))
    return
  }

  if (isProtectedUrl(p)) {
    const user = await authed(req)
    if (!user) {
      if (p.startsWith("/api")) {
        sendJson(res, 401, { error: "Not authenticated" })
      } else {
        res.writeHead(303, { location: "/login" })
        res.end()
      }
      return
    }
  }

  // ---- admin app ----
  if (p === "/admin" || p === "/admin/") {
    const stream = createReadStream(path.join(ADMIN_DIR, "index.html"))
    stream.on("error", () => sendHtml(res, "Admin UI missing. Re-run setup.", 500))
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" })
    stream.pipe(res)
    return
  }

  if (p.startsWith("/admin/")) {
    const rel = p.slice("/admin/".length)
    const filePath = path.resolve(ADMIN_DIR, rel.replace(/\.\./g, ""))
    const ext = path.extname(filePath).toLowerCase()
    const type = MIME[ext]
    if (type && filePath.startsWith(ADMIN_DIR)) {
      serveStatic(res, filePath, type)
      return
    }
  }

  // ---- API ----
  if (p.startsWith("/api/")) {
    await handleApi(req, res, url)
    return
  }

  // ---- site (built public/) ----
  const sitePath = path.resolve(PUBLIC_DIR, "." + p)
  const ext = path.extname(sitePath).toLowerCase()
  const type = MIME[ext]
  const candidates = [sitePath, path.join(sitePath, "index.html")]
  for (const candidate of candidates) {
    if (candidate.startsWith(PUBLIC_DIR)) {
      try {
        if ((await stat(candidate)).isFile()) {
          serveStatic(res, candidate, type || "text/html; charset=utf-8")
          return
        }
      } catch {}
    }
  }
  // fallback to 404 page if it exists
  const notFound = path.join(PUBLIC_DIR, "404.html")
  try {
    await stat(notFound)
    serveStatic(res, notFound, "text/html; charset=utf-8")
    return
  } catch {}
  res.writeHead(404, { "content-type": "text/plain" })
  res.end("Not found")
}

async function handleApi(req, res, url) {
  const p = url.pathname
  try {
    if (p === "/api/notes" && req.method === "GET") {
      const notes = await listNotes()
      sendJson(res, 200, { notes })
      return
    }

    if (p === "/api/note" && req.method === "GET") {
      const rel = url.searchParams.get("path") || ""
      const full = resolveContentPath(rel)
      if (!full || !(await noteExists(rel))) {
        sendJson(res, 404, { error: "Note not found" })
        return
      }
      const content = await readFile(full, "utf8")
      sendJson(res, 200, { path: rel, content })
      return
    }

    if (p === "/api/note" && req.method === "PUT") {
      const rel = url.searchParams.get("path") || ""
      const full = resolveContentPath(rel)
      if (!full) {
        sendJson(res, 400, { error: "Invalid path" })
        return
      }
      const body = JSON.parse(await readBody(req) || "{}")
      if (typeof body.content !== "string") {
        sendJson(res, 400, { error: "Missing content" })
        return
      }
      await mkdir(path.dirname(full), { recursive: true })
      await writeFile(full, body.content, "utf8")
      sendJson(res, 200, { ok: true, path: rel })
      return
    }

    if (p === "/api/note" && req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}")
      const name = sanitizeNoteName(body.name || "")
      let rel = name
      const full = resolveContentPath(rel)
      if (!full) {
        sendJson(res, 400, { error: "Invalid name" })
        return
      }
      if (await noteExists(rel)) {
        sendJson(res, 409, { error: "A note with this name already exists", path: rel })
        return
      }
      const title = name.replace(/\.md$/i, "")
      const content = `---\ntitle: ${title}\n---\n\n# ${title}\n\n`
      await writeFile(full, content, "utf8")
      sendJson(res, 200, { ok: true, path: rel })
      return
    }

    if (p === "/api/note" && req.method === "DELETE") {
      const rel = url.searchParams.get("path") || ""
      const full = resolveContentPath(rel)
      if (!full) {
        sendJson(res, 400, { error: "Invalid path" })
        return
      }
      if (!(await noteExists(rel))) {
        sendJson(res, 404, { error: "Note not found" })
        return
      }
      await rm(full, { force: true })
      sendJson(res, 200, { ok: true, path: rel })
      return
    }

    if (p === "/api/rebuild" && req.method === "POST") {
      if (buildState.running) {
        sendJson(res, 409, { error: "A build is already running", status: buildState })
        return
      }
      await doRebuild()
      sendJson(res, 200, { ok: true, status: buildState })
      return
    }

    if (p === "/api/rebuild" && req.method === "GET") {
      sendJson(res, 200, { status: buildState })
      return
    }

    if (p === "/api/publish" && req.method === "POST") {
      if (publishState.running) {
        sendJson(res, 409, { error: "A publish is already running", status: publishState })
        return
      }
      await doPublish()
      sendJson(res, 200, { ok: true, status: publishState })
      return
    }

    if (p === "/api/status" && req.method === "GET") {
      sendJson(res, 200, { build: buildState, publish: publishState })
      return
    }

    sendJson(res, 404, { error: "Unknown API endpoint" })
  } catch (err) {
    sendJson(res, 500, { error: err.message })
  }
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" })
    }
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  const host = process.env.HOST || "localhost"
  console.log("")
  console.log("  DevNotes Admin is running")
  console.log(`  Site:     http://${host}:${PORT}/`)
  console.log(`  Login:    http://${host}:${PORT}/login`)
  console.log(`  Admin:    http://${host}:${PORT}/admin`)
  console.log(`  Creds:    ${ADMIN_USER} / ${ADMIN_PASS}`)
  console.log("")
  if (host !== "localhost" && host !== "127.0.0.1") {
    console.log("  WARNING: Exposing the admin editing interface over the network.")
    console.log("           Put this behind HTTPS (e.g. Caddy/nginx) and change")
    console.log("           ADMIN_USER/ADMIN_PASS/EMAIL_SESSION_SECRET env vars.")
    console.log("")
  }
})

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))