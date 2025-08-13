import { Search, Filter } from 'lucide-react';

const SearchStats = ({ 
  totalCollections, 
  filteredCollections, 
  searchTerm, 
  activeFilters,
  onClearSearch 
}) => {
  const hasFilters = searchTerm || Object.values(activeFilters).some(filter => filter !== 'all');
  const filterCount = Object.values(activeFilters).filter(filter => filter !== 'all').length;

  if (!hasFilters) return null;

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-700/30 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Search className="w-4 h-4" />
            <span className="text-sm">
              {filteredCollections.length} of {totalCollections} collections
            </span>
          </div>
          
          {searchTerm && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Search:</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                "{searchTerm}"
              </span>
            </div>
          )}
          
          {filterCount > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">
                {filterCount} filter{filterCount !== 1 ? 's' : ''} active
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={onClearSearch}
          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
        >
          Clear all
        </button>
      </div>
      
      {filteredCollections.length === 0 && (
        <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
          <p className="text-zinc-400 text-sm">
            No collections match your current search criteria. Try adjusting your filters or search terms.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchStats; 