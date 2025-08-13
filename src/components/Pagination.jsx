import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage = 5,
  totalItems,
  className = "" 
}) => {
  if (totalPages <= 1) return null;

  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 0; i < 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages - 1);
      } else if (currentPage >= totalPages - 3) {
        pages.push(0);
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(0);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages - 1);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Информация о страницах */}
      <div className="text-sm text-zinc-400">
        Showing {startItem} to {endItem} of {totalItems} collections
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-2">
        {/* Кнопка "Предыдущая" */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className={`p-2 rounded-lg transition-all duration-200 ${
            currentPage === 0
              ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-800/80 text-white hover:bg-zinc-700/80 hover:scale-105'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Номера страниц */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={typeof page !== 'number'}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                page === currentPage
                  ? 'bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white'
                  : typeof page === 'number'
                  ? 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white'
                  : 'text-zinc-500 cursor-default'
              }`}
            >
              {page === '...' ? '...' : page + 1}
            </button>
          ))}
        </div>

        {/* Кнопка "Следующая" */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={`p-2 rounded-lg transition-all duration-200 ${
            currentPage >= totalPages - 1
              ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-800/80 text-white hover:bg-zinc-700/80 hover:scale-105'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination; 