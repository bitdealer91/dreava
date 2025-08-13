import { useEffect, useState } from 'react';

const QuickLoading = ({ onLoadingComplete, children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Минимальная задержка для плавности
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setIsLoading(false);
        if (onLoadingComplete) {
          onLoadingComplete();
        }
      } catch (error) {
        console.error('Quick loading error:', error);
        setIsLoading(false);
        if (onLoadingComplete) {
          onLoadingComplete();
        }
      }
    };

    load();
  }, [onLoadingComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-zinc-400">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-lg">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default QuickLoading; 