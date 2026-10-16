// Terminal test: pick a mayor, print the 2 latest posts from their Facebook page.
// Read-only: no database, no sign-in.
//
//   npm run fb:latest              # asks which mayor
//   npm run fb:latest -- mandaue_city

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { scrapeLatestPagePosts } from "../src/integrations/facebook";
import type { ScrapedFbPost } from "../src/types";
import { LGU_PAGES, type LguPage } from "./lgu-pages";

const manilaTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  dateStyle: "medium",
  timeStyle: "short",
});

async function choosePage(): Promise<LguPage> {
  const arg = process.argv[2];
  if (arg) {
    const page = LGU_PAGES.find((p) => p.slug === arg || String(LGU_PAGES.indexOf(p) + 1) === arg);
    if (!page) throw new Error(`Unknown mayor "${arg}". Use one of: ${LGU_PAGES.map((p) => p.slug).join(", ")}`);
    return page;
  }
  console.log("\nWhich mayor?\n");
  LGU_PAGES.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} — ${p.official}`));
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      const answer = (await rl.question(`\nPick 1-${LGU_PAGES.length}: `)).trim();
      const page = LGU_PAGES[Number(answer) - 1];
      if (page) return page;
      console.log("Please type one of the numbers above.");
    }
  } finally {
    rl.close();
  }
}

function count(label: string, value: number | null) {
  return value === null ? null : `${value.toLocaleString("en-PH")} ${label}`;
}

function printPost(post: ScrapedFbPost, index: number) {
  const when = post.postedAt ? manilaTime.format(post.postedAt) : "unknown time";
  const counts = [count("reactions", post.reactionCount), count("comments", post.commentCount), count("shares", post.shareCount), count("views", post.viewCount)]
    .filter(Boolean)
    .join(" · ");
  console.log(`\n━━━ Post ${index + 1} ━━━ ${when} · ${post.postType}`);
  console.log(`ID:   ${post.fbPostId}`);
  console.log(`Link: ${post.permalink ?? "(none)"}`);
  if (counts) console.log(`      ${counts}`);
  console.log("");
  console.log(post.caption ?? "(no caption)");
  if (post.linkUrl) console.log(`\nShared link: ${post.linkUrl}`);
  if (post.media.length > 0) {
    console.log(`\nMedia (${post.media.length}):`);
    for (const item of post.media) {
      const size = item.width && item.height ? ` ${item.width}x${item.height}` : "";
      const duration = item.duration_seconds ? ` ${item.duration_seconds}s` : "";
      console.log(`  - ${item.type}${size}${duration}: ${item.url}`);
    }
  }
}

async function main() {
  const page = await choosePage();
  console.log(`\nOpening ${page.official}'s page (${page.url}) … this takes a few seconds.`);
  const started = Date.now();
  const posts = await scrapeLatestPagePosts(page.url, { limit: 2 });
  console.log(`Found ${posts.length} posts in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  posts.forEach(printPost);
  console.log("");
}

main().catch((error) => {
  console.error(`\nCould not read the page: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
