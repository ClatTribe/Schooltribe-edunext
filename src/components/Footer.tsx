import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#0A0F1B] border-t border-white/10 py-6">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/">
          <span className="flex items-center flex-shrink-0 cursor-pointer">
            <img
              src="/white.svg"
              alt="Logo"
              className="h-32 md:h-32 w-auto object-contain"
            />
          </span>
        </Link>
        <p className="text-sm text-gray-500 font-medium">
          © 2026 SchoolTribe. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
