
import React from 'react';
import type { SignalFilters, SignalType } from '../types';
import { FilterIcon } from './icons';
import { useLanguage } from './LanguageProvider';

const ALL_SIGNAL_TYPES: SignalType[] = ['NEWS', 'ON_CHAIN', 'PROJECT_UPDATE', 'RUMOR', 'SOCIAL_SENTIMENT'];

interface DashboardControlsProps {
  filters: SignalFilters;
  onFilterChange: (newFilters: Partial<SignalFilters>) => void;
  allTokenTags: string[];
}

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer text-sm text-light-text-secondary dark:text-krypton-gray-300 hover:text-light-text-primary dark:hover:text-white">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="form-checkbox h-4 w-4 bg-gray-200 dark:bg-krypton-gray-700 border-gray-300 dark:border-krypton-gray-600 rounded text-krypton-blue-500 focus:ring-krypton-blue-500"
    />
    <span>{label}</span>
  </label>
);

const DashboardControls: React.FC<DashboardControlsProps> = ({ filters, onFilterChange, allTokenTags }) => {
  const { t, translateSignalType } = useLanguage();

  const handleTypeToggle = (type: SignalType, isChecked: boolean) => {
    const newTypes = isChecked
      ? [...filters.types, type]
      : filters.types.filter(t => t !== type);
    onFilterChange({ types: newTypes });
  };
  
  const handleTagToggle = (tag: string, isChecked: boolean) => {
    const newTags = isChecked
      ? [...filters.tokenTags, tag]
      : filters.tokenTags.filter(t => t !== tag);
    onFilterChange({ tokenTags: newTags });
  };

  const clearFilters = () => {
    onFilterChange({ trustScore: 0, types: [], tokenTags: [] });
  }

  return (
    <div className="bg-light-card dark:bg-krypton-gray-800 p-4 rounded-xl border border-light-border dark:border-krypton-gray-700 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FilterIcon className="w-5 h-5 text-light-text-secondary dark:text-krypton-gray-400" />
          <h2 className="text-lg font-bold">{t('dashboard_title')}</h2>
        </div>
        <button onClick={clearFilters} className="text-xs text-krypton-blue-500 hover:underline">{t('dashboard_reset')}</button>
      </div>

      {/* Trust Score Filter */}
      <div>
        <label htmlFor="trustScore" className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300 mb-2">
          {t('dashboard_min_trust')} <span className="font-bold text-krypton-blue-500">{filters.trustScore}</span>
        </label>
        <input
          id="trustScore"
          type="range"
          min="0"
          max="100"
          step="5"
          value={filters.trustScore}
          onChange={e => onFilterChange({ trustScore: parseInt(e.target.value, 10) })}
          className="w-full h-2 bg-gray-200 dark:bg-krypton-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Signal Type Filter */}
      <div>
        <h3 className="text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300 mb-2">{t('dashboard_signal_types')}</h3>
        <div className="space-y-2">
          {ALL_SIGNAL_TYPES.map(type => (
            <Checkbox
              key={type}
              label={translateSignalType(type)}
              checked={filters.types.includes(type)}
              onChange={(isChecked) => handleTypeToggle(type, isChecked)}
            />
          ))}
        </div>
      </div>
      
      {/* Token Tags Filter */}
      {allTokenTags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300 mb-2">{t('dashboard_token_tags')}</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
             {allTokenTags.map(tag => (
              <Checkbox
                key={tag}
                label={`$${tag}`}
                checked={filters.tokenTags.includes(tag)}
                onChange={(isChecked) => handleTagToggle(tag, isChecked)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardControls;