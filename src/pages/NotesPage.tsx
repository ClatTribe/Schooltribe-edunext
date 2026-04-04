import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getChapters, SUBJECT_LABELS } from '@/constants';
import type { Subject } from '@/types';
import {
  generateFlashCards,
  generateNotes,
  generateInfographic,
  generateSlideDeck,
} from '@/services/geminiService';
import type {
  FlashCard,
  NotesResponse,
  InfographicResponse,
  SlideDeckResponse,
} from '@/services/geminiService';

type NoteTab = 'flashcards' | 'notes' | 'infographics' | 'slides';

interface CacheEntry {
  flashCards?: FlashCard[];
  notes?: NotesResponse;
  infographic?: InfographicResponse;
  slides?: SlideDeckResponse;
}

export default function NotesPage() {
  const { profile } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<Subject>('science');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NoteTab>('flashcards');

  // Flash Cards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Slides state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Loading and caching
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [content, setContent] = useState<CacheEntry>({});

  const subjects = profile?.subjects || ['science', 'maths', 'ai'];
  const chapters = getChapters(profile?.board || 'CBSE', profile?.class || 10, selectedSubject);

  const getCacheKey = (chapter: string) => `${selectedSubject}-${chapter}`;

  // Fetch content when tab changes
  useEffect(() => {
    if (!selectedChapter) return;

    const cacheKey = getCacheKey(selectedChapter);
    const cached = cache[cacheKey];

    if (activeTab === 'flashcards' && cached?.flashCards) {
      setContent(cached);
      return;
    }
    if (activeTab === 'notes' && cached?.notes) {
      setContent(cached);
      return;
    }
    if (activeTab === 'infographics' && cached?.infographic) {
      setContent(cached);
      return;
    }
    if (activeTab === 'slides' && cached?.slides) {
      setContent(cached);
      return;
    }

    // Fetch missing content
    const fetchContent = async () => {
      setLoading(true);
      const cachedEntry = cache[cacheKey] || {};

      try {
        const newContent: CacheEntry = { ...cachedEntry };

        if (activeTab === 'flashcards' && !cachedEntry.flashCards) {
          const flashCards = await generateFlashCards(selectedSubject, selectedChapter);
          newContent.flashCards = flashCards;
          setCurrentCardIndex(0);
          setIsFlipped(false);
        } else if (activeTab === 'notes' && !cachedEntry.notes) {
          const notes = await generateNotes(selectedSubject, selectedChapter);
          newContent.notes = notes;
        } else if (activeTab === 'infographics' && !cachedEntry.infographic) {
          const infographic = await generateInfographic(selectedSubject, selectedChapter);
          newContent.infographic = infographic;
        } else if (activeTab === 'slides' && !cachedEntry.slides) {
          const slides = await generateSlideDeck(selectedSubject, selectedChapter);
          newContent.slides = slides;
          setCurrentSlideIndex(0);
        }

        setContent(newContent);
        setCache((prev) => ({
          ...prev,
          [cacheKey]: newContent,
        }));
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter, activeTab]);

  const handleSubjectChange = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setContent({});
  };

  const handleChapterSelect = (chapterName: string) => {
    setSelectedChapter(chapterName);
    setActiveTab('flashcards');
    setContent({});
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    setContent({});
    setActiveTab('flashcards');
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Flash Cards Navigation
  const nextCard = () => {
    if (content.flashCards) {
      setCurrentCardIndex((prev) =>
        prev === content.flashCards!.length - 1 ? 0 : prev + 1
      );
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (content.flashCards) {
      setCurrentCardIndex((prev) =>
        prev === 0 ? content.flashCards!.length - 1 : prev - 1
      );
      setIsFlipped(false);
    }
  };

  // Slides Navigation
  const nextSlide = () => {
    if (content.slides) {
      setCurrentSlideIndex((prev) =>
        prev === content.slides!.slides.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevSlide = () => {
    if (content.slides) {
      setCurrentSlideIndex((prev) =>
        prev === 0 ? content.slides!.slides.length - 1 : prev - 1
      );
    }
  };

  // Find chapter number from name
  const getChapterNumber = (chapterName: string): number => {
    const ch = chapters.find((c) => c.name === chapterName);
    return ch?.number ?? 0;
  };

  // ─── Chapter Grid View ───────────────────────────────
  if (!selectedChapter) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        {/* Header */}
        <header className="animate-fade-in-up space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-float">📚</span>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Study <span className="text-orange-500">Notes</span>
              </h1>
              <p className="mt-1 text-gray-500">
                Master concepts with interactive notes, flash cards & more
              </p>
            </div>
            <div className="ml-4 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1">
              <span className="live-dot" />
              <span className="text-xs font-semibold text-emerald-600">LIVE</span>
            </div>
          </div>
        </header>

        {/* Subject Tabs */}
        <div className="flex gap-3 border-b border-gray-200">
          {subjects.map((s) => {
            const isActive = selectedSubject === s;
            return (
              <button
                key={s}
                onClick={() => handleSubjectChange(s)}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
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

        {/* Chapter Grid */}
        <div className="stagger-children grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((ch, idx) => (
            <button
              key={ch.number}
              onClick={() => handleChapterSelect(ch.name)}
              className="stagger-item animate-fade-in-up glass-card-hover group tilt-hover text-left"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 font-bold text-white shadow-lg">
                  {ch.number}
                </div>
                <span className="text-sm text-orange-500 opacity-0 transition-opacity group-hover:opacity-100">
                  →
                </span>
              </div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900 transition-colors group-hover:text-orange-500">
                {ch.name}
              </h3>
              <div className="flex gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-sm transition-colors hover:bg-orange-100" title="Notes">📝</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-sm transition-colors hover:bg-orange-100" title="Flash Cards">🃏</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-sm transition-colors hover:bg-orange-100" title="Infographics">🎨</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-sm transition-colors hover:bg-orange-100" title="Slides">📊</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Chapter Content View ────────────────────────────
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Back + Header */}
      <div className="animate-fade-in-up space-y-4">
        <button
          onClick={handleBackToChapters}
          className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 transition-colors hover:text-orange-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to chapters
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 font-bold text-white shadow-lg text-lg">
            {getChapterNumber(selectedChapter)}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Chapter {getChapterNumber(selectedChapter)}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{selectedChapter}</h1>
          </div>
        </div>
      </div>

      {/* Content Type Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
        {([
          { id: 'flashcards' as NoteTab, label: 'Flash Cards', icon: '🃏' },
          { id: 'notes' as NoteTab, label: 'Notes', icon: '📝' },
          { id: 'infographics' as NoteTab, label: 'Infographics', icon: '🎨' },
          { id: 'slides' as NoteTab, label: 'Slide Deck', icon: '📊' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-4 right-4 h-1 rounded-t bg-gradient-to-r from-orange-500 to-orange-400" />
            )}
          </button>
        ))}
      </div>

      {/* ─── Content Area ─── */}
      {loading ? (
        /* Loading Shimmer */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-gray-500">Generating with AI</span>
            <span className="animate-pulse text-xl">✨</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">This may take a few seconds...</p>
        </div>
      ) : activeTab === 'flashcards' && content.flashCards ? (
        /* ─── Flash Cards ─── */
        <div className="mx-auto max-w-2xl animate-fade-in-up">
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500">
              Card{' '}
              <span className="font-bold text-orange-500">{currentCardIndex + 1}</span>{' '}
              of{' '}
              <span className="font-bold text-orange-500">{content.flashCards.length}</span>
            </p>
          </div>

          {/* Flippable Card */}
          <div
            className="mb-8 cursor-pointer"
            style={{ perspective: '1200px' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className="relative h-80 w-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 backdrop-blur-md"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="mb-4 text-xs uppercase tracking-wider text-gray-500">Question</p>
                <p className="text-center text-xl font-semibold leading-relaxed text-gray-900">
                  {content.flashCards[currentCardIndex].front}
                </p>
                <p className="mt-8 text-xs text-gray-400">Tap to reveal</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 p-8 backdrop-blur-md"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="mb-4 text-xs uppercase tracking-wider text-orange-500">Answer</p>
                <p className="text-center text-xl font-semibold leading-relaxed text-orange-600">
                  {content.flashCards[currentCardIndex].back}
                </p>
                <p className="mt-8 text-xs text-gray-500">Tap to flip back</p>
              </div>
            </div>
          </div>

          {/* Card Navigation */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={(e) => { e.stopPropagation(); prevCard(); }}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 font-bold text-gray-900 transition-all hover:bg-orange-500 hover:text-white"
            >
              ←
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
              className="rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white transition-all hover:bg-orange-400"
            >
              {isFlipped ? 'Hide Answer' : 'Show Answer'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextCard(); }}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 font-bold text-gray-900 transition-all hover:bg-orange-500 hover:text-white"
            >
              →
            </button>
          </div>

          {/* Card Progress Dots */}
          <div className="mt-6 flex justify-center gap-1.5">
            {content.flashCards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentCardIndex(i); setIsFlipped(false); }}
                className={`h-2 rounded-full transition-all ${
                  i === currentCardIndex
                    ? 'w-6 bg-orange-500'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      ) : activeTab === 'notes' && content.notes ? (
        /* ─── Notes ─── */
        <div className="mx-auto max-w-3xl animate-fade-in-up space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{content.notes.title}</h2>
          {content.notes.sections.map((section, index) => (
            <div key={index} className="glass-card">
              <h3 className="mb-3 text-lg font-bold text-orange-500">{section.heading}</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      ) : activeTab === 'infographics' && content.infographic ? (
        /* ─── Infographics ─── */
        <div className="mx-auto max-w-4xl animate-fade-in-up space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">{content.infographic.title}</h2>

          {/* Key Points Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {content.infographic.keyPoints.map((point, index) => (
              <div
                key={index}
                className="glass-card-hover tilt-hover stagger-item animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{point.icon}</span>
                  <div>
                    <h4 className="mb-1 font-bold text-gray-900">{point.title}</h4>
                    <p className="text-sm text-gray-500">{point.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fun Fact */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 backdrop-blur-md">
            <p className="mb-2 text-sm font-semibold text-orange-500">💡 FUN FACT</p>
            <p className="text-lg leading-relaxed text-gray-900">{content.infographic.funFact}</p>
          </div>

          {/* Mnemonics */}
          {content.infographic.mnemonics.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-orange-500">🧠 Memory Tricks</h3>
              {content.infographic.mnemonics.map((mnemonic, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 backdrop-blur-md"
                >
                  <p className="font-medium text-emerald-700">{mnemonic}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'slides' && content.slides ? (
        /* ─── Slide Deck ─── */
        <div className="mx-auto max-w-4xl animate-fade-in-up">
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500">
              Slide{' '}
              <span className="font-bold text-orange-500">{currentSlideIndex + 1}</span>{' '}
              of{' '}
              <span className="font-bold text-orange-500">{content.slides.slides.length}</span>
            </p>
          </div>

          {/* Slide */}
          <div className="glass-card mb-6 min-h-[24rem]">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              {content.slides.slides[currentSlideIndex].heading}
            </h2>
            <ul className="space-y-4">
              {content.slides.slides[currentSlideIndex].bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-1 text-orange-500">•</span>
                  <span className="text-lg text-gray-700">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Speaker Note */}
          {content.slides.slides[currentSlideIndex].note && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">Speaker Note</p>
              <p className="text-sm leading-relaxed text-gray-600">
                {content.slides.slides[currentSlideIndex].note}
              </p>
            </div>
          )}

          {/* Slide Navigation */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prevSlide}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 font-bold text-gray-900 transition-all hover:bg-orange-500 hover:text-white"
            >
              ←
            </button>
            <div className="flex gap-1.5">
              {content.slides.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlideIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentSlideIndex
                      ? 'w-6 bg-orange-500'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 font-bold text-gray-900 transition-all hover:bg-orange-500 hover:text-white"
            >
              →
            </button>
          </div>
        </div>
      ) : (
        /* ─── Empty / Initial State ─── */
        <div className="py-20 text-center">
          <p className="text-lg text-gray-500">Select a tab to load content</p>
          <p className="mt-2 text-sm text-gray-400">Content is generated by AI on demand</p>
        </div>
      )}
    </div>
  );
}
