import { describe, expect, it } from 'vitest';
import { collectStories, normalizeStory, pickLatestPosts } from '../src/integrations/facebook.js';

// Synthetic payloads shaped like Facebook's embedded GraphQL "Story" objects.
function photo(id: string, width = 2048, height = 1365) {
  return {
    __typename: 'Photo',
    id,
    image: { uri: `https://scontent.example/${id}_small.jpg?oh=1`, width: 590, height: 393 },
    viewer_image: { uri: `https://scontent.example/${id}.jpg?oh=1`, width, height },
    accessibility_caption: 'May be an image of people',
  };
}

function story(postId: string, creationTime: number, overrides: Record<string, unknown> = {}) {
  return {
    __typename: 'Story',
    id: `story-${postId}`,
    post_id: postId,
    creation_time: creationTime,
    permalink_url: `https://www.facebook.com/SomePage/posts/pfbid${postId}?__cft__[0]=tracking`,
    attachments: [
      {
        styles: {
          __typename: 'StoryAttachmentAlbumStyleRenderer',
          attachment: {
            url: `https://www.facebook.com/SomePage/posts/pfbid${postId}`,
            all_subattachments: { nodes: [{ media: photo(`${postId}1`) }, { media: photo(`${postId}2`) }] },
          },
        },
      },
    ],
    comet_sections: {
      content: { story: { message: { text: `Advisory ${postId}` } } },
      feedback: {
        story: {
          story_ufi_container: {
            story: {
              feedback_context: {
                feedback_target_with_context: {
                  comet_ufi_summary_and_actions_renderer: {
                    feedback: {
                      reaction_count: { count: 120 },
                      share_count: { count: 7 },
                      video_view_count: null,
                      comments_count_summary_renderer: {
                        feedback: { comment_rendering_instance: { comments: { total_count: 33 } } },
                      },
                    },
                  },
                },
                interesting_top_level_comments: [
                  { comment: { author: { name: 'Juan Dela Cruz', profile_picture_depth_0: { uri: 'x' } }, body: { text: 'naay klase?' } } },
                ],
              },
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe('collectStories', () => {
  it('finds post stories anywhere in a payload, once each, without descending into them', () => {
    const payload = {
      data: {
        user: {
          timeline_list_feed_units: {
            edges: [{ node: story('100', 1_000) }, { node: story('200', 2_000) }, { node: story('100', 1_000) }],
          },
        },
      },
    };
    const found = new Map();
    collectStories(payload, found);
    expect([...found.keys()].sort()).toEqual(['100', '200']);
  });

  it('ignores the original post nested inside a shared post', () => {
    const shared = story('300', 3_000, { attached_story: story('999', 500) });
    const found = new Map();
    collectStories([shared], found);
    expect([...found.keys()]).toEqual(['300']);
  });
});

describe('normalizeStory', () => {
  it('extracts caption, album photos, counts and a clean permalink', () => {
    const post = normalizeStory(story('100', 1_792_072_279));
    expect(post).not.toBeNull();
    expect(post).toMatchObject({
      fbPostId: '100',
      caption: 'Advisory 100',
      postType: 'album',
      permalink: 'https://www.facebook.com/SomePage/posts/pfbid100',
      linkUrl: null,
      reactionCount: 120,
      commentCount: 33,
      shareCount: 7,
      viewCount: null,
    });
    expect(post?.postedAt?.toISOString()).toBe('2026-10-15T13:51:19.000Z');
    expect(post?.media).toHaveLength(2);
    expect(post?.media[0]).toMatchObject({ type: 'image', width: 2048, height: 1365, storage_path: null });
  });

  it('never keeps comments or commenter data', () => {
    const post = normalizeStory(story('100', 1_000));
    const stored = JSON.stringify(post);
    expect(stored).not.toContain('Juan Dela Cruz');
    expect(stored).not.toContain('naay klase');
  });

  it('reads a video post with its thumbnail and duration', () => {
    const video = story('400', 4_000, {
      attachments: [
        {
          styles: {
            __typename: 'StoryAttachmentVideoStyleRenderer',
            attachment: {
              url: 'https://www.facebook.com/reel/555/',
              media: {
                __typename: 'Video',
                id: '555',
                permalink_url: 'https://www.facebook.com/reel/555/?s=1',
                preferred_thumbnail: { image: { uri: 'https://scontent.example/thumb.jpg' } },
                playable_duration_in_ms: 53_400,
                original_width: 1080,
                original_height: 1920,
              },
            },
          },
        },
      ],
    });
    const post = normalizeStory(video);
    expect(post?.postType).toBe('video');
    expect(post?.media[0]).toEqual({
      type: 'video',
      url: 'https://www.facebook.com/reel/555/',
      thumbnail_url: 'https://scontent.example/thumb.jpg',
      storage_path: null,
      width: 1080,
      height: 1920,
      duration_seconds: 53.4,
    });
  });

  it('unwraps outbound links and marks link posts', () => {
    const link = story('500', 5_000, {
      attachments: [
        {
          styles: {
            __typename: 'StoryAttachmentShareStyleRenderer',
            attachment: { url: 'https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.sunstar.com.ph%2Fcebu%2Fstory&h=abc' },
          },
        },
      ],
    });
    const post = normalizeStory(link);
    expect(post?.postType).toBe('link');
    expect(post?.linkUrl).toBe('https://www.sunstar.com.ph/cebu/story');
  });

  it('gives the same content hash when only the signed media URLs change', () => {
    const first = normalizeStory(story('100', 1_000));
    const refetched = JSON.parse(JSON.stringify(story('100', 1_000)).split('?oh=1').join('?oh=2'));
    expect(normalizeStory(refetched)?.contentHash).toBe(first?.contentHash);
  });
});

describe('pickLatestPosts', () => {
  it('orders by creation time, so a pinned older post does not count as newest', () => {
    const stories = new Map();
    collectStories([story('1', 1_000), story('3', 3_000), story('2', 2_000)], stories); // '1' first, as if pinned
    expect(pickLatestPosts(stories, 2).map((post) => post.fbPostId)).toEqual(['3', '2']);
  });
});
