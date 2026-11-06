// Branchline regression tests (all former tests/*.test.cjs merged into one file).
// Run: node --test tests/
"use strict";

// ===== cloud-only-catalog-v762.test.cjs =====
{

const fs=require("node:fs"),path=require("node:path"),test=require("node:test"),assert=require("node:assert/strict");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const side=read("app.js"),boot=read("app.js");
const drive=read("app.js"),safe=read("app.js");
test("Sidebar lists verified Drive IDs only and hides local previews",()=>{
 assert.match(side,/DriveDB\.cloudCatalogReady === true/);
 assert.match(side,/const visibleMaps = visibleVerifiedMaps\(\)/);
 assert.match(side,/DriveDB\.cloudCatalogIds\.has\(m\.id\)/);
 assert.doesNotMatch(side,/return startupLocalPreview \|\|/);
 assert.match(boot,/cloudOnlyMapList = hadDriveSession/);
 assert.doesNotMatch(boot,/await openMap\(toOpen\)/);
 assert.match(read("style.css"),/body\.signed-out #mindmap-list\{display:none!important\}/);
});
test("Old cached maps cannot become cloud files without explicit creation",()=>{
 assert.match(drive,/pendingCloudCreates: new Set\(\)/);
 assert.match(drive,/async rememberCloudCreate\(id\)/);
 assert.match(drive,/!this\.fileIndex\[id\] && !this\.pendingCloudCreates\.has\(id\)/);
 assert.match(drive,/if \(!known\) return includeNew && this\.pendingCloudCreates\.has\(m\.id\)/);
 assert.match(drive,/this\.cloudCatalogIds = new Set\(seenRemoteIds\)/);
 assert.match(drive,/await this\.finishCloudCreate\(id\)/);
 assert.match(side,/await DriveDB\.rememberCloudCreate\(m\.id\)/);
 assert.match(boot,/await DriveDB\.loadPendingCloudCreates\(\)/);
});
test("Missing Drive revisions cannot silently replace unsaved work",()=>{
 assert.match(drive,/this\.cloudCatalogReady = false;\s*this\.conflictDetected = true;[\s\S]*?throw new Error/);
 assert.match(drive,/!snapshot \|\| !sameSyncContent\(existing, snapshot\)/);
 assert.match(boot,/if \(!cloudOnlyMapList && FolderDB\.dir/);
 assert.match(boot,/if \(!cloudOnlyMapList && mapsReadyToShow\(\)\)/);
  assert.match(safe,/return mapsReadyToShow\(\) && \(!DriveDB\.conflictDetected \|\| driveUnavailable\(\)\)/);
});
test("v762 browsers and PWAs request the latest sources",()=>{
 assert.match(read("index.html"),/app\.js\?v=772/);
 assert.match(read("index.html"),/style\.css\?v=772/);
 assert.match(read("sw.js"),/branchline-pwa-v772/);
 assert.match(read("sw.js"),/app\.js\?v=772/);
});

}

// ===== focus-mode-layer.test.cjs =====
{
/**
 * Focus Mode stacking regression (v762).
 * Run: node --test tests/focus-mode-layer.test.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

test("Focus Mode covers Task List, nested popups, and sidebar", () => {
  const style = read("style.css");
  const block = style.match(/\.subtask-focus-overlay\s*\{([^}]*)\}/);
  assert.ok(block, "Focus Mode overlay CSS exists");
  assert.match(block[1], /position\s*:\s*fixed/);
  assert.match(block[1], /inset\s*:\s*0/);
  const value = block[1].match(/z-index\s*:\s*(\d+)/);
  assert.ok(value, "Focus Mode defines z-index");
  const layer = Number(value[1]);
  const otherStyles = style.replace(block[0], "");
  const otherLayers = Array.from(otherStyles.matchAll(/z-index\s*:\s*(\d+)/g), m => Number(m[1]));
  assert.ok(layer > Math.max(...otherLayers), "Focus Mode must exceed every app CSS layer");
  assert.ok(layer < 2147483647, "Fatal boot error banner remains visible");
  assert.match(style, /\.subtask-focus-overlay\.hidden\s*\{\s*display\s*:\s*none\s*!important/);
});

test("Focus Mode entry point is loaded and hosted at body level", () => {
  const loader = read("app.js");
  const focus = read("app.js");
  const tasks = read("app.js");
  assert.match(loader, /js\/15b-subtask-focus-mode\.js\n/);
  assert.ok(loader.indexOf("js/15b-subtask-focus-mode.js\n") < loader.indexOf("js/16-tasks-editor-2.js\n"));
  assert.match(tasks, /openSubtaskFocusMode\(t, s, sourceTarget\)/);
  assert.match(focus, /document\.body\.appendChild\(overlay\)/);
  assert.match(focus, /overlay\.classList\.remove\("hidden"\)/);
});

test("Focus Mode CSS and scripts are cache-busted together", () => {
  const index = read("index.html");
  const sw = read("sw.js");
  assert.match(index, /style\.css\?v=772/);
  assert.match(index, /app\.js\?v=772/);
  assert.match(index, /sw\.js\?v=772/);
  assert.match(sw, /branchline-pwa-v772/);
  assert.match(sw, /app\.js\?v=772/);
});

}

// ===== google-drive-session-renewal-v766.test.cjs =====
{

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("A Google token renews earlier during active use", () => {
  const drive = read("app.js");
  assert.match(drive, /DRIVE_GESTURE_RENEW_WINDOW_MS = 25 \* 60 \* 1000/);
  assert.match(drive, /remaining > DRIVE_GESTURE_RENEW_WINDOW_MS/);
  assert.match(drive, /await this\.requestToken\(false\)/);
  assert.match(drive, /if \(silent\) \{\s*return Promise\.reject/);
  assert.match(drive, /loadCachedDriveToken\(\)/);
});

test("Ordinary app clicks never open the Google login popup", () => {
  const boot = read("app.js");
  assert.doesNotMatch(boot, /DriveDB\.renewFromUserGesture\(\)/);
});

test("App shell updates together and preserves cached signed-in browser state", () => {
  assert.match(read("index.html"), /app\.js\?v=772/);
  assert.match(read("index.html"), /sw\.js\?v=772/);
  assert.match(read("sw.js"), /branchline-pwa-v772/);
  assert.match(read("sw.js"), /app\.js\?v=772/);
  assert.doesNotMatch(read("app.js"), /localStorage\.clear\(\)/);
});

}

// ===== popup-layer-emergency-v761.test.cjs =====
{
/**
 * Popup layer + Emergency Glow regressions (v761).
 * Static production-source checks. Browser interaction needs manual smoke test.
 */

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("style.css");
const v761 = css.slice(css.indexOf("/* v761 — strong, readable Emergency Glow"));
test("Emergency Glow is shared by Queue, Tasks, Calendar and Notes", () => {
  assert.ok(v761.length > 500, "Latest override must exist");
  for (const selector of [
    ".subtask-row.emergency-glow",
    "#tasks-modal .subtask-row.emergency-glow",
    "#tasks-modal .shared-queue-subtask-panel .subtask-row.emergency-glow",
    "#cal-day-modal-backdrop .subtask-row.emergency-glow",
    "#note-modal .subtask-row.emergency-glow"
  ]) assert.ok(v761.includes(selector), "Emergency surface missing: " + selector);
  assert.match(v761, /@keyframes emergency-beacon-v761/);
  assert.match(v761, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(v761, /animation:none !important/);
  assert.match(v761, /outline:2px solid rgba\(255,54,34,\.98\) !important/);
  for (const file of ["app.js", "app.js", "app.js"])
    assert.match(read(file), /emergencyGlow \? " emergency-glow"/);
});
test("Every fixed BODY popover sits above dynamically raised task and note modals", () => {
  const rules = v761.split(/\}\s*/);
  const pop = rules.find(r => r.includes(".task-color-popover") && r.includes(".folder-move-popover"));
  assert.ok(pop, "Missing body-level floating layer");
  for (const selector of [
    ".task-color-popover", ".task-templates-popover",
    ".note-color-popover:not(#note-emoji-popover)",
    ".photo-modal-symbol-popover:not(#photo-modal-combine-popover)",
    ".folder-move-popover", ".editor-photo-menu", ".note-img-shrink-btn",
    "#google-links-menu"
  ]) assert.ok(pop.includes(selector), "Unprotected floating popup: " + selector);
  const layer = Number(pop.match(/z-index:(\d+)/)[1]);
  assert.ok(layer > 3000000 && layer < 3200000, "Popup must be over context menu, below description dialog");
  assert.match(v761, /#note-emoji-popover,[\s\S]*?#photo-modal-combine-popover\s*\{\s*z-index:2147483000 !important/);
  assert.match(v761, /\.subtask-touch-drag-ghost\s*\{\s*z-index:3110000 !important/);
  assert.match(v761, /\.app-toast\s*\{\s*z-index:3120000 !important/);
});
test("Layer priorities preserve Focus Mode over floating controls and boot error banner", () => {
  assert.match(css, /\.subtask-focus-overlay\s*\{[^}]*z-index:2147483500 !important/s);
  const values = [...v761.matchAll(/z-index:(\d+) !important/g)].map(m => Number(m[1]));
  assert.ok(values.every(n => n < 2147483500));
  const index = read("index.html"), sw = read("sw.js");
  assert.match(index, /style\.css\?v=772/);
  assert.match(index, /app\.js\?v=772/);
  assert.match(index, /sw\.js\?v=772/);
  assert.match(sw, /branchline-pwa-v772/);
  assert.match(sw, /app\.js\?v=772/);
});

}

// ===== recovery-sync-v759.test.cjs =====
{
/**
 * Branchline Drive single-writer regression tests (v759).
 * Run: node --test tests/recovery-sync-v759.test.cjs
 * No Google credentials/network/browser needed. The methods under test are
 * extracted from production js/02-google-drive-sync.js, not reimplemented.
 */

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
function between(first, last) {
  const a = source.indexOf(first), b = source.indexOf(last, a);
  assert.ok(a >= 0 && b > a, "Missing production method " + first);
  return source.slice(a, b).trim().replace(/,\s*$/, "");
}
const clone = value => JSON.parse(JSON.stringify(value));
const canonicalMethod = between("    canonicalRemoteFiles(files) {", "    driveFormatFor(file) {");
const saveMethods = between("    async save(map, opts) {", "    // ---- Shared settings file");
const fakeConsole = { info() {}, warn() {}, error() {} };
const mkRemote = (fileId, mapId, revision, editAt = revision, modifiedTime = "") => ({
  id: fileId, modifiedTime,
  appProperties: {
    branchlineId: mapId, updatedAt: String(revision), lastEditAt: String(editAt)
  }
});

function makeCanonical() {
  const api = new Function("console", "return ({" + canonicalMethod + "});")(fakeConsole);
  api.fileIndex = {};
  return api;
}

function makeSaver({ listed = [], locks = undefined, gate = null } = {}) {
  let remote = { updatedAt: 1, lastEditAt: 1 };
  const uploads = [], snapshots = [], photoCleanup = [], failedSaves = [];
  const bases = [];
  const navigator = { onLine: true };
  if (locks) navigator.locks = locks;
  const deps = {
    navigator, console: fakeConsole, cloudOnlyMapList: false,
    ensureRecoveredEditLog() {}, updateDriveUI() {},
    pollDriveUpdates() {}, ensurePhotosMigrated: async () => {},
    editClone: clone,
    collectReferencedPhotoIds: () => new Set(),
    DB: { put: async () => {} },
    nextUpdatedAt: m => Number(m.updatedAt) + 1,
    sameSyncContent: (a, b) => JSON.stringify(a.root) === JSON.stringify(b.root),
    mapLastEditAt: m => Number(m._lastEditAt) || 0,
    setSyncBase: (id, stamp) => bases.push(stamp),
    setSyncSnapshot: async (id, map) => snapshots.push(clone(map)),
    showToast() {}, setTimeout() {}
  };
  const names = Object.keys(deps);
  const api = new Function(...names, "return ({" + saveMethods + "});")
    (...Object.values(deps));
  Object.assign(api, {
    status: "ok", signedIn: true, needsReauth: false,
    cloudCatalogIds: new Set(), pendingCloudCreates: new Set(),
    async finishCloudCreate() {},
    accessToken: "test-token", tokenExpiresAt: Date.now() + 100000,
    _mapSaveQueue: new Map(), photoHydratedMaps: new Set(), fileIndex: {},
    setSyncProgress() {},
    async listRemote() { return listed; },
    canonicalRemoteFiles: makeCanonical().canonicalRemoteFiles,
    driveFormatFor: () => "2",
    async readRemoteStamp() { return { ...remote }; },
    async syncPhotosForMap() {
      return { referenced: new Set(), remote: {}, quarantined: [] };
    },
    async updateFile(fileId, map) {
      // Simulate the await between metadata PATCH and JSON PUT.
      if (gate && uploads.length === 0) {
        gate.entered();
        await gate.wait;
      }
      const uploaded = clone(map);
      uploads.push(uploaded);
      remote = { updatedAt: uploaded.updatedAt, lastEditAt: uploaded._lastEditAt };
    },
    async createFile(map) {
      const uploaded = clone(map);
      uploads.push(uploaded);
      remote = { updatedAt: uploaded.updatedAt, lastEditAt: uploaded._lastEditAt };
      return "created-map-file";
    },
    async verifyUploadedStamp(fileId, expected) {
      return remote.updatedAt === expected;
    },
    async cleanupRemotePhotos(mapId, refs) {
      photoCleanup.push({ mapId, count: refs.size });
    }
  });
  api.canonicalRemoteFiles = api.canonicalRemoteFiles.bind(api);
  return { api, uploads, snapshots, photoCleanup, bases, failedSaves };
}

test("duplicate Drive map IDs choose one stable canonical file regardless of list order", () => {
  const api = makeCanonical();
  api.fileIndex = { m: { fileId: "preferred" } };
  const one = mkRemote("old", "m", 10, 10);
  const two = mkRemote("new", "m", 20, 20);
  const another = mkRemote("untouched", "other-map", 1, 1);
  assert.deepEqual(api.canonicalRemoteFiles([one, two, another]).map(f => f.id), ["new", "untouched"]);
  assert.deepEqual(api.canonicalRemoteFiles([two, one, another]).map(f => f.id), ["new", "untouched"]);
  assert.equal(api.duplicateRemoteMapIds.get("m"), 2);
  const tiedA = mkRemote("preferred", "m", 30, 30, "2026-01-01T00:00:00Z");
  const tiedB = mkRemote("other", "m", 30, 30, "2026-01-01T00:00:00Z");
  assert.equal(api.canonicalRemoteFiles([tiedB, tiedA])[0].id, "preferred");
  assert.equal(api.canonicalRemoteFiles([tiedA, tiedB])[0].id, "preferred");
});

test("typing during an in-progress PUT uploads immutable revisions in order", async () => {
  let entered;
  const arrived = new Promise(resolve => entered = resolve);
  let release;
  const wait = new Promise(resolve => release = resolve);
  const { api, uploads, snapshots } = makeSaver({ gate: { entered, wait } });
  api.fileIndex.m = { fileId: "drive-file", updatedAt: 1, lastEditAt: 1 };
  const map = { id: "m", root: { id: "root", text: "old" },
    updatedAt: 2, _lastEditAt: 2, links: [] };
  const initialSave = api.save(map);
  await arrived;
  map.root.text = "new";
  map.updatedAt = 3;
  map._lastEditAt = 3;
  const nextSave = api.save(map);
  assert.equal(uploads.length, 0, "First PUT is deliberately suspended");
  release();
  assert.deepEqual(await Promise.all([initialSave, nextSave]), [true, true]);
  assert.deepEqual(uploads.map(m => m.root.text), ["old", "new"]);
  assert.deepEqual(snapshots.map(m => m.root.text), ["old", "new"]);
  assert.deepEqual(snapshots.map(m => m.updatedAt), [2, 3]);
  assert.equal(api.fileIndex.m.updatedAt, 3);
  assert.equal(api._mapSaveQueue.size, 0);
});

test("repeated single-PC updates converge without changing file ID or creating extra files", async () => {
  const { api, uploads, snapshots } = makeSaver();
  api.fileIndex.m = { fileId: "drive-file", updatedAt: 1, lastEditAt: 1 };
  const map = { id: "m", root: { id: "root", text: "0" },
    updatedAt: 1, _lastEditAt: 1, links: [] };
  for (let i = 2; i <= 32; i++) {
    map.root.text = String(i);
    map.updatedAt = i;
    map._lastEditAt = i;
    assert.equal(await api.save(map), true, "Save " + i);
    assert.equal(api.fileIndex.m.fileId, "drive-file");
  }
  assert.equal(uploads.length, 31);
  assert.equal(snapshots.length, 31);
  assert.deepEqual(uploads.map(x => x.root.text), snapshots.map(x => x.root.text));
  assert.equal(api.fileIndex.m.updatedAt, 32);
});

test("a map with an existing Drive manifest never creates another on first local upload", async () => {
  const remote = mkRemote("already-on-drive", "m", 12, 12);
  const { api, uploads } = makeSaver({ listed: [remote] });
  const map = { id: "m", root: { id: "r", text: "edited" },
    updatedAt: 13, _lastEditAt: 13 };
  assert.equal(await api.save(map), false, "must defer until Drive is reconciled");
  assert.equal(uploads.length, 0, "no duplicate file created");
  assert.equal(api.fileIndex.m.fileId, "already-on-drive");
  assert.equal(api.conflictDetected, true);
});

test("first save of a genuinely new map creates one manifest", async () => {
  const { api, uploads, snapshots } = makeSaver();
  const map = { id: "new-map", root: { id: "r", text: "first" },
    updatedAt: 2, _lastEditAt: 2 };
  assert.equal(await api.save(map), true);
  assert.equal(uploads.length, 1);
  assert.equal(snapshots.length, 1);
  assert.equal(api.fileIndex["new-map"].fileId, "created-map-file");
});


test("a newer unsaved edit remains protected while the previous Drive upload completes", async () => {
  const sidebar = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
  const a = sidebar.indexOf("  async function runPersistNow() {");
  const b = sidebar.indexOf("  // Guards against overlapping saves:", a);
  assert.ok(a >= 0 && b > a);
  const liveMap = { id: "m", root: { id: "r", text: "before" }, updatedAt: 1 };
  let signal;
  const entered = new Promise(resolve => signal = resolve);
  let release;
  const wait = new Promise(resolve => release = resolve);
  const state = { current: liveMap, maps: [liveMap], scale: 1, tx: 0, ty: 0 };
  const deps = {
    state, navigator: { onLine: true },
    saveStatus: { textContent: "", className: "" },
    recordPendingEditLog() {}, nextUpdatedAt: m => Number(m.updatedAt) + 1,
    takePendingPhotoDeletes: () => [],
    DB: { put: async () => {} },
    releasePhotoDeletes: async () => {},
    requeuePhotoDeletes() {},
    FolderDB: { save: async () => {} },
    sortMaps() {}, renderSidebar() {}, updateSaveStatusLabel() {},
    scheduleAutoPhotoCleanup() {},
    DriveDB: {
      signedIn: true, needsReauth: false,
      async save() { signal(); await wait; return true; }
    }
  };
  const params = Object.keys(deps);
  const run = new Function(...params, [
    "let persistTimer = 1, unsavedEdits = true, persistAgainAfter = false, lastSavedAt = 0;",
    sidebar.slice(a, b),
    "return { runPersistNow, markPending() { persistTimer = 42; unsavedEdits = true; }, getDirty() { return unsavedEdits; } };"
  ].join("\n"))(...Object.values(deps));
  const saving = run.runPersistNow();
  await entered;
  liveMap.root.text = "new edit";
  liveMap.updatedAt += 1;
  run.markPending();
  release();
  await saving;
  assert.equal(run.getDirty(), true, "next edit must stay unsaved/locked until its own save");
});

}

// ===== task-pill-inline-icons-v767.test.cjs =====
{

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const read = filename => fs.readFileSync(path.join(__dirname, "..", filename), "utf8");

test("All Task note icons remain inside the pill", () => {
  const helper = read("app.js");
  const match = helper.match(/function liftSubtaskControlsOutsidePill\(row\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(match, "Pill helper exists");
  assert.match(match[1], /el\.matches\("\.subtask-step-track-inline, \.subsubtask-toggle"\)/);
  assert.doesNotMatch(match[1], /el\.matches\([^)]*\.subtask-note-icon/);
  const task = read("app.js");
  const calendar = read("app.js");
  assert.match(task, /if \(brainstormIcon\) row\.appendChild\(brainstormIcon\);\s*if \(snote\) row\.appendChild\(snote\);\s*[\s\S]*?liftSubtaskControlsOutsidePill\(row\)/);
  assert.match(calendar, /if \(calBrainstormIcon\) row\.appendChild\(calBrainstormIcon\);\s*if \(calNoteIcon\) row\.appendChild\(calNoteIcon\);\s*[\s\S]*?liftSubtaskControlsOutsidePill\(row\)/);
});
test("Inline icons are laid out within pills at desktop and phone widths", () => {
  const css = read("style.css");
  assert.match(css, /\.subtask-row > \.subtask-note-icon\s*\{[^}]*position:relative/);
  assert.match(css, /\.subtask-row > \.subtask-note-icon\s*\{[^}]*z-index:2/);
  assert.doesNotMatch(css, /\.subtask-row > \.subtask-outside-controls > \.subtask-note-icon/);
  assert.match(css, /@media\(max-width:640px\)\{\s*\.subtask-row > \.subtask-outside-controls\{[^}]*\}\s*\.subtask-row > \.subtask-note-icon\{/);
});
test("HTML and PWA versioning deploy the changed CSS and JS", () => {
  assert.match(read("index.html"), /app\.js\?v=772/);
  assert.match(read("index.html"), /style\.css\?v=772/);
  assert.match(read("index.html"), /sw\.js\?v=772/);
  assert.match(read("sw.js"), /branchline-pwa-v772/);
});

}
