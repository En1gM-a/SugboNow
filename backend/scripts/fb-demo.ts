// Local test page: pick a mayor, see the 2 latest posts from their Facebook page.
// Read-only: no database, no sign-in. Listens on 127.0.0.1 only.
//
//   npm run fb:demo     then open http://localhost:4100

import { createServer } from "node:http";
import { scrapeLatestPagePosts } from "../src/integrations/facebook";
import type { ScrapedFbPost } from "../src/types";
import { LGU_PAGES } from "./lgu-pages";

const PORT = Number(process.env.FB_DEMO_PORT ?? 4100);
const CACHE_MS = 2 * 60_000; // don't re-open Facebook for repeat clicks

const cache = new Map<string, { at: number; posts: ScrapedFbPost[] }>();

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE_HTML);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/pages") {
    sendJson(res, 200, LGU_PAGES);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/latest") {
    const page = LGU_PAGES.find((p) => p.slug === url.searchParams.get("slug"));
    if (!page) {
      sendJson(res, 400, { error: "Unknown mayor." });
      return;
    }
    const cached = cache.get(page.slug);
    const fresh = url.searchParams.get("fresh") === "1";
    if (cached && !fresh && Date.now() - cached.at < CACHE_MS) {
      sendJson(res, 200, { page, posts: cached.posts, cached: true, seconds: 0 });
      return;
    }
    const started = Date.now();
    try {
      const posts = await scrapeLatestPagePosts(page.url, { limit: 2 });
      cache.set(page.slug, { at: Date.now(), posts });
      sendJson(res, 200, { page, posts, cached: false, seconds: (Date.now() - started) / 1000 });
    } catch (error) {
      sendJson(res, 502, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Facebook test page: http://localhost:${PORT}  (Ctrl+C to stop)`);
});

const PAGE_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LGU Posts Test</title>
<style>
  :root {
    --bg: #f6f7f9; --card: #ffffff; --text: #1c1e21; --muted: #65676b; --line: #e4e6eb;
    --accent: #0866ff; --accent-text: #ffffff; --error: #c62828; --chip: #eef3ff;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #18191a; --card: #242526; --text: #e4e6eb; --muted: #b0b3b8; --line: #3a3b3c;
      --accent: #4b8bff; --accent-text: #ffffff; --error: #ff6b6b; --chip: #2d3a52; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 20px; }
  form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  select, button { font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line);
    background: var(--card); color: var(--text); }
  select { flex: 1 1 260px; min-width: 0; }
  button { background: var(--accent); color: var(--accent-text); border-color: var(--accent); cursor: pointer; font-weight: 600; }
  button:disabled { opacity: .6; cursor: progress; }
  #status { color: var(--muted); min-height: 1.5em; margin: 0 0 16px; }
  #status.error { color: var(--error); }
  .post { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; color: var(--muted); font-size: 13px; margin-bottom: 10px; }
  .chip { background: var(--chip); color: var(--text); border-radius: 999px; padding: 2px 10px; font-weight: 600; }
  .caption { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 12px; }
  .media { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; margin-bottom: 12px; }
  .media a { position: relative; display: block; border-radius: 8px; overflow: hidden; background: var(--line); aspect-ratio: 1; }
  .media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .media .play { position: absolute; inset: 0; display: grid; place-items: center; font-size: 40px; color: #fff;
    text-shadow: 0 2px 8px rgba(0,0,0,.6); }
  .counts { color: var(--muted); font-size: 13px; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; margin-top: 10px; }
  a { color: var(--accent); }
  .id { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
  <h1>LGU Facebook posts — test</h1>
  <p class="sub">Pick a mayor to see the 2 latest posts from their official page. Read-only: nothing is saved.</p>
  <form id="form">
    <select id="mayor" aria-label="Mayor"></select>
    <button id="go" type="submit">Show latest posts</button>
  </form>
  <p id="status" role="status"></p>
  <section id="posts" aria-live="polite"></section>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  async function loadPages() {
    const pages = await (await fetch('/api/pages')).json();
    for (const p of pages) {
      const opt = el('option', null, p.name + ' — ' + p.official);
      opt.value = p.slug;
      $('mayor').append(opt);
    }
  }

  function renderPost(post, index) {
    const card = el('article', 'post');
    const meta = el('div', 'meta');
    meta.append(el('span', 'chip', 'Post ' + (index + 1)));
    meta.append(el('span', null, post.postedAt ? fmt.format(new Date(post.postedAt)) : 'Unknown time'));
    meta.append(el('span', null, post.postType));
    card.append(meta);
    card.append(el('p', 'caption', post.caption || '(no caption)'));
    if (post.linkUrl) {
      const p = el('p', null, 'Shared link: ');
      const a = el('a', null, post.linkUrl); a.href = post.linkUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      p.append(a); card.append(p);
    }
    if (post.media.length) {
      const grid = el('div', 'media');
      for (const m of post.media) {
        const a = el('a'); a.href = m.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        const src = m.type === 'image' ? m.url : m.thumbnail_url;
        if (src) {
          const img = el('img'); img.src = src; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.alt = m.alt_text || (m.type === 'video' ? 'Video thumbnail' : 'Post image');
          a.append(img);
        }
        if (m.type === 'video') a.append(el('span', 'play', '▶'));
        grid.append(a);
      }
      card.append(grid);
    }
    const counts = [
      post.reactionCount != null && post.reactionCount.toLocaleString() + ' reactions',
      post.commentCount != null && post.commentCount.toLocaleString() + ' comments',
      post.shareCount != null && post.shareCount.toLocaleString() + ' shares',
      post.viewCount != null && post.viewCount.toLocaleString() + ' views',
    ].filter(Boolean).join(' · ');
    const foot = el('div', 'foot');
    foot.append(el('span', 'counts', counts || 'No counts'));
    if (post.permalink) {
      const a = el('a', null, 'Open on Facebook'); a.href = post.permalink; a.target = '_blank'; a.rel = 'noopener noreferrer';
      foot.append(a);
    }
    card.append(foot);
    card.append(el('div', 'id', 'Post ID: ' + post.fbPostId + ' · ' + post.media.length + ' media'));
    return card;
  }

  $('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const slug = $('mayor').value;
    $('go').disabled = true;
    $('status').className = '';
    $('status').textContent = 'Opening the Facebook page… this takes about 5 seconds.';
    $('posts').replaceChildren();
    try {
      const res = await fetch('/api/latest?slug=' + encodeURIComponent(slug));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      $('status').textContent = data.cached
        ? 'Showing results from the last 2 minutes.'
        : 'Found ' + data.posts.length + ' posts in ' + data.seconds.toFixed(1) + ' s.';
      data.posts.forEach((post, i) => $('posts').append(renderPost(post, i)));
    } catch (error) {
      $('status').className = 'error';
      $('status').textContent = 'Could not read the page: ' + error.message;
    } finally {
      $('go').disabled = false;
    }
  });

  loadPages();
</script>
</body>
</html>`;
