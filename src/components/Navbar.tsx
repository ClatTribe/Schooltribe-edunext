"use client";
import React, { useState, useEffect } from "react";
import { LogOut, Menu, X, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle, getUserProfile, signOut } from '@/services/authService';

const primary = "#F59E0B";
const textMuted = "#94a3b8";

// Updated highlight to schooltribe
const CURRENT_PRODUCT = "schooltribe";

const PRODUCTS = [
  { id: "edunext", label: "EduNext", url: "https://getedunext.com" },
  { id: "preptribe", label: "PrepTribe", url: "https://preptribe.getedunext.com/" },
  { id: "schooltribe", label: "SchoolTribe", url: "https://schooltribe.getedunext.com/" },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Success Stories", href: "#stories" },
];

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const navigate = useNavigate();
  // The signOut is imported from authService
  const { user, profile, setProfile } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
    }
    setMobileMenuOpen(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setMobileMenuOpen(false);
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled || mobileMenuOpen
          ? "bg-[#060818]/90 backdrop-blur-xl border-white/10 shadow-2xl"
          : "bg-[#060818]/80 backdrop-blur-md border-white/5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

        <Link to="/">
          <span className="flex items-center flex-shrink-0 cursor-pointer">
            <img
              src="/white.svg"
              alt="Logo"
              className="h-32 md:h-32 w-auto object-contain"
            />
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div
            className="flex items-center rounded-lg overflow-hidden border border-white/5"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            {PRODUCTS.map((p) => {
              const isActive = p.id === CURRENT_PRODUCT;
              return (
                <a
                  key={p.id}
                  href={p.url}
                  className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all duration-200"
                  style={{
                    color: isActive ? primary : textMuted,
                    backgroundColor: isActive ? "rgba(245, 158, 11, 0.1)" : "transparent",
                    borderBottom: isActive ? `2px solid ${primary}` : "2px solid transparent",
                  }}
                >
                  {p.label}
                </a>
              );
            })}
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xs">
                {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="bg-amber-500 hover:bg-amber-400 text-[#060818] px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSigningIn ? <Loader2 size={14} className="animate-spin" /> : "Join Elite"}
            </button>
          )}
        </div>

        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#060818] border-b border-white/10 p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-lg font-semibold text-slate-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRODUCTS.map((p) => (
              <a
                key={p.id}
                href={p.url}
                className={`py-2 text-[10px] text-center font-bold rounded-md border ${p.id === CURRENT_PRODUCT
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                    : "border-white/5 text-slate-500"
                  }`}
              >
                {p.label}
              </a>
            ))}
          </div>

          {!user ? (
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-amber-500 text-[#060818] py-3 rounded-xl font-bold uppercase tracking-widest"
            >
              {isSigningIn ? "Connecting..." : "Join Elite"}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 text-red-500 py-3 rounded-xl font-bold"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;