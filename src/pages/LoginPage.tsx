import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, BarChart3 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle, getUserProfile } from '@/services/authService';

interface SectionProps {
  onLogin: () => void;
  isSigningIn: boolean;
}

const AnimatedText = ({ items, className = "" }: { items: string[], className?: string }) => {
  const [index, setIndex] = useState(0);
  const longestWord = [...items].sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <span className={`relative inline-block align-bottom overflow-hidden ${className}`}>
      {/* Invisible placeholder to maintain width and prevent layout shifts */}
      <span className="invisible whitespace-nowrap">{longestWord}</span>
      <AnimatePresence>
        <motion.span
          key={index}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute left-0 top-0 text-[#FE9900] whitespace-nowrap"
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};



const Hero = ({ onLogin, isSigningIn }: SectionProps) => (
  <section className="bg-[#0A0F1B] text-white pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
      <div className="flex-1 space-y-8 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FE9900]/30 bg-[#FE9900]/10 text-[#FE9900] text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#FE9900]"></span>
          India's premium school tuition.
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-extrabold leading-[1.4] text-white">
            Ace <AnimatedText items={['8th', '9th', '10th']} className="mx-2" /> <AnimatedText items={['CBSE', 'ICSE']} className="mx-2" /> <br className="hidden lg:block" />
            with <AnimatedText items={['Duels', 'Peer Learning', 'AI Tutor', 'Mocks']} className="mx-2" />
          </h1>
          <div className="text-3xl font-bold text-white">
            Just <span className="text-[#FE9900]">₹99/month</span> में!
          </div>
        </div>
        
        <p className="text-lg text-gray-400 max-w-xl font-medium">
          SchoolTribe के साथ har concept clear करें. Score high in School Exams & Boards. Let's study together!
        </p>
        
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={onLogin} disabled={isSigningIn} className="bg-[#FE9900] text-[#0A0F1B] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#e68a00] transition-colors flex items-center gap-2 disabled:opacity-50">
            {isSigningIn ? "Connecting..." : "Start Free Trial"} <ArrowRight className="w-5 h-5" />
          </button>
          <a href="#pricing" className="text-white border border-white/20 bg-white/5 font-semibold px-6 py-4 flex items-center gap-2 hover:bg-white/10 rounded-xl transition-colors inline-block text-center cursor-pointer">
            Explore Features
          </a>
        </div>
        
        <div className="flex items-center gap-4 pt-4">
          <div className="flex -space-x-3">
            <img src="https://i.pravatar.cc/100?img=11" className="w-10 h-10 rounded-full border-2 border-[#0A0F1B]" alt="Student" />
            <img src="https://i.pravatar.cc/100?img=12" className="w-10 h-10 rounded-full border-2 border-[#0A0F1B]" alt="Student" />
            <img src="https://i.pravatar.cc/100?img=13" className="w-10 h-10 rounded-full border-2 border-[#0A0F1B]" alt="Student" />
            <img src="https://i.pravatar.cc/100?img=14" className="w-10 h-10 rounded-full border-2 border-[#0A0F1B]" alt="Student" />
          </div>
          <p className="text-sm text-gray-400">Joined by <span className="text-white font-bold">15,000+</span> students this month</p>
        </div>
      </div>
      
      <div className="flex-1 relative w-full mt-10 md:mt-0">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <img 
            src="https://images.unsplash.com/photo-1603354350317-6f7aaa5911c5?q=80&w=2070&auto=format&fit=crop" 
            alt="Indian student studying on tablet" 
            className="w-full h-[400px] md:h-[550px] object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1B] via-transparent to-transparent"></div>
        </div>
        
        {/* Floating Card Top Right */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-6 right-6 bg-[#1A2235]/90 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3"
        >
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <p className="font-semibold text-white text-sm">AI Tutor Online</p>
        </motion.div>

        {/* Floating Card Bottom Left */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute -bottom-6 -left-2 md:-left-10 bg-[#1A2235] border border-white/10 p-5 rounded-2xl shadow-xl flex items-center gap-4 z-20"
        >
          <div className="w-12 h-12 bg-[#FE9900]/20 rounded-full flex items-center justify-center text-[#FE9900]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average Rank Boost</p>
            <p className="font-bold text-white text-xl">+24% in 3 months</p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const Stats = () => (
  <section className="bg-[#0A0F1B] py-16 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold text-white mb-12">Proven Board Results</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        {[
          { title: "Maths & Science", stat: "99%", desc: "Average Score", sub: "Full Marks in core subjects" },
          { title: "CBSE Board", stat: "98%", desc: "CBSE Score", sub: "Toppers from various schools" },
          { title: "ICSE", stat: "99%", desc: "ICSE Score", sub: "Strong base for future" },
          { title: "9th Class", stat: "98%", desc: "Performers", sub: "Top Performers in 9th" },
          { title: "Scholarship", stat: "1000+", desc: "Scholarships", sub: "Preparing for competitive exams" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <h3 className="font-semibold text-gray-300 mb-2">{item.title}</h3>
            <p className="text-4xl font-extrabold text-[#FE9900] mb-1">{item.stat}</p>
            <p className="font-bold text-white text-sm">{item.desc}</p>
            <p className="text-xs text-gray-400 mt-1 text-center">{item.sub}</p>
          </div>
        ))}
      </div>
      <h3 className="text-2xl font-bold text-white mt-16">No Hidden Fees</h3>
    </div>
  </section>
);

const Features = () => (
  <section className="bg-[#0A0F1B] py-20 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Modern Tuition, Assured Results.</h2>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Feature 1 */}
        <div className="bg-[#1A2235] rounded-3xl p-8 shadow-sm border border-white/10 hover:border-white/20 transition-colors">
          <div className="bg-[#0A0F1B] rounded-2xl h-48 mb-6 flex items-center justify-center overflow-hidden relative border border-white/5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
            <div className="flex items-end gap-2 h-24">
              <div className="w-8 bg-[#FE9900] rounded-t-sm h-12"></div>
              <div className="w-8 bg-white/80 rounded-t-sm h-16"></div>
              <div className="w-8 bg-[#FE9900] rounded-t-sm h-8"></div>
              <div className="w-8 bg-white/80 rounded-t-sm h-20"></div>
              <div className="w-8 bg-[#FE9900] rounded-t-sm h-14"></div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">AI-Powered Doubt Solving</h3>
          <p className="text-gray-400 font-medium">Maths, Science, English के doubts instantly clear करें.</p>
        </div>

        {/* Feature 2 */}
        <div className="bg-[#1A2235] rounded-3xl p-8 shadow-sm border border-white/10 hover:border-white/20 transition-colors">
          <div className="bg-[#0A0F1B] rounded-2xl h-48 mb-6 flex flex-col items-center justify-center border-4 border-[#FE9900] shadow-inner">
            <p className="text-white font-bold mb-1">School Exam (AIR)</p>
            <p className="text-sm text-gray-400 mb-2">Predicted Rank</p>
            <p className="text-4xl font-extrabold text-[#FE9900]">School Rank #10</p>
            <p className="text-xs text-gray-500 mt-3 font-medium">Based on School Mocks & Tests</p>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">School Exam Rank Predictor</h3>
          <p className="text-gray-400 font-medium">School exams के basis पर अपनी rank predict करें.</p>
        </div>

        {/* Feature 3 */}
        <div className="bg-[#1A2235] rounded-3xl p-8 shadow-sm border border-white/10 hover:border-white/20 transition-colors">
          <div className="bg-[#0A0F1B] rounded-2xl h-48 mb-6 flex items-center justify-center overflow-hidden border border-white/5">
            <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop" alt="Students raising hands" className="w-full h-full object-cover opacity-80" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Live Interactive Class Practice</h3>
          <p className="text-gray-400 font-medium">Live class में concepts solidify करें with interactive quizzes.</p>
        </div>

        {/* Feature 4 */}
        <div className="bg-[#1A2235] rounded-3xl p-8 shadow-sm border border-white/10 hover:border-white/20 transition-colors">
          <div className="bg-[#0A0F1B] rounded-2xl h-48 mb-6 flex items-center justify-center p-6 border border-white/5">
             <div className="w-full max-w-xs h-full border-2 border-white/20 rounded-xl bg-[#1A2235] flex relative overflow-hidden">
                <div className="w-1/2 border-r-2 border-white/20 p-4 flex flex-col gap-4 bg-[#1A2235]">
                   <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold mx-auto text-white">Notes</div>
                   <div className="h-2 bg-white/20 rounded w-3/4 mx-auto"></div>
                   <div className="h-2 bg-white/20 rounded w-full mx-auto"></div>
                </div>
                <div className="w-1/2 p-4 flex flex-col gap-4 bg-[#1A2235]">
                   <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold mx-auto text-white">Notes</div>
                   <div className="h-2 bg-white/20 rounded w-full mx-auto"></div>
                   <div className="h-2 bg-white/20 rounded w-4/5 mx-auto"></div>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#FE9900]"></div>
                <div className="absolute right-0 top-1/4 bottom-1/4 w-4 bg-[#0A0F1B] rounded-l-sm"></div>
             </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Chapter-wise Notes & Summaries</h3>
          <p className="text-gray-400 font-medium">Class के बाद ready notes for easy revision.</p>
        </div>
      </div>
    </div>
  </section>
);

const Pricing = ({ onLogin, isSigningIn }: SectionProps) => (
  <section id="pricing" className="bg-[#0A0F1B] py-20 border-t border-white/10">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Child's Education, One Simple Plan.</h2>
      <p className="text-gray-400 mb-12 font-medium">Smart prep, easy prices. Cancel anytime.</p>
      
      <div className="bg-[#1A2235] rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative max-w-md mx-auto">
        <div className="bg-[#FE9900] text-[#0A0F1B] text-sm font-bold py-3">
          Extra Discount: Valid for 24 Hrs
        </div>
        <div className="p-8 md:p-10">
          <div className="flex justify-center items-baseline gap-2 mb-2">
            <span className="text-5xl font-extrabold text-white">₹99</span>
            <span className="text-xl text-gray-400 font-bold">/ month</span>
          </div>
          <p className="text-lg font-bold text-white mb-8">8th, 9th, 10th Class</p>
          
          <div className="space-y-4 text-left mb-10">
            {[
              "Access to Full 8th, 9th, 10th Courses",
              "Unlimited Adaptive Practice Tests",
              "Live Class Notes in Hinglish & English",
              "Live Doubt Solving with Expert Teachers",
              "Performance & Progress Analytics"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#FE9900] shrink-0 mt-0.5" />
                <span className="text-gray-300 font-medium text-sm">{feature}</span>
              </div>
            ))}
          </div>
          
          <button onClick={onLogin} disabled={isSigningIn} className="w-full bg-[#FE9900] text-[#0A0F1B] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#e68a00] transition-colors shadow-lg shadow-[#FE9900]/20 disabled:opacity-50">
            {isSigningIn ? "Connecting..." : "Start Learning Now"}
          </button>
          <p className="text-sm text-gray-400 mt-4 font-medium">Trusted by School Students. 7-Day Free Trial.</p>
        </div>
      </div>
    </div>
  </section>
);

const Testimonials = () => (
  <section className="bg-[#0A0F1B] py-20 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Student Success Stories</h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Testimonial 1 */}
        <div className="bg-[#1A2235] rounded-2xl p-6 shadow-sm border border-white/10 md:col-span-2 flex flex-col md:flex-row gap-6 items-center">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" alt="Student" className="w-24 h-24 rounded-xl object-cover shadow-sm" />
          <div>
            <p className="text-gray-300 font-medium italic mb-4 text-lg">"SchoolTribe के focus और doubt solving ने मेरी studies बहुत easy कर दी! Perfect revision material too."</p>
            <p className="font-bold text-white">Rohan K., <span className="font-medium text-gray-400">10th Board Topper</span></p>
          </div>
        </div>
        
        {/* Stats Box */}
        <div className="bg-[#1A2235] rounded-2xl p-6 flex flex-col justify-center items-center text-center border border-white/10">
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-3xl font-extrabold text-[#FE9900]">99.8%</p>
              <p className="text-sm font-bold text-white">Boards Score</p>
            </div>
            <div className="w-px bg-white/20"></div>
            <div>
              <p className="text-3xl font-extrabold text-[#FE9900]">99%</p>
              <p className="text-sm font-bold text-white">CBSE Boards</p>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-2 rounded-lg text-sm font-bold text-white">
            Board Toppers
          </div>
        </div>

        {/* Testimonial 2 */}
        <div className="bg-[#1A2235] rounded-2xl p-6 shadow-sm border border-white/10">
          <p className="text-gray-300 font-medium italic mb-4">"Teachers are so supportive, tension ख़त्म."</p>
          <p className="font-bold text-gray-500 text-sm">- A parent</p>
        </div>

        {/* Testimonial 3 */}
        <div className="bg-[#1A2235] rounded-2xl p-6 shadow-sm border border-white/10">
          <p className="text-gray-300 font-medium italic mb-4">"Student focus बढ़ गया है."</p>
          <p className="font-bold text-gray-500 text-sm">- A teacher</p>
        </div>
      </div>
    </div>
  </section>
);



export default function App() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const userCred = await signInWithGoogle();
      const existingProfile = await getUserProfile(userCred.uid);
      
      if (existingProfile) {
        setProfile(existingProfile);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      console.error("Sign-in error:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1B] font-sans text-white selection:bg-[#FE9900] selection:text-[#0A0F1B]">
      <Navbar />
      <main>
        <Hero onLogin={handleGoogleSignIn} isSigningIn={isSigningIn} />
        <Stats />
        <Features />
        <Pricing onLogin={handleGoogleSignIn} isSigningIn={isSigningIn} />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
