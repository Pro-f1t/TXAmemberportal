import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { staffRoute } from "@/lib/admin/route";
import { getAllEvents, getPortalConfig } from "@/lib/firebase/portal";
import { getAllMembers } from "@/lib/firebase/members";
import { foldCheckins } from "@/lib/firebase/checkins";
import { recordAudit } from "@/lib/firebase/audit";
import { EVENT_TYPE_LABEL, EventType } from "@/lib/models/Portal";
import { STAFF_ROLES, roleLabel, teamShort } from "@/lib/models/Member";
import { eventTimeRange } from "@/lib/portal/eventTime";

export const runtime = "nodejs";

const TZ = "America/Chicago";
const md = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const full = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" });
const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// Brand-ish palette, light enough to print.
const INK = "FF16141C";
const WHITE = "FFFFFFFF";
const GRID = "FFE5E7EB";
const TYPE_FILL: Record<EventType, string> = {
  gm: "FFEDE9FE", company: "FFFEE2E2", workshop: "FFDCFCE7", profdev: "FFFEF3C7", social: "FFDBEAFE", info: "FFF1F5F9",
};
const border = { top: { style: "thin", color: { argb: GRID } }, left: { style: "thin", color: { argb: GRID } }, bottom: { style: "thin", color: { argb: GRID } }, right: { style: "thin", color: { argb: GRID } } } as const;
const fill = (argb: string) => ({ type: "pattern", pattern: "solid", fgColor: { argb } }) as const;

/**
 * Attendance workbook. "Attendance" = one row per member, one column per event
 * that has started; Name and Total are frozen so they stay put while you scroll
 * across events. "Events" = one row per event with RSVP / attended / show-up rate.
 * Merges pending QR check-ins first so the export matches what's on screen.
 */
export const GET = staffRoute(async ({ member }) => {
  await foldCheckins();
  const [events, members, config] = await Promise.all([getAllEvents(), getAllMembers(), getPortalConfig()]);
  const now = Date.now();
  const held = events.filter((e) => e.status === "published" && e.startsAt.getTime() <= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const people = members
    .filter((m) => m.status === "active" || STAFF_ROLES.includes(m.role))
    .map((m) => ({ m, total: held.filter((e) => e.attendedUids.includes(m.uid)).length }))
    .sort((a, b) => b.total - a.total || a.m.name.localeCompare(b.m.name));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Texas Accelerate Member Portal";
  wb.created = new Date();

  // ---------- Sheet 1: Attendance grid ----------
  const ws = wb.addWorksheet("Attendance", { views: [{ state: "frozen", xSplit: 2, ySplit: 2, zoomScale: 110 }] });
  const firstEventCol = 3;
  const tailCols = ["Role", "Field teams", "Email"];
  const lastCol = firstEventCol + held.length + tailCols.length - 1;

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 9;
  held.forEach((_, i) => (ws.getColumn(firstEventCol + i).width = 13));
  [16, 30, 32].forEach((w, i) => (ws.getColumn(firstEventCol + held.length + i).width = w));

  // Row 1: title bar
  ws.mergeCells(1, 1, 1, Math.max(lastCol, 2));
  const title = ws.getCell(1, 1);
  title.value = `Texas Accelerate · ${config.season} attendance · exported ${full.format(new Date())} · ${people.length} members · ${held.length} events`;
  title.font = { bold: true, size: 13, color: { argb: WHITE } };
  title.fill = fill(INK);
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  // Row 2: headers
  const header = ws.getRow(2);
  header.height = 46;
  const headCell = (col: number, text: string, argb: string, dark: boolean) => {
    const c = header.getCell(col);
    c.value = text;
    c.font = { bold: true, size: 10, color: { argb: dark ? WHITE : INK } };
    c.fill = fill(argb);
    c.alignment = { vertical: "middle", horizontal: col <= 2 || col >= firstEventCol + held.length ? "left" : "center", wrapText: true, indent: col === 1 ? 1 : 0 };
    c.border = border;
  };
  headCell(1, "Name", INK, true);
  headCell(2, "Total", INK, true);
  held.forEach((e, i) => headCell(firstEventCol + i, `${md.format(e.startsAt)}\n${e.title}`, TYPE_FILL[e.type], false));
  tailCols.forEach((t, i) => headCell(firstEventCol + held.length + i, t, INK, true));
  header.getCell(2).alignment = { vertical: "middle", horizontal: "center" };

  // Member rows
  people.forEach(({ m, total }, r) => {
    const row = ws.getRow(3 + r);
    row.height = 20;
    const name = row.getCell(1);
    name.value = m.name;
    name.font = { bold: true, size: 11, color: { argb: INK } };
    name.alignment = { vertical: "middle", indent: 1 };
    const tot = row.getCell(2);
    tot.value = total;
    tot.font = { bold: true, size: 11, color: { argb: "FF1D4ED8" } };
    tot.fill = fill("FFEFF6FF");
    tot.alignment = { vertical: "middle", horizontal: "center" };
    held.forEach((e, i) => {
      const c = row.getCell(firstEventCol + i);
      if (e.attendedUids.includes(m.uid)) {
        c.value = "✓";
        c.font = { bold: true, color: { argb: "FF15803D" } };
        c.fill = fill("FFDCFCE7");
      } else if (e.excusedUids.includes(m.uid)) {
        c.value = "Excused";
        c.font = { italic: true, size: 9, color: { argb: "FF64748B" } };
        c.fill = fill("FFF1F5F9");
      }
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    const tail = [roleLabel(m) || "Member", m.teams.map(teamShort).join(", "), m.email];
    tail.forEach((v, i) => {
      const c = row.getCell(firstEventCol + held.length + i);
      c.value = v;
      c.font = { size: 10, color: { argb: "FF475569" } };
      c.alignment = { vertical: "middle" };
    });
    for (let col = 1; col <= lastCol; col++) row.getCell(col).border = border;
  });

  // Footer: attended per event
  const foot = ws.getRow(3 + people.length);
  foot.height = 22;
  foot.getCell(1).value = "Attended per event";
  foot.getCell(2).value = people.reduce((s, p) => s + p.total, 0);
  held.forEach((e, i) => (foot.getCell(firstEventCol + i).value = e.attendedUids.length));
  for (let col = 1; col <= lastCol; col++) {
    const c = foot.getCell(col);
    c.font = { bold: true, color: { argb: WHITE } };
    c.fill = fill(INK);
    c.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "center", indent: col === 1 ? 1 : 0 };
  }
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2 + people.length, column: lastCol } };

  // ---------- Sheet 2: Events summary ----------
  const es = wb.addWorksheet("Events", { views: [{ state: "frozen", ySplit: 1 }] });
  es.columns = [
    { header: "Date", key: "date", width: 18 },
    { header: "Event", key: "title", width: 34 },
    { header: "Type", key: "type", width: 14 },
    { header: "Time", key: "time", width: 20 },
    { header: "Location", key: "loc", width: 20 },
    { header: "RSVP'd", key: "rsvp", width: 10 },
    { header: "Attended", key: "att", width: 11 },
    { header: "Excused", key: "exc", width: 10 },
    { header: "Show-up rate", key: "rate", width: 14 },
  ];
  es.getRow(1).height = 26;
  es.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: WHITE } };
    c.fill = fill(INK);
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  });
  held.forEach((e) => {
    const row = es.addRow({
      date: full.format(e.startsAt), title: e.title, type: EVENT_TYPE_LABEL[e.type], time: eventTimeRange(e), loc: e.location,
      rsvp: e.rsvpUids.length, att: e.attendedUids.length, exc: e.excusedUids.length,
      rate: e.rsvpUids.length ? e.attendedUids.filter((u) => e.rsvpUids.includes(u)).length / e.rsvpUids.length : null,
    });
    row.height = 20;
    row.getCell("type").fill = fill(TYPE_FILL[e.type]);
    row.getCell("rate").numFmt = "0%";
    row.getCell("att").font = { bold: true };
    row.eachCell({ includeEmpty: true }, (c) => { c.border = border; c.alignment = { ...c.alignment, vertical: "middle" }; });
  });
  es.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + held.length, column: 9 } };

  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: "export.attendance", detail: `Attendance workbook · ${people.length} members × ${held.length} events` });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="txa-attendance-${iso.format(new Date())}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
