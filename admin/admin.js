const state = {
  notes: [],
  currentPath: null,
  savedContent: "",
  dirty: false,
}

const $ = (sel) => document.querySelector(sel)
const el = {
  list: $("#note-list"),
  search: $("#note-search"),
  content: $("#note-content"),
  path: $("#note-path"),
  meta: $("#note-meta"),
  empty: $("#empty-state"),
  editor: $("#editor"),
  count: $("#char-count"),
  popup: $("#wl-popup"),
  mirror: $("#caret-mirror"),
  status: $("#status-pill"),
  btnSave: $("#btn-save"),
  btnDelete: $("#btn-delete"),
  btnNew: $("#btn-new"),
  btnRebuild: $("#btn-rebuild"),
  btnPublish: $("#btn-publish"),
  btnView: $("#btn-view"),
  btnLogout: $("#btn-logout"),
  newModal: $("#new-modal"),
  newName: $("#new-name"),
  newError: $("#new-error"),
  confirmModal: $("#confirm-modal"),
  confirmTitle: $("#confirm-title"),
  confirmText: $("#confirm-text"),
}

const encodePath = (p) => btoa(unescape(encodeURIComponent(p)))
const decodePath = (s) => decodeURIComponent(escape(atob(s)))

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
  })
  if (res.status === 401) {
    location.href = "/login"
    throw new Error("Not authenticated")
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/* ---------------- routing ---------------- */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "")
  if (raw.startsWith("edit/")) {
    return { view: "edit", path: decodePath(raw.slice(5)) }
  }
  return { view: "list", path: null }
}

function navigate(path) {
  location.hash = path ? `#/edit/${encodePath(path)}` : "#/"
}

function render() {
  const { view, path } = parseHash()
  if (view === "edit" && path) openEditor(path)
  else closeEditor()
}

/* ---------------- notes list ---------------- */

async function loadNotes() {
  const data = await api("/api/notes")
  state.notes = data.notes || []
  renderList()
}

function renderList() {
  const q = el.search.value.trim().toLowerCase()
  const filtered = state.notes.filter((n) =>
    n.path.toLowerCase().includes(q),
  )
  el.list.innerHTML = ""
  const countRow = document.createElement("li")
  countRow.className = "count-row"
  countRow.textContent = `${filtered.length} note${filtered.length === 1 ? "" : "s"}`
  el.list.appendChild(countRow)
  for (const note of filtered) {
    const li = document.createElement("li")
    li.textContent = note.path
    if (note.path === state.currentPath) li.classList.add("active")
    li.addEventListener("click", () => {
      if (state.dirty && !confirm("Discard unsaved changes?")) return
      navigate(note.path)
    })
    el.list.appendChild(li)
  }
}

/* ---------------- editor ---------------- */

async function openEditor(relPath) {
  state.currentPath = relPath
  const data = await api(`/api/note?path=${encodeURIComponent(relPath)}`)
  el.path.textContent = relPath
  el.empty.classList.add("hidden")
  el.editor.classList.remove("hidden")
  el.content.value = data.content
  state.savedContent = data.content
  state.dirty = false
  updateMeta()
  el.content.focus()
  renderList()
}

function closeEditor() {
  state.currentPath = null
  el.editor.classList.add("hidden")
  el.empty.classList.remove("hidden")
  hidePopup()
  renderList()
}

function updateMeta() {
  const value = el.content.value
  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  el.count.textContent = `${value.length} chars · ~${words} words`
}

function setDirty(dirty) {
  state.dirty = dirty
  el.btnSave.disabled = !dirty
}

async function saveNote() {
  if (!state.currentPath) return
  const content = el.content.value
  await api(`/api/note?path=${encodeURIComponent(state.currentPath)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  })
  state.savedContent = content
  state.dirty = false
  setDirty(false)
  flashStatus("Saved", "ok")
  loadNotes()
}

async function deleteNote() {
  if (!state.currentPath) return
  const relPath = state.currentPath
  await api(`/api/note?path=${encodeURIComponent(relPath)}`, { method: "DELETE" })
  flashStatus(`Deleted ${relPath}`, "ok")
  location.hash = "#/"
  loadNotes()
}

/* ---------------- new note ---------------- */

function openNewModal() {
  el.newError.classList.add("hidden")
  el.newName.value = ""
  el.newModal.classList.remove("hidden")
  el.newName.focus()
}

async function confirmNew() {
  const name = el.newName.value.trim()
  if (!name) {
    el.newError.textContent = "Enter a note name."
    el.newError.classList.remove("hidden")
    return
  }
  try {
    const data = await api("/api/note", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    el.newModal.classList.add("hidden")
    flashStatus(`Created ${data.path}`, "ok")
    state.notes.push({ path: data.path, slug: data.path.replace(/\.md$/i, "") })
    navigate(data.path)
    loadNotes()
  } catch (err) {
    el.newError.textContent = err.message
    el.newError.classList.remove("hidden")
  }
}

/* ---------------- wikilink autocomplete ---------------- */

const popup = {
  items: [],
  active: -1,
  start: -1,
  query: "",
}

function getLineHeight() {
  return parseFloat(getComputedStyle(el.content).lineHeight)
}

function getCharWidth() {
  el.mirror.value = "M"
  return el.mirror.getBoundingClientRect().width / 1
}

function caretPos() {
  const textarea = el.content
  const rect = textarea.getBoundingClientRect()
  const style = getComputedStyle(textarea)
  const paddingTop = parseFloat(style.paddingTop)
  const paddingLeft = parseFloat(style.paddingLeft)
  const fontSize = parseFloat(style.fontSize)
  const lineHeight = parseFloat(style.lineHeight)
  const pos = textarea.selectionStart
  const before = textarea.value.slice(0, pos)
  const lines = before.split("\n")
  const lineNumber = lines.length - 1

  el.mirror.style.fontSize = style.fontSize
  el.mirror.style.lineHeight = style.lineHeight
  el.mirror.value = lines[lines.length - 1]

  const width = el.mirror.value ? el.mirror.scrollWidth : 0
  const charWidth = width / Math.max(1, el.mirror.value.length)
  const col = Math.round(width / Math.max(charWidth, 1))

  return {
    x: rect.left + paddingLeft + col * charWidth,
    y: rect.top + paddingTop + lineNumber * lineHeight + lineHeight + 8,
  }
}

function detectWikilink() {
  const textarea = el.content
  const pos = textarea.selectionStart
  const before = textarea.value.slice(0, pos)
  const m = before.match(/\[\[([^\]\[]*)$/)
  if (!m) return null
  return { start: pos - m[0].length, query: m[1] }
}

function filterNotes(query) {
  const q = query.toLowerCase()
  return state.notes.filter(
    (n) =>
      n.path.toLowerCase().includes(q) ||
      n.slug.toLowerCase().includes(q),
  )
}

function showPopup(query) {
  popup.items = filterNotes(query)
  popup.query = query
  popup.active = -1
  if (!popup.items.length) {
    el.popup.innerHTML = '<div class="wl-empty">No matching notes</div>'
    el.popup.classList.remove("hidden")
    positionPopup()
    return
  }
  renderPopup()
  positionPopup()
}

function renderPopup() {
  el.popup.innerHTML = ""
  popup.items.forEach((item, i) => {
    const div = document.createElement("div")
    div.className = "wl-item" + (i === popup.active ? " active" : "")
    div.innerHTML = `<span class="wl-title"></span><span class="wl-path"></span>`
    div.querySelector(".wl-title").textContent = item.path.replace(/\.md$/i, "")
    div.querySelector(".wl-path").textContent = item.path
    div.addEventListener("mousedown", (e) => {
      e.preventDefault()
      acceptSuggestion(item)
    })
    el.popup.appendChild(div)
  })
}

function positionPopup() {
  const { x, y } = caretPos()
  const pop = el.popup
  pop.style.left = Math.min(x, window.innerWidth - 260) + "px"
  pop.style.top = y + "px"
}

function hidePopup() {
  el.popup.classList.add("hidden")
  popup.items = []
  popup.active = -1
}

function acceptSuggestion(note) {
  const textarea = el.content
  const start = popup.start
  const end = textarea.selectionStart
  const insert = `[[${note.path.replace(/\.md$/i, "")}]]`
  textarea.value = textarea.value.slice(0, start) + insert + textarea.value.slice(end)
  const caret = start + insert.length
  textarea.setSelectionRange(caret, caret)
  hidePopup()
  setDirty(textarea.value !== state.savedContent)
  updateMeta()
  textarea.focus()
}

/* ---------------- status / rebuild / publish ---------------- */

let statusTimer = null
let pendingAction = null

function flashStatus(msg, kind) {
  const pill = el.status
  pill.classList.remove("hidden", "busy", "ok", "err")
  pill.classList.add(kind || "")
  pill.textContent = msg
}

function clearStatus() {
  el.status.classList.add("hidden")
}

async function pollStatus() {
  const data = await api("/api/status")
  const build = data.build
  const publish = data.publish
  if (build.running) {
    flashStatus("Building…", "busy")
    el.btnRebuild.disabled = true
    el.btnPublish.disabled = true
    return true
  }
  if (publish.running) {
    flashStatus("Publishing…", "busy")
    el.btnPublish.disabled = true
    el.btnRebuild.disabled = true
    return true
  }
  el.btnRebuild.disabled = false
  el.btnPublish.disabled = false
  if (pendingAction) {
    const action = pendingAction
    pendingAction = null
    clearTimeout(statusTimer)
    statusTimer = null
    const tail = (action === "build" ? build : publish).output.split("\n").slice(-3).join("\n")
    flashStatus(tail || (action === "build" ? "Build done" : "Published"), (action === "build" ? build : publish).ok ? "ok" : "err")
    setTimeout(clearStatus, 8000)
  }
  return false
}

function watch(action) {
  pendingAction = action
  statusTimer = setInterval(async () => {
    try {
      if (!(await pollStatus())) clearInterval(statusTimer)
    } catch {}
  }, 1200)
}

async function triggerRebuild() {
  el.btnRebuild.disabled = true
  try {
    await api("/api/rebuild", { method: "POST" })
    watch("build")
  } catch (err) {
    flashStatus(err.message, "err")
    el.btnRebuild.disabled = false
  }
}

async function triggerPublish() {
  el.btnPublish.disabled = true
  try {
    await api("/api/publish", { method: "POST" })
    watch("publish")
  } catch (err) {
    flashStatus(err.message, "err")
    el.btnPublish.disabled = false
  }
}

/* ---------------- confirm dialog ---------------- */

let confirmAction = null
function askConfirm(title, text, onOk) {
  el.confirmTitle.textContent = title
  el.confirmText.textContent = text
  confirmAction = onOk
  el.confirmModal.classList.remove("hidden")
}

/* ---------------- init ---------------- */

function init() {
  el.btnSave.addEventListener("click", saveNote)
  el.btnDelete.addEventListener("click", () => {
    askConfirm(
      `Delete "${state.currentPath}"?`,
      "This removes the note file permanently. Run Publish afterwards to remove it from the site.",
      async () => {
        el.confirmModal.classList.add("hidden")
        await deleteNote()
      },
    )
  })
  el.btnNew.addEventListener("click", openNewModal)
  el.btnRebuild.addEventListener("click", triggerRebuild)
  el.btnPublish.addEventListener("click", triggerPublish)
  el.btnView.addEventListener("click", () => (location.href = "/"))
  el.btnLogout.addEventListener("click", () => {
    fetch("/logout", { method: "POST" }).then(() => (location.href = "/login"))
  })

  el.btnCancelNew.addEventListener("click", () => el.newModal.classList.add("hidden"))
  el.btnConfirmNew.addEventListener("click", confirmNew)
  el.newName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmNew()
    if (e.key === "Escape") el.newModal.classList.add("hidden")
  })
  el.btnCancelConfirm.addEventListener("click", () => {
    el.confirmModal.classList.add("hidden")
    confirmAction = null
  })
  el.btnOkConfirm.addEventListener("click", () => {
    const fn = confirmAction
    confirmAction = null
    if (fn) fn()
  })

  el.search.addEventListener("input", renderList)

  el.content.addEventListener("input", () => {
    updateMeta()
    setDirty(el.content.value !== state.savedContent)
    hidePopup()
  })

  el.content.addEventListener("keyup", (e) => {
    const dl = detectWikilink()
    if (dl) {
      popup.start = dl.start
      showPopup(dl.query)
    } else if (!["ArrowDown", "ArrowUp"].includes(e.key)) {
      hidePopup()
    }
  })

  el.content.addEventListener("keydown", (e) => {
    const open = !el.popup.classList.contains("hidden") && popup.items.length
    if (open && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
      if (e.key === "Escape") {
        hidePopup()
        return
      }
      e.preventDefault()
      if (e.key === "ArrowDown") {
        popup.active = (popup.active + 1) % popup.items.length
        renderPopup()
      } else if (e.key === "ArrowUp") {
        popup.active = (popup.active - 1 + popup.items.length) % popup.items.length
        renderPopup()
      } else {
        const item = popup.items[popup.active === -1 ? 0 : popup.active]
        acceptSuggestion(item)
      }
    }
  })

  el.content.addEventListener("scroll", hidePopup)

  window.addEventListener("hashchange", () => {
    if (state.dirty && !confirm("Discard unsaved changes?")) {
      history.replaceState(null, "", `#/edit/${encodePath(state.currentPath)}`)
      render()
      return
    }
    render()
  })

  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
      e.preventDefault()
      e.returnValue = ""
    }
  })

  loadNotes().then(render).catch((err) => flashStatus(err.message, "err"))
  pollStatus()
}

init()
