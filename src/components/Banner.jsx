import { useRef } from 'react';
import BannerSvg from './BannerSvg';

const Banner = ({ imageUrl, onUpload, onRemove }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="relative h-[320px] w-full rounded-2xl overflow-hidden shadow-lg mb-8 group"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 z-10 bg-zinc-800 hover:bg-red-600 text-white rounded-full p-1 transition"
            title="Delete banner"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <div className="absolute inset-0 z-0" onClick={handleClick}>
            <BannerSvg className="w-full h-full cursor-pointer select-none" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default Banner;
