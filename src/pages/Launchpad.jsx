// src/pages/Launchpad.jsx
import { Link } from 'react-router-dom';
import QuestImage from '../components/QuestImage';

const Launchpad = () => {
  return (
    <div className="relative min-h-screen bg-[#0d0d0d] text-white font-sans pt-20 px-6 overflow-hidden">
      
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
        {/* Optional background effects can go here */}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h1 className="text-[50px] md:text-[60px] font-bold bg-gradient-to-r from-[#FF0080] via-[#367aff] to-[#00A3FF] bg-clip-text text-transparent mb-6">
          Welcome to the Dreava Launchpad
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-12">
          We're not just building a marketplace — we're building a movement. Here, NFTs unlock worlds, ideas, and the next chapter of the digital revolution.
        </p>

        {/* Highlights Section */}
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700 shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Beyond Art & Collectibles</h3>
            <p className="text-sm text-zinc-400">
              Each collection is a living ecosystem, where holders gain access to real utility, exclusive spaces, and transformative opportunities.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700 shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Fuelled by Purpose</h3>
            <p className="text-sm text-zinc-400">
              Our token isn't for speculation. It's the engine of governance, rewards, and platform growth — designed for those who build and believe.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700 shadow-lg">
            <h3 className="text-xl font-semibold mb-2">A Community That Leads</h3>
            <p className="text-sm text-zinc-400">
              OG holders form the core circle, influencing the direction of Dreava and opening doors for emerging creators and projects.
            </p>
          </div>
        </div>

        <div className="mt-12 pb-24 md:pb-0">
          <Link
            to="/active-sales"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold shadow-md hover:opacity-90 transition transform active:scale-95"
          >
            Enter the World of Possibilities
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
