import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const VirtualList = ({
  items = [],
  itemHeight = 200,
  containerHeight = 600,
  overscan = 5, // Количество элементов для предзагрузки
  renderItem,
  className = '',
  onScroll = null,
  keyExtractor = (item, index) => index,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);

  // Вычисляем видимые элементы
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  // Получаем только видимые элементы
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, visibleRange, itemHeight]);

  // Обработчик скролла с throttling
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll(newScrollTop);
    }
  }, [onScroll]);

  // Оптимизированный скролл с requestAnimationFrame
  const throttledScroll = useCallback((event) => {
    if (!scrollElementRef.current) {
      scrollElementRef.current = requestAnimationFrame(() => {
        handleScroll(event);
        scrollElementRef.current = null;
      });
    }
  }, [handleScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', throttledScroll, { passive: true });
      
      return () => {
        container.removeEventListener('scroll', throttledScroll);
        if (scrollElementRef.current) {
          cancelAnimationFrame(scrollElementRef.current);
        }
      };
    }
  }, [throttledScroll]);

  // Общая высота контейнера
  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={throttledScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={keyExtractor(item, index)} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Оптимизированная версия для изображений
export const VirtualImageList = ({
  images = [],
  itemHeight = 200,
  containerHeight = 600,
  renderImage,
  className = '',
}) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  
  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => new Set(prev).add(index));
  }, []);

  const renderItem = useCallback((image, index) => {
    return (
      <div className="relative">
        {renderImage(image, index, loadedImages.has(index))}
        {!loadedImages.has(index) && (
          <div 
            className="absolute inset-0 bg-zinc-800 animate-pulse"
            style={{ height: itemHeight }}
          />
        )}
      </div>
    );
  }, [renderImage, loadedImages, itemHeight]);

  return (
    <VirtualList
      items={images}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={renderItem}
      className={className}
      keyExtractor={(image, index) => `image-${index}-${image.src || image}`}
    />
  );
};

export default VirtualList; 