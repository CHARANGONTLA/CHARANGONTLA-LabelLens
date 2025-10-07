import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AutocompleteInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  suggestions: string[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSuggestionSelect: (value: string) => void;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ suggestions, value, onChange, onSuggestionSelect, ...props }) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Autosize textarea
    if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.style.resize = 'none';
        textarea.style.overflowY = 'hidden';
    }
  }, [value]);

  useEffect(() => {
    if (value) {
      const lowercasedValue = value.toLowerCase();
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(lowercasedValue)
      );
      setFilteredSuggestions(filtered);
    } else {
      // Show all suggestions if input is empty but focused
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
  
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setShowSuggestions(true);
    if(props.onFocus) {
        props.onFocus(e);
    }
  }

  const hasVisibleSuggestions = showSuggestions && filteredSuggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        autoComplete="off"
        {...props}
      />
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
