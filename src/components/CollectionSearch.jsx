import { useState, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';

const CollectionSearch = ({ 
  collections, 
  onFilterChange, 
  className = "" 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: 'all',
    supplyRange: 'all',
    status: 'all'
  });

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    onFilterChange({
      searchTerm: value,
      filters
    });
  }, [filters, onFilterChange]);

  const handleFilterChange = useCallback((filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    onFilterChange({
      searchTerm,
      filters: newFilters
    });
  }, [filters, searchTerm, onFilterChange]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({
      priceRange: 'all',
      supplyRange: 'all',
      status: 'all'
    });
    onFilterChange({
      searchTerm: '',
      filters: {
        priceRange: 'all',
        supplyRange: 'all',
        status: 'all'
      }
    });
  }, [onFilterChange]);

  const hasActiveFilters = searchTerm || 
    filters.priceRange !== 'all' || 
    filters.supplyRange !== 'all' || 
    filters.status !== 'all';

  return (
    <div className={`bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-6 mb-8 ${className}`}>
      {/* Поиск */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/30 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:border-[#00A3FF] transition-colors"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3 rounded-xl transition-all duration-200 ${
            showFilters 
              ? 'bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white' 
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
            title="Clear all filters"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-700/30">
          {/* Фильтр по цене */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Price Range
            </label>
            <select
              value={filters.priceRange}
              onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white focus:outline-none focus:border-[#00A3FF] transition-colors"
            >
              <option value="all">All Prices</option>
              <option value="low">Under 0.1 STT</option>
              <option value="medium">0.1 - 1 STT</option>
              <option value="high">Over 1 STT</option>
            </select>
          </div>

          {/* Фильтр по supply */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Supply Range
            </label>
            <select
              value={filters.supplyRange}
              onChange={(e) => handleFilterChange('supplyRange', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white focus:outline-none focus:border-[#00A3FF] transition-colors"
            >
              <option value="all">All Supplies</option>
              <option value="small">Under 1,000</option>
              <option value="medium">1,000 - 10,000</option>
              <option value="large">Over 10,000</option>
            </select>
          </div>

          {/* Фильтр по статусу */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white focus:outline-none focus:border-[#00A3FF] transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* Активные фильтры */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-700/30">
          {searchTerm && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              Search: "{searchTerm}"
            </span>
          )}
          {filters.priceRange !== 'all' && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Price: {filters.priceRange}
            </span>
          )}
          {filters.supplyRange !== 'all' && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
              Supply: {filters.supplyRange}
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
              Status: {filters.status}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionSearch; 