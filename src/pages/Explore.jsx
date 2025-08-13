// src/pages/Explore.jsx
import { useEffect } from 'react';
import CreateCollection from '../components/CreateCollection';

const Explore = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  return (
          <main className="max-w-4xl mx-auto px-4 py-10 text-white">
      <section
        id="create"
        className="bg-[#1a1a1a] p-8 rounded-2xl shadow-lg mb-10"
      >
        <CreateCollection />
      </section>
    </main>
  );
};

export default Explore;