/**
 * seedVideoLibrary.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs ONCE from Node.js to pre-fetch YouTube videos for every chapter and
 * store them in Firestore. After this, the app reads from Firestore cache
 * instantly — no YouTube API calls in the browser ever again.
 *
 * Usage:
 *   node scripts/seedVideoLibrary.mjs
 *
 * Requires Node 18+ (native fetch). Uses the same Firebase project & YouTube
 * key as the app — no extra credentials needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// ── Config (same as src/lib/firebase.ts) ─────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyDR0cIDqam7SzqBTo7eZ3tKe460UIWWIaY',
  authDomain:        'leave-tracker-1c6ac.firebaseapp.com',
  projectId:         'leave-tracker-1c6ac',
  storageBucket:     'leave-tracker-1c6ac.firebasestorage.app',
  messagingSenderId: '924273648814',
  appId:             '1:924273648814:web:9be290290a3ebb01aa393f',
};

const YOUTUBE_API_KEY = 'AIzaSyBz5cwnn61y_7iWvqec0h9jY5R5R1aIRYw';
const CACHE_VERSION   = 'v5';
const DELAY_MS        = 500; // 0.5s between API calls — stays well within free quota

// ── Chapter data (mirrors src/constants/chapters.ts) ─────────────────────────
const ALL_CHAPTERS = [
  // ICSE Class 10 (priority — most students)
  { board:'ICSE', cls:10, subject:'physics',   chapters:['Force','Work, Energy and Power','Machines','Refraction of Light at Plane Surfaces','Refraction Through a Lens','Spectrum','Sound','Current Electricity','Household Circuits','Magnetic Effect of Current','Calorimetry','Radioactivity'] },
  { board:'ICSE', cls:10, subject:'chemistry',  chapters:['Periodic Table, Periodic Properties and Variations of Properties','Chemical Bonding','Acids, Bases and Salts','Analytical Chemistry','Mole Concept and Stoichiometry','Electrolysis','Metallurgy','Study of Compounds — Hydrogen Chloride','Study of Compounds — Ammonia','Study of Compounds — Nitric Acid','Study of Compounds — Sulphuric Acid','Organic Chemistry'] },
  { board:'ICSE', cls:10, subject:'biology',    chapters:['Cell Cycle, Cell Division and Structure of Chromosomes','Genetics — Some Basic Fundamentals','Absorption by Roots','Transpiration','Photosynthesis','Chemical Coordination in Plants','The Circulatory System','The Excretory System','The Nervous System and Sense Organs','The Endocrine System','The Reproductive System','Population — The Increasing Numbers and Rising Problems','Pollution — A Rising Environmental Problem'] },
  { board:'ICSE', cls:10, subject:'maths',      chapters:['GST (Goods and Services Tax)','Banking','Shares and Dividends','Linear Inequations','Quadratic Equations in One Variable','Factorisation','Ratio and Proportion','Matrices','Arithmetic and Geometric Progressions','Reflection','Section Formula','Equation of a Straight Line','Similarity','Locus','Circles','Constructions','Mensuration','Trigonometric Identities','Trigonometric Tables','Heights and Distances','Measures of Central Tendency','Probability'] },

  // CBSE Class 10
  { board:'CBSE', cls:10, subject:'science',    chapters:['Chemical Reactions and Equations','Acids, Bases and Salts','Metals and Non-metals','Carbon and its Compounds','Periodic Classification of Elements','Life Processes','Control and Coordination','How do Organisms Reproduce?','Heredity and Evolution','Light — Reflection and Refraction','The Human Eye and the Colourful World','Electricity','Magnetic Effects of Electric Current'] },
  { board:'CBSE', cls:10, subject:'maths',      chapters:['Real Numbers','Polynomials','Pair of Linear Equations in Two Variables','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Introduction to Trigonometry','Some Applications of Trigonometry','Circles','Areas Related to Circles','Surface Areas and Volumes','Statistics','Probability'] },

  // ICSE Class 9
  { board:'ICSE', cls:9,  subject:'physics',    chapters:['Measurements and Experimentation','Motion in One Dimension','Laws of Motion','Pressure in Fluids and Atmospheric Pressure','Upthrust in Fluids, Archimedes Principle and Floatation','Heat and Energy','Reflection of Light','Propagation of Sound Waves','Current Electricity','Magnetism'] },
  { board:'ICSE', cls:9,  subject:'chemistry',  chapters:['The Language of Chemistry','Chemical Changes and Reactions','Water','Atomic Structure and Chemical Bonding','The Periodic Table','Study of the First Element — Hydrogen','Study of Gas Laws','Atmospheric Pollution'] },
  { board:'ICSE', cls:9,  subject:'biology',    chapters:['Introducing Biology','Cell: The Unit of Life','Tissues: Plant and Animal Tissues','The Flower','Pollination and Fertilisation','Seeds: Structure and Germination','Respiration in Plants','Five Kingdom Classification','Economic Importance of Bacteria and Fungi','Nutrition','Digestive System','Skin: The Jack of All Trades','The Respiratory System','Hygiene — A Key to Healthy Life','Diseases: Cause and Control'] },
  { board:'ICSE', cls:9,  subject:'maths',      chapters:['Rational and Irrational Numbers','Compound Interest','Expansions','Factorisation','Simultaneous Linear Equations','Problems on Simultaneous Linear Equations','Quadratic Equations','Indices','Logarithms','Triangles','Mid Point Theorem','Pythagoras Theorem','Rectilinear Figures','Theorems on Area','Circle','Mensuration','Trigonometric Ratios','Trigonometric Ratios and Standard Angles','Coordinate Geometry','Statistics'] },

  // CBSE Class 9
  { board:'CBSE', cls:9,  subject:'science',    chapters:['Matter in Our Surroundings','Is Matter Around Us Pure','Atoms and Molecules','Structure of the Atom','The Fundamental Unit of Life','Tissues','Motion','Force and Laws of Motion','Gravitation','Work and Energy','Sound','Diversity in Living Organisms','Improvement in Food Resources'] },
  { board:'CBSE', cls:9,  subject:'maths',      chapters:['Number Systems','Polynomials','Coordinate Geometry','Linear Equations in Two Variables','Introduction to Euclid\'s Geometry','Lines and Angles','Triangles','Quadrilaterals','Circles','Heron\'s Formula','Surface Areas and Volumes','Statistics','Probability'] },

  // ICSE Class 8
  { board:'ICSE', cls:8,  subject:'physics',    chapters:['Matter','Physical Quantities and Measurement','Force and Pressure','Energy','Light Energy','Heat Transfer','Sound','Electricity'] },
  { board:'ICSE', cls:8,  subject:'chemistry',  chapters:['Matter','Physical and Chemical Changes','Elements, Compounds and Mixtures','Atomic Structure','Language of Chemistry','Chemical Reactions','Hydrogen','Water','Carbon and Its Compounds'] },
  { board:'ICSE', cls:8,  subject:'biology',    chapters:['Transportation in Plants','Reproduction in Plants','Reproduction in Humans','Ecosystems','Endocrine System and Adolescence','The Circulatory System','Nervous System','Diseases and First Aid','Food Production'] },

  // CBSE Class 8
  { board:'CBSE', cls:8,  subject:'science',    chapters:['Exploring the Investigative World of Science','The Invisible Living World: Beyond Our Naked Eye','Health: The Ultimate Treasure','Electricity: Magnetic and Heating Effects','Exploring Forces','Pressure, Winds, Storms and Cyclones','Particulate Nature of Matter','Nature of Matter: Elements, Compounds and Mixtures','The Amazing World of Solutes, Solvents and Solutions','Light: Mirrors and Lenses','Keeping Time with the Skies','How Nature Works in Harmony','Our Home: Earth, a Unique Life Sustaining Planet'] },
  { board:'CBSE', cls:8,  subject:'maths',      chapters:['A Square and A Cube','Power Play','A Story of Numbers','Quadrilaterals','Number Play','We Distribute, Yet Things Multiply','Proportional Reasoning'] },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchYouTubeVideos(board, cls, subject, chapter) {
  const queries = [
    `${board} Class ${cls} ${chapter} ${subject}`,
    `Class ${cls} ${chapter} ${subject} Magnet Brains Vedantu`,
  ];

  for (const query of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part',           'snippet');
    url.searchParams.set('q',              query);
    url.searchParams.set('type',           'video');
    url.searchParams.set('maxResults',     '8');
    url.searchParams.set('order',          'relevance');
    url.searchParams.set('videoEmbeddable','true');
    url.searchParams.set('key',            YOUTUBE_API_KEY);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`YouTube API ${resp.status}: ${text.slice(0, 200)}`);
    }
    const data = await resp.json();

    if (data.items?.length) {
      return data.items.map(item => ({
        videoId:      item.id.videoId,
        title:        item.snippet.title || chapter,
        channelTitle: item.snippet.channelTitle || '',
        description:  (item.snippet.description || '').slice(0, 120),
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ||
                      `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      }));
    }
  }
  return [];
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  let total = ALL_CHAPTERS.reduce((sum, g) => sum + g.chapters.length, 0);
  let done  = 0;
  let saved = 0;
  let skipped = 0;
  let failed  = 0;

  console.log(`\n🚀 SchoolTribe Video Library Seeder`);
  console.log(`📚 ${total} chapters to process across ${ALL_CHAPTERS.length} subject groups\n`);

  for (const group of ALL_CHAPTERS) {
    const { board, cls, subject, chapters } = group;
    console.log(`\n──── ${board} Class ${cls} ${subject.toUpperCase()} (${chapters.length} chapters) ────`);

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterNumber = i + 1;
      const cacheKey = `${board}_${cls}_${subject}_${chapterNumber}_${CACHE_VERSION}`;
      done++;

      // Skip if already seeded
      const existing = await getDoc(doc(db, 'videoLibrary', cacheKey));
      if (existing.exists() && existing.data().videos?.length > 0) {
        console.log(`  ✅ [${done}/${total}] ${chapter} — already seeded (${existing.data().videos.length} videos)`);
        skipped++;
        continue;
      }

      process.stdout.write(`  ⏳ [${done}/${total}] ${chapter}...`);

      try {
        const videos = await fetchYouTubeVideos(board, cls, subject, chapter);
        await sleep(DELAY_MS);

        if (videos.length > 0) {
          await setDoc(doc(db, 'videoLibrary', cacheKey), {
            board, classLevel: cls, subject, chapter,
            chapterNumber,
            videos,
            seededAt: new Date().toISOString(),
          });
          console.log(` ✅ ${videos.length} videos saved`);
          saved++;
        } else {
          console.log(` ⚠️  0 videos found — skipping`);
          failed++;
        }
      } catch (err) {
        console.log(` ❌ Error: ${err.message}`);
        failed++;
        await sleep(1000); // extra delay on error
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`   Saved:   ${saved} chapters`);
  console.log(`   Skipped: ${skipped} chapters (already had videos)`);
  console.log(`   Failed:  ${failed} chapters (no results or error)`);
  console.log(`\n🎉 All future users will get instant video loading from Firestore.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
