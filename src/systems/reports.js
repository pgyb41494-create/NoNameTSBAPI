const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("reports.json", { reports: [] });

function list(status = null) {
  const db = store.load();
  const reports = db.reports || [];
  if (!status) return reports;
  return reports.filter((r) => r.status === status);
}

function create(report) {
  let created = null;
  store.updateSync((db) => {
    if (!db.reports) db.reports = [];
    created = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reporterId: String(report.reporterId),
      reporterName: report.reporterName || null,
      reporterAvatar: report.reporterAvatar || null,
      reportedId: String(report.reportedId),
      reportedName: report.reportedName || null,
      reason: report.reason || "No reason provided",
      proof: report.proof || "",
      when: report.when || null,
      where: report.where || "",
      status: "pending",
      at: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
    };
    db.reports = [created, ...db.reports].slice(0, 500);
    return db;
  });
  return created;
}

function get(id) {
  return list().find((r) => r.id === id) || null;
}

function update(id, patch) {
  let updated = null;
  store.updateSync((db) => {
    db.reports = (db.reports || []).map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, ...patch };
      return updated;
    });
    return db;
  });
  return updated;
}

module.exports = { list, create, get, update };
