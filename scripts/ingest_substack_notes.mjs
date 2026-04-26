#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONFIG_PATH = path.join(ROOT, "config", "substack-sources.json");
const DEFAULT_OUTPUT_DIR = path.join(ROOT, "content", "substack", "data");
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_OUTPUT_DIR, "feed.json");
const USER_AGENT =
  "evolution-unfiltered-ingestor/2.0 (+https://evolutionunfiltered.com)";
const FETCH_TIMEOUT_MS = 15000;
const NOTES_PER_PROFILE = 25;

function parseArgs(argv) {
  const args = { config: DEFAULT_CONFIG_PATH, output: DEFAULT_OUTPUT_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;
    if (key === "--config") args.config = path.resolve(value);
    if (key === "--output") args.output = path.resolve(value);
  }
  return args;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, ...(init.headers || {}) },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(value) {
  if (!value) return "";
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "-")
    .replace(/&ndash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function extractTag(block, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "i"));
  if (!match) return null;
  return stripCdata(match[1]).trim();
}

function extractAllTags(block, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...block.matchAll(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "gi"))]
    .map((m) => stripCdata(m[1]).trim())
    .filter(Boolean);
}

function htmlToText(value) {
  if (!value) return "";
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function buildItemId(sourceId, key) {
  const digest = crypto.createHash("sha1").update(String(key)).digest("hex").slice(0, 16);
  return `${sourceId}-${digest}`;
}

async function readConfig(configPath) {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw.replace(/^﻿/, ""));
  return (parsed.sources || []).filter((s) => s.enabled !== false);
}

async function lookupUserId(handle) {
  const url = `https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`profile lookup HTTP ${response.status} for ${handle}`);
  }
  const data = await response.json();
  if (!data || typeof data.id !== "number") {
    throw new Error(`profile lookup returned no id for ${handle}`);
  }
  return data.id;
}

async function fetchProfileNotes(source, fetchedAt) {
  const userId = await lookupUserId(source.profile_handle);
  const url = `https://substack.com/api/v1/reader/feed/profile/${userId}?limit=${NOTES_PER_PROFILE}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`notes feed HTTP ${response.status} for ${source.profile_handle}`);
  }
  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  const notes = [];
  for (const it of items) {
    if (it?.type !== "comment") continue;
    if (it?.context?.type !== "note") continue;
    if (Array.isArray(it.parentComments) && it.parentComments.length > 0) continue;

    const comment = it.comment || {};
    const author = it.context?.users?.[0] || {};
    if (author.handle && author.handle !== source.profile_handle) continue;

    const bodyText = (comment.body || "").trim();
    if (!bodyText) continue;

    const commentId = comment.id || (it.entity_key || "").replace(/^c-/, "");
    if (!commentId) continue;

    const noteUrl = `https://substack.com/@${source.profile_handle}/note/c-${commentId}`;
    const date = normalizeDate(it.context?.timestamp || comment.date);

    notes.push({
      id: buildItemId(source.id, `note:${commentId}`),
      source_id: source.id,
      source_name: source.name,
      source_handle: source.profile_handle,
      source_publication: source.publication_subdomain,
      title: deriveNoteTitle(bodyText),
      content: bodyText,
      content_html: `<p>${escapeHtml(bodyText)}</p>`,
      date,
      type: "note",
      arc: source.default_arc ?? null,
      character: source.default_character ?? null,
      tags: ["note"],
      url: noteUrl,
      guid: noteUrl,
      fetched_at: fetchedAt,
    });
  }
  return notes;
}

function deriveNoteTitle(bodyText) {
  const firstLine = bodyText.split(/\r?\n/)[0].trim();
  if (firstLine.length <= 90) return firstLine;
  return `${firstLine.slice(0, 87).trim()}...`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchPublicationPosts(source, fetchedAt) {
  const url = `https://${source.publication_subdomain}.substack.com/feed`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`publication feed HTTP ${response.status} for ${source.publication_subdomain}`);
  }
  const xmlText = await response.text();
  const itemBlocks = [...xmlText.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

  const filterTags = normalizeFilterTags(source.post_tag_filter);
  const posts = [];
  for (const block of itemBlocks) {
    const title = decodeHtmlEntities(extractTag(block, "title") || "");
    const link = decodeHtmlEntities(extractTag(block, "link") || "");
    const guid = decodeHtmlEntities(extractTag(block, "guid") || link);
    const descriptionHtml = extractTag(block, "description") || "";
    const contentHtml = extractTag(block, "content:encoded") || descriptionHtml;
    const content = htmlToText(contentHtml);
    const tags = extractAllTags(block, "category").map((t) => decodeHtmlEntities(t));

    if (filterTags && !tagsPassFilter(tags, filterTags)) continue;

    posts.push({
      id: buildItemId(source.id, `post:${guid || link || title}`),
      source_id: source.id,
      source_name: source.name,
      source_handle: source.profile_handle,
      source_publication: source.publication_subdomain,
      title,
      content,
      content_html: contentHtml,
      date: normalizeDate(extractTag(block, "pubDate")),
      type: "post",
      arc: source.default_arc ?? null,
      character: source.default_character ?? null,
      tags,
      url: link,
      guid,
      fetched_at: fetchedAt,
    });
  }
  return posts;
}

function normalizeFilterTags(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
}

function tagsPassFilter(itemTags, filterTags) {
  if (!Array.isArray(itemTags) || itemTags.length === 0) return false;
  const haystack = itemTags.map((t) => String(t).toLowerCase().trim());
  return haystack.some((t) => filterTags.includes(t));
}

function dedupeItems(items) {
  const seen = new Map();
  for (const item of items) {
    const existing = seen.get(item.id);
    if (!existing || (item.date || "") > (existing.date || "")) {
      seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

function sortItemsByDateDesc(items) {
  return [...items].sort((left, right) => {
    const a = `${left.date || ""}|${left.source_id || ""}|${left.id || ""}`;
    const b = `${right.date || ""}|${right.source_id || ""}|${right.id || ""}`;
    return a < b ? 1 : -1;
  });
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fetchedAt = new Date().toISOString();
  const sources = await readConfig(args.config);
  const allItems = [];
  const errors = [];
  const stats = [];

  for (const source of sources) {
    const sourceStat = { source_id: source.id, notes: 0, posts: 0, skipped: 0 };

    if (source.include_notes !== false) {
      try {
        const notes = await fetchProfileNotes(source, fetchedAt);
        allItems.push(...notes);
        sourceStat.notes = notes.length;
      } catch (error) {
        errors.push({
          source_id: source.id,
          stage: "notes",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      sourceStat.skipped += 1;
    }

    if (source.include_posts !== false) {
      try {
        const posts = await fetchPublicationPosts(source, fetchedAt);
        allItems.push(...posts);
        sourceStat.posts = posts.length;
      } catch (error) {
        errors.push({
          source_id: source.id,
          stage: "posts",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      sourceStat.skipped += 1;
    }

    stats.push(sourceStat);
  }

  const items = sortItemsByDateDesc(dedupeItems(allItems));
  const noteCount = items.filter((i) => i.type === "note").length;
  const postCount = items.filter((i) => i.type === "post").length;

  await writeJson(args.output, {
    generated_at: fetchedAt,
    source_count: sources.length,
    item_count: items.length,
    note_count: noteCount,
    post_count: postCount,
    error_count: errors.length,
    sources: stats,
    errors,
    items,
  });

  process.stdout.write(
    `${JSON.stringify({
      generated_at: fetchedAt,
      item_count: items.length,
      note_count: noteCount,
      post_count: postCount,
      error_count: errors.length,
    })}\n`
  );

  process.exitCode = errors.length > 0 ? 1 : 0;
}

await main();
