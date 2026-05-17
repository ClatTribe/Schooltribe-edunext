// import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowRight } from 'lucide-react';
import { usePaywall } from '../hooks/usePaywall';

export default function UpgradeBanner() {
  const { isPremium, isLocked, daysLeft, RAZORPAY_LINK } = usePaywall();

  // Don't show for premium users
  if (isPremium) return null;

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-bold z-[60]"
    >
      <Crown size={16} className="flex-shrink-0" />
      <span>
        {isLocked
          ? 'Your free trial has ended.'
          : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial.`}
        {' '}Upgrade to PrepTribe Pro at just ₹999!
      </span>
      <a
        href={RAZORPAY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 px-3 py-1 bg-white text-amber-600 rounded-full text-xs font-black uppercase tracking-wider hover:bg-amber-50 transition-colors flex items-center gap-1 flex-shrink-0"
      >
        Upgrade Now <ArrowRight size={12} />
      </a>
    </motion.div>
  );
}
