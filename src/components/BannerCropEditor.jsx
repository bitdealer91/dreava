import { useState, useRef, useEffect } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

const BannerCropEditor = ({ 
  imageUrl, 
  onSave, 
  onCancel, 
  initialPosition = 'center center',
  initialFit = 'cover'
}) => {
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(initialFit);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [recommendations, setRecommendations] = useState([]);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Рекомендуемые размеры для баннеров
  const BANNER_RECOMMENDATIONS = [
    { name: 'Desktop Banner', width: 1200, height: 400, ratio: 3, description: 'Оптимально для десктопа' },
    { name: 'Mobile Banner', width: 800, height: 300, ratio: 2.67, description: 'Для мобильных устройств' },
    { name: 'Wide Banner', width: 1600, height: 400, ratio: 4, description: 'Широкий формат' },
    { name: 'Square Banner', width: 800, height: 800, ratio: 1, description: 'Квадратный формат' }
  ];

  // Инициализация позиции на основе initialPosition
  useEffect(() => {
    if (initialPosition) {
      const [x, y] = initialPosition.split(' ');
      const xPercent = x === 'left' ? 0 : x === 'right' ? 100 : 50;
      const yPercent = y === 'top' ? 0 : y === 'bottom' ? 100 : 50;
      setCropArea(prev => ({
        ...prev,
        x: xPercent,
        y: yPercent
      }));
    }
  }, [initialPosition]);

  useEffect(() => {
    setFit(initialFit);
  }, [initialFit]);

  // Load image size when image loads
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        const size = { width: img.naturalWidth, height: img.naturalHeight };
        setImageSize(size);
        
        // Генерируем рекомендации на основе размера изображения
        const ratio = size.width / size.height;
        const newRecommendations = [];
        
        BANNER_RECOMMENDATIONS.forEach(rec => {
          const score = Math.abs(ratio - rec.ratio);
          newRecommendations.push({
            ...rec,
            score,
            isOptimal: score < 0.5
          });
        });
        
        // Сортируем по релевантности
        newRecommendations.sort((a, b) => a.score - b.score);
        setRecommendations(newRecommendations);
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const deltaX = (x - dragStart.x) / zoom;
    const deltaY = (y - dragStart.y) / zoom;
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x + deltaX)),
      y: Math.max(0, Math.min(100, prev.y + deltaY))
    }));
    
    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCropArea({ x: 50, y: 50, width: 100, height: 100 });
    setZoom(1);
    setRotation(0);
    setFit('cover');
  };

  const handleAutoOptimize = () => {
    if (imageSize.width && imageSize.height) {
      const ratio = imageSize.width / imageSize.height;
      
      // Автоматически выбираем оптимальный fit
      if (ratio > 3) {
        // Очень широкое изображение
        setFit('cover');
        setZoom(0.8);
      } else if (ratio < 1) {
        // Высокое изображение
        setFit('cover');
        setZoom(1.2);
      } else {
        // Квадратное или близкое к квадрату
        setFit('cover');
        setZoom(1);
      }
      
      // Центрируем фокус
      setCropArea({ x: 50, y: 50, width: 100, height: 100 });
      setRotation(0);
    }
  };

  const getPositionString = () => {
    const x = cropArea.x < 25 ? 'left' : cropArea.x > 75 ? 'right' : 'center';
    const y = cropArea.y < 25 ? 'top' : cropArea.y > 75 ? 'bottom' : 'center';
    return `${x} ${y}`;
  };

  const handleSave = () => {
    const position = getPositionString();
    onSave({
      position,
      fit,
      cropArea,
      zoom,
      rotation,
      imageSize
    });
  };

  return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[9997] p-4">
              <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] animate-fadeIn border border-zinc-700/30" tabIndex={-1} autoFocus>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/30">
          <h3 className="text-2xl font-bold text-white">Banner Crop Editor</h3>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
          >
            <X size={28} />
          </button>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleZoomIn}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <ZoomIn size={16} />
                <span className="text-sm">Zoom In</span>
              </button>
              <button
                onClick={handleZoomOut}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <ZoomOut size={16} />
                <span className="text-sm">Zoom Out</span>
              </button>
              <button
                onClick={handleRotate}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <RotateCw size={16} />
                <span className="text-sm">Rotate</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Move size={16} />
                <span className="text-sm">Reset</span>
              </button>
              <button
                onClick={handleAutoOptimize}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-pink-500/20 hover:from-blue-500/30 hover:to-pink-500/30 rounded-lg transition-all duration-300"
              >
                <span className="text-sm text-blue-400">Auto Optimize</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Fit:</span>
                <select
                  value={fit}
                  onChange={(e) => setFit(e.target.value)}
                  className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1 text-sm"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </div>
              <div className="text-sm text-zinc-400">
                Zoom: {Math.round(zoom * 100)}%
              </div>
            </div>
          </div>

          {/* Image Editor */}
          <div className="flex gap-6">
            <div className="flex-1">
              <div
                ref={containerRef}
                className="relative w-full h-96 bg-zinc-800 rounded-2xl overflow-hidden cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div 
                  className="relative w-full h-full"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Banner"
                  className={`w-full h-full object-${fit} transition-all duration-300`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    objectPosition: `${cropArea.x}% ${cropArea.y}%`
                  }}
                />
                </div>
                
                {/* Crop Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute inset-0 border-2 border-white/50 border-dashed"></div>
                </div>

                {/* Position Indicator */}
                <div
                  className="absolute w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-zinc-400">
                  Drag to move the focus point • Use zoom to see more of the original image • Current position: <span className="text-pink-400 font-mono">{getPositionString()}</span>
                </p>
              </div>
            </div>

                        {/* Preview */}
            <div className="w-80">
              <h4 className="text-lg font-semibold text-white mb-4">Preview</h4>
              <div className="w-full h-48 bg-zinc-800 rounded-2xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Banner Preview"
                  className={`w-full h-full object-${fit}`}
                  style={{
                    objectPosition: `${cropArea.x}% ${cropArea.y}%`,
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                />
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Position</div>
                  <div className="text-white font-mono">{getPositionString()}</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Fit</div>
                  <div className="text-white capitalize">{fit}</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Zoom</div>
                  <div className="text-white">{Math.round(zoom * 100)}%</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Image Size</div>
                  <div className="text-white">{imageSize.width} × {imageSize.height}</div>
                </div>
                
                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-sm text-zinc-400 mb-2">Recommendations</div>
                    <div className="space-y-2">
                      {recommendations.slice(0, 2).map((rec, index) => (
                        <div 
                          key={index}
                          className={`text-xs p-2 rounded ${
                            rec.isOptimal 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          <div className="font-medium">{rec.name}</div>
                          <div className="text-xs opacity-75">{rec.width} × {rec.height}</div>
                          <div className="text-xs opacity-75">{rec.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-zinc-700/30">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
            >
              Save Banner Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerCropEditor; 