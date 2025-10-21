import React, { useState, useRef, useEffect, useCallback } from 'react';

// Define common props to avoid complex generic types
interface CommonInputProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  autoCapitalize?: string;
  'aria-label'?: string;
  'aria-required'?: boolean;
  onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}


interface AutocompleteInputProps extends CommonInputProps {
  suggestions: string[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSuggestionSelect: (value: string) => void;
  as?: 'input' | 'textarea';
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  suggestions,
  value,
  onChange,
  onSuggestionSelect,
  as = 'textarea',
  ...props
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (as === 'textarea' && inputRef.current) {
        const textarea = inputRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.style.resize = 'none';
        textarea.style.overflowY = 'hidden';
    }
  }, [value, as]);

  useEffect(() => {
    if (value) {
      const lowercasedValue = value.toLowerCase();
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(lowercasedValue)
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
  }, [value, suggestions]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setShowSuggestions(true);
    if(props.onFocus) {
        props.onFocus(e);
    }
  }

  const hasVisibleSuggestions = showSuggestions && filteredSuggestions.length > 0;

  const commonProps = {
    value,
    onChange,
    onFocus: handleFocus,
    autoComplete: "off",
    ...props,
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {as === 'textarea' ? (
        <textarea
          ref={inputRef}
          rows={1}
          {...commonProps}
        />
      ) : (
        <input
          type="text"
          {...commonProps}
        />
      )}
      {hasVisibleSuggestions && (
        <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};