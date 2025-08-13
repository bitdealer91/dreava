import UniversalLoading from './UniversalLoading';

const LoadingSpinner = ({ 
  message = "Loading...", 
  progress = null, 
  showLogo = true, 
  size = "default",
  className = "",
  showVideo = false,
  showBackground = false,
  showProgress = false,
  showDots = false
}) => {
  return (
    <UniversalLoading
      message={message}
      progress={progress}
      showVideo={showVideo}
      showBackground={showBackground}
      size={size}
      className={className}
      showProgress={showProgress}
      showDots={showDots}
    />
  );
};

export default LoadingSpinner; 