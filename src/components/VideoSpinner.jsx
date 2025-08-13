import React from 'react';

const VideoSpinner = ({ type = 'processing', className = '', size = 'md' }) => {
  const getVideoSource = () => {
    return '/assets/videos/IMG.mov';
  };

  const getText = () => {
    switch (type) {
      case 'processing':
        return 'Processing...';
      case 'uploading':
        return 'Uploading...';
      default:
        return 'Loading...';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'processing':
        return 'text-blue-400';
      case 'uploading':
        return 'text-green-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'md':
        return 'w-12 h-12';
      case 'lg':
        return 'w-20 h-20'; // Увеличили размер для лучшей видимости
      default:
        return 'w-12 h-12';
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${getSizeClasses()} bg-black rounded-full flex items-center justify-center overflow-hidden`}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/assets/videos/IMG.mov" type="video/quicktime" />
          <source src="/assets/videos/IMG.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoSpinner; 