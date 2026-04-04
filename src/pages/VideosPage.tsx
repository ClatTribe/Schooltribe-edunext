import { useState, useCallback, useRef, type MouseEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getChapters, SUBJECT_LABELS } from '@/constants';
import { getVideosForChapter, getEmbedUrl, getSearchSuggestions, getYouTubeSearchUrl } from '@/services/youtubeService';
import { atomicXPUpdate } from '@/services/firestoreService';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { YouTubeVideoResult } from '@/services/youtubeService';
import type { Subject } from '@/types';

export default function VideosPage() {
  const { user, profile } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<Subject>(
    (profile?.subjects?.[0] as Subject) || 'science'
  );
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<YouTubeVideoResult | null>(null);
  const [videoCache, setVideoCache] = useState<Record<string, YouTubeVideoResult[]>>({});
  const [loadingChapter, setLoadingChapter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const rewardedVideosRef = useRef<Set<string>>(new Set());

  const board = profile?.board || 'CBSE';
  const classLevel = profile?.class || 10;
  const subjects = profile?.subjects || ['science', 'maths', 'ai'];
  const chapters = getChapters(board, classLevel, selectedSubject);

  const handleChapterExpand = useCallback(
    async (chapterName: string, chapterNumber: number) => {
      if (selectedChapter === chapterName) {
        setSelectedChapter(null);
        return;
      }

      if (videoCache[chapterName]) {
        setSelectedChapter(chapterName);
        return;
      }

      setSelectedChapter(chapterName);
      setLoadingChapter(chapterName);
      setError(null);

      try {
        const videos = await getVideosForChapter(
          selectedSubject, chapterName, chapterNumber, board, classLevel
        );
        setVideoCache((prev) => ({ ...prev, [chapterName]: videos }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch videos';
        setError(msg);
      } finally {
        setLoadingChapter(null);
      }
    },
    [selectedSubject, videoCache, selectedChapter, board, classLevel],
  );

  const handleVideoClick = useCallback(
    (e: MouseEvent, video: YouTubeVideoResult) => {
      e.stopPropagation();
      e.preventDefault();
      setPlayingVideo(video);

      // Award +10 XP for watching a video (once per video per session)
      if (user && !rewardedVideosRef.current.has(video.videoId)) {
        rewardedVideosRef.current.add(video.videoId);

        // Update XP
        atomicXPUpdate(user.uid, 10).catch(console.error);

        // Increment videosWatched counter in gamification doc
        const gamRef = doc(db, 'gamification', user.uid);
        runTransaction(db, async (transaction) => {
          const snap = await transaction.get(gamRef);
          const current = snap.exists() ? (snap.data().videosWatched as number || 0) : 0;
          transaction.set(gamRef, { videosWatched: current + 1, updatedAt: serverTimestamp() }, { merge: true });
        }).catch(console.error);

        setXpToast('+10 XP');
        setTimeout(() => setXpToast(null), 2500);
      }
    },
    [user],
  );

  const closePlayer = () => setPlayingVideo(null);

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* ─── Video Player Modal Overlay ─── */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-5xl animate-scale-in">
            {/* Close button */}
            <button
              onClick={closePlayer}
              className="absolute -top-12 right-0 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* Video embed */}
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-orange-200">
              <iframe
                width="100%"
                height="100%"
                src={getEmbedUrl(playingVideo.videoId)}
                title={playingVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>

            {/* Video info below player */}
            <div className="mt-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-gray-900">{playingVideo.title}</p>
                <p className="text-sm text-gray-500">{playingVideo.channelTitle}</p>
              </div>
              {xpToast && (
                <span className="animate-fade-in-up rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
                  {xpToast}
                </span>
              )}
              <span className="amber-pill flex-shrink-0">+10 XP</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="animate-fade-in-up space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-float">🎬</span>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900">
                Video <span className="text-orange-500">Lessons</span>
              </h1>
              <div className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-50 px-3 py-1">
                <span className="live-dot" />
                <span className="text-xs font-medium text-green-600">LIVE</span>
              </div>
            </div>
            <p className="mt-1 text-gray-500">
              {board} Class {classLevel} — Learn from top educators, chapter by chapter
            </p>
          </div>
        </div>
      </header>

      {/* Subject Tabs */}
      <div className="flex gap-3 border-b border-gray-200 overflow-x-auto">
        {subjects.map((s) => {
          const isActive = selectedSubject === s;
          return (
            <button
              key={s}
              onClick={() => {
                setSelectedSubject(s);
                setSelectedChapter(null);
              }}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {SUBJECT_LABELS[s]?.icon} {SUBJECT_LABELS[s]?.label || s}
              {isActive && (
                <div className="absolute bottom-0 left-4 right-4 h-1 rounded-t bg-gradient-to-r from-orange-500 to-orange-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Chapters Accordion */}
      <div className="stagger-children space-y-4">
        {chapters.map((ch) => {
          const videos = videoCache[ch.name] || [];
          const isExpanded = selectedChapter === ch.name;
          const isLoading = loadingChapter === ch.name;

          return (
            <div
              key={ch.number}
              className={`stagger-item animate-fade-in-up overflow-hidden rounded-2xl border transition-all duration-300 ${
                isExpanded
                  ? 'border-orange-200 bg-orange-50 ring-1 ring-orange-100'
                  : 'border-gray-200 bg-white hover:border-orange-100'
              }`}
            >
              <button
                onClick={() => handleChapterExpand(ch.name, ch.number)}
                disabled={isLoading}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 font-bold text-white shadow-lg">
                    {ch.number}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-gray-900">{ch.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {videos.length > 0
                        ? `${videos.length} video${videos.length !== 1 ? 's' : ''} ready`
                        : isLoading
                          ? 'Finding videos...'
                          : 'Tap to load videos'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-orange-500 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Video list */}
              {isExpanded && (
                <div className="space-y-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
                      <p className="text-sm text-gray-700">Finding best videos for this chapter...</p>
                      <p className="text-xs text-gray-500">This is a one-time setup. Videos will be instant next time.</p>
                    </div>
                  ) : videos.length > 0 ? (
                    videos.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => handleVideoClick(e, v)}
                        className="group flex w-full items-center gap-4 rounded-xl p-2 text-left transition-all duration-200 hover:bg-gray-200"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-gray-300">
                          {v.thumbnailUrl ? (
                            <img
                              src={v.thumbnailUrl}
                              alt={v.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-200 to-gray-300">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )}
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 shadow-lg transition-transform group-hover:scale-110">
                              <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Video Info */}
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900 transition-colors group-hover:text-orange-500">
                            {v.title}
                          </p>
                          <p className="truncate text-xs text-gray-500">{v.channelTitle}</p>
                          <span className="amber-pill w-fit">+10 XP</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Search on YouTube →</p>
                        <a
                          href={getYouTubeSearchUrl(selectedSubject, ch.name, board, classLevel)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-orange-500 hover:underline"
                        >
                          Open all results ↗
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {getSearchSuggestions(selectedSubject, ch.name, board, classLevel).map((s) => (
                          <a
                            key={s.channel}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                          >
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 text-lg">▶</div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 group-hover:text-orange-600 truncate">{s.channel}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Opens YouTube ↗</p>
                            </div>
                          </a>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 text-center pt-1">
                        💡 Add a YouTube API key in Vercel to get videos directly in the app
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="stagger-children grid grid-cols-2 gap-4 border-t border-gray-200 pt-6 sm:grid-cols-3">
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Videos Loaded</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {Object.values(videoCache).reduce((sum, arr) => sum + arr.length, 0)}
          </p>
        </div>
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Chapters</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{chapters.length}</p>
        </div>
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Max XP</p>
          <p className="mt-1 text-2xl font-bold text-orange-500">
            {Object.values(videoCache).reduce((sum, arr) => sum + arr.length * 10, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
