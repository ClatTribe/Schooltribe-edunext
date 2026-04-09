/**
 * YouTube Video Service for Vidyaa
 *
 * Strategy:
 * 1. Check Firestore cache (permanent per chapter)
 * 2. Try YouTube Data API v3
 * 3. If API fails, use Gemini to suggest videos (trusted without verification)
 * 4. Store in Firestore for all future users
 *
 * Videos play inside the app via YouTube embed — never redirect.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyBz5cwnn61y_7iWvqec0h9jY5R5R1aIRYw';

export interface YouTubeVideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
}

const memoryCache = new Map<string, YouTubeVideoResult[]>();

/**
 * Get videos for a chapter. Checks: memory → Firestore → YouTube API → Gemini.
 */
export async function getVideosForChapter(
  subject: string,
  chapter: string,
  chapterNumber: number,
  board: string = 'CBSE',
  classLevel: number = 10,
): Promise<YouTubeVideoResult[]> {
  // v5: Broader query, no language filter, dual-query fallback. Busts stale Gemini-hallucinated cache.
  const cacheKey = `${board}_${classLevel}_${subject}_${chapterNumber}_v5`;

  // 1. Memory cache
  const mem = memoryCache.get(cacheKey);
  if (mem && mem.length > 0) return mem;

  // 2. Firestore cache
  try {
    const docRef = doc(db, 'videoLibrary', cacheKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
        memoryCache.set(cacheKey, data.videos);
        return data.videos;
      }
    }
  } catch (e) {
    console.warn('Firestore read failed:', e);
  }

  // 3. Fetch fresh
  let videos: YouTubeVideoResult[] = [];

  // Try YouTube Data API
  try {
    videos = await fetchFromYouTubeAPI(subject, chapter, board, classLevel);
    console.log(`[Vidyaa] YouTube API returned ${videos.length} videos for "${chapter}"`, videos.map(v => v.videoId));
  } catch (e) {
    console.warn('[Vidyaa] YouTube API failed:', e);
  }

  // No fallback — Gemini hallucinates video IDs that don't exist.
  // When API key is missing/invalid, return empty so the UI shows YouTube search links.

  // 4. Store in Firestore
  if (videos.length > 0) {
    try {
      await setDoc(doc(db, 'videoLibrary', cacheKey), {
        subject, chapter, chapterNumber, board, classLevel,
        videos,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore write failed:', e);
    }
  }

  memoryCache.set(cacheKey, videos);
  return videos;
}

/**
 * YouTube Data API v3 search — tries two queries, broader fallback if first returns nothing
 */
async function fetchFromYouTubeAPI(
  subject: string, chapter: string, board: string, classLevel: number,
): Promise<YouTubeVideoResult[]> {
  const queries = [
    // Primary: specific to board/class
    `${board} Class ${classLevel} ${chapter} ${subject}`,
    // Fallback: drop board, add popular channel names
    `Class ${classLevel} ${chapter} ${subject} Magnet Brains Vedantu`,
  ];

  for (const query of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '8');
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('videoEmbeddable', 'true');
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`YouTube API HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.items?.length) {
      return data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title || chapter,
        channelTitle: item.snippet.channelTitle || '',
        description: (item.snippet.description || '').slice(0, 120),
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ||
          `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      }));
    }
  }

  return [];
}

/**
 * Get YouTube embed URL — always in-app
 */
export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

/**
 * Build a YouTube search URL for a chapter — used as fallback when API key is not set.
 * Opens YouTube search results in a new tab.
 */
export function getYouTubeSearchUrl(
  subject: string,
  chapter: string,
  board: string,
  classLevel: number,
): string {
  const query = `${board} Class ${classLevel} ${subject} ${chapter} in Hindi`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Curated search suggestions shown as cards in the fallback UI */
export interface SearchSuggestion {
  channel: string;
  query: string;
  url: string;
}

export function getSearchSuggestions(
  subject: string,
  chapter: string,
  board: string,
  classLevel: number,
): SearchSuggestion[] {
  const channels = [
    { channel: 'Magnet Brains', suffix: 'Magnet Brains' },
    { channel: 'Physics Wallah', suffix: 'Physics Wallah PW' },
    { channel: 'Vedantu', suffix: 'Vedantu Class 9 & 10' },
    { channel: 'Shobhit Nirwan', suffix: 'Shobhit Nirwan' },
  ];
  return channels.map(({ channel, suffix }) => {
    const q = `${board} Class ${classLevel} ${subject} ${chapter} ${suffix}`;
    return {
      channel,
      query: q,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    };
  });
}
