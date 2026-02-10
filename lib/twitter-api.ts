const TWITTER_API_BASE = 'https://api.twitterapi.io';

export interface TweetData {
  id: string;
  text: string;
  authorUsername: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  createdAt: string;
  entities: {
    hashtags: string[];
    mentions: string[];
    urls: string[];
  };
}

export interface TagComplianceResult {
  compliant: boolean;
  found: string[];
  missing: string[];
}

/**
 * Parse tweet ID from various Twitter/X URL formats:
 * - https://twitter.com/user/status/123456789
 * - https://x.com/user/status/123456789
 * - https://twitter.com/user/status/123456789?s=20
 */
export function parseTweetId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.match(/^(www\.)?(twitter\.com|x\.com)$/)) {
      return null;
    }
    const match = parsed.pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract username from Twitter/X URL
 */
export function parseUsername(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.match(/^(www\.)?(twitter\.com|x\.com)$/)) {
      return null;
    }
    const match = parsed.pathname.match(/^\/([^/]+)\/status\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch tweet data by tweet ID using TwitterAPI.io
 */
export async function fetchTweetById(tweetId: string): Promise<TweetData | null> {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    console.error('TWITTER_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch(`${TWITTER_API_BASE}/twitter/tweets?tweet_ids=${tweetId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Twitter API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const tweets = data.tweets || data.data || [];

    if (!tweets.length) {
      return null;
    }

    const tweet = tweets[0];

    return {
      id: tweet.id || tweetId,
      text: tweet.text || tweet.full_text || '',
      authorUsername: tweet.author?.userName || tweet.user?.screen_name || '',
      views: tweet.viewCount || tweet.views?.count || 0,
      likes: tweet.likeCount || tweet.favorite_count || 0,
      retweets: tweet.retweetCount || tweet.retweet_count || 0,
      replies: tweet.replyCount || tweet.reply_count || 0,
      impressions: tweet.viewCount || tweet.impressionCount || 0,
      createdAt: tweet.createdAt || tweet.created_at || '',
      entities: {
        hashtags: (tweet.entities?.hashtags || []).map((h: { text?: string; tag?: string }) => h.text || h.tag || ''),
        mentions: (tweet.entities?.user_mentions || tweet.entities?.mentions || []).map((m: { screen_name?: string; username?: string }) => m.screen_name || m.username || ''),
        urls: (tweet.entities?.urls || []).map((u: { expanded_url?: string; url?: string }) => u.expanded_url || u.url || ''),
      },
    };
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
    return null;
  }
}

/**
 * Fetch tweet data by URL (parses tweet ID first)
 */
export async function fetchTweetByUrl(url: string): Promise<TweetData | null> {
  const tweetId = parseTweetId(url);
  if (!tweetId) {
    return null;
  }
  const data = await fetchTweetById(tweetId);
  if (data && !data.authorUsername) {
    data.authorUsername = parseUsername(url) || '';
  }
  return data;
}

/**
 * Check if tweet content matches required tags/mentions.
 * Tags can be: @mentions, #hashtags, URLs, or plain text patterns
 */
export function checkTagCompliance(
  tweetText: string,
  entities: TweetData['entities'],
  requiredTags: string[]
): TagComplianceResult {
  const found: string[] = [];
  const missing: string[] = [];
  const lowerText = tweetText.toLowerCase();

  for (const tag of requiredTags) {
    const lowerTag = tag.toLowerCase();
    let isFound = false;

    if (tag.startsWith('@')) {
      // Check mentions
      const mentionName = tag.slice(1).toLowerCase();
      if (entities.mentions.some(m => m.toLowerCase() === mentionName)) {
        isFound = true;
      } else if (lowerText.includes(lowerTag)) {
        isFound = true;
      }
    } else if (tag.startsWith('#')) {
      // Check hashtags
      const hashtagName = tag.slice(1).toLowerCase();
      if (entities.hashtags.some(h => h.toLowerCase() === hashtagName)) {
        isFound = true;
      } else if (lowerText.includes(lowerTag)) {
        isFound = true;
      }
    } else if (tag.includes('.')) {
      // Check URLs (domain patterns like "gacha.game" or "pull.gacha.game")
      if (entities.urls.some(u => u.toLowerCase().includes(lowerTag))) {
        isFound = true;
      } else if (lowerText.includes(lowerTag)) {
        isFound = true;
      }
    } else {
      // Plain text match
      if (lowerText.includes(lowerTag)) {
        isFound = true;
      }
    }

    if (isFound) {
      found.push(tag);
    } else {
      missing.push(tag);
    }
  }

  return {
    compliant: found.length > 0,
    found,
    missing,
  };
}
