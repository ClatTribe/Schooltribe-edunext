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
import { geminiStructuredModel } from '@/lib/gemini';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyASihqx48z4Gl5fhUT9iS5zm0vx8XJpfM0';

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
  // v4: Hindi/English filter + embeddable. Busts old cache with wrong-language videos.
  const cacheKey = `${board}_${classLevel}_${subject}_${chapterNumber}_v4`;

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

  // If API failed, use Gemini — trust its IDs without browser-side oEmbed verification
  // (oEmbed HEAD checks are unreliable in browsers due to CORS and filter valid videos)
  if (videos.length === 0) {
    try {
      videos = await fetchViaGemini(subject, chapter, board, classLevel);
    } catch (e) {
      console.warn('Gemini fallback failed:', e);
    }
  }

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
 * YouTube Data API v3 search
 */
async function fetchFromYouTubeAPI(
  subject: string, chapter: string, board: string, classLevel: number,
): Promise<YouTubeVideoResult[]> {
  // Search specifically for Hindi/English educational content
  const query = `${board} Class ${classLevel} ${subject} "${chapter}" in Hindi one shot NCERT`;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('relevanceLanguage', 'hi'); // Prefer Hindi content
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('videoSyndicated', 'true');
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.items?.length) return [];

  return data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title || chapter,
    channelTitle: item.snippet.channelTitle || '',
    description: (item.snippet.description || '').slice(0, 120),
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
  }));
}

/**
 * Gemini-based video finder — returns video IDs from known edu channels.
 * We TRUST these IDs without verification (noembed has CORS issues in browsers).
 */
async function fetchViaGemini(
  subject: string, chapter: string, board: string, classLevel: number,
): Promise<YouTubeVideoResult[]> {
  const prompt = `Find 4 REAL YouTube videos for Indian students studying ${board} Class ${classLevel} ${subject}, chapter: "${chapter}".

I need videos from these REAL YouTube channels that definitely have this content:
- Magnet Brains (they have Class 8, 9, 10 full chapter videos)
- Physics Wallah (PW Foundation for Class 8-10)
- Vedantu Class 9 & 10 / Vedantu Young Wonders (Class 8)
- LearnoHub - Class 9 & 10
- Science and Fun Education
- Shobhit Nirwan (Class 10 Science/Maths)
- Dear Sir (Class 9/10)

For EACH video give me:
1. The REAL YouTube video ID (11 characters, like "dQw4w9WgXcQ")
2. The exact video title as it appears on YouTube
3. The channel name

IMPORTANT RULES:
- Only give IDs you are CONFIDENT are real
- These channels definitely have chapter-wise videos for ${board} Class ${classLevel}
- The video ID is the part after "v=" in a YouTube URL
- If you're not sure about an exact ID, give me the channel name and a very specific title so I can find it

Return JSON:
{
  "videos": [
    {"videoId": "xxxxxxxxxxx", "title": "exact title", "channelName": "channel"}
  ]
}`;

  const result = await geminiStructuredModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*"videos"[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { return []; }
    } else {
      return [];
    }
  }

  if (!parsed?.videos?.length) return [];

  return parsed.videos
    .filter((v: any) => v.videoId && v.videoId.length >= 8 && v.videoId.length <= 15)
    .slice(0, 5)
    .map((v: any) => ({
      videoId: v.videoId,
      title: v.title || `${chapter} — Video Lesson`,
      channelTitle: v.channelName || 'Education',
      description: `${board} Class ${classLevel} ${subject}`,
      thumbnailUrl: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
    }));
}

/**
 * Get YouTube embed URL — always in-app
 */
export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}
