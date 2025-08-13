// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { FaTwitter, FaDiscord, FaTelegramPlane } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[#0d0d0d] border-t border-zinc-700 z-[80]">
      <div className="flex flex-row items-center justify-between px-4 md:px-6 py-3 w-full min-h-[52px]">
        <div className="flex gap-6 text-xs md:text-sm text-white whitespace-nowrap overflow-x-auto no-scrollbar">
          <a href="https://www.notion.so/dreava-art-NFT-Launchpad-Guide-Step-by-Step-from-Collection-to-Sale-220626bc8ae98000adfffd01b1aff334" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            Docs
          </a>
          <Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-blue-400 transition-colors">Terms Of Service</Link>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <a href="https://discord.gg/R24uFV3k8b" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            <FaDiscord className="text-white w-5 h-5" />
          </a>
          <a href="https://x.com/dreava_art" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            <FaTwitter className="text-white w-5 h-5" />
          </a>
          <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            <FaTelegramPlane className="text-white w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
