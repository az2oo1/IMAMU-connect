import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string;
  onChange: (tags: string) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = "Add a tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  
  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tagList.includes(newTag)) {
        const newTags = [...tagList, newTag].join(', ');
        onChange(newTags);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && tagList.length > 0) {
      const newTags = tagList.slice(0, -1).join(', ');
      onChange(newTags);
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tagList.filter((_, index) => index !== indexToRemove).join(', ');
    onChange(newTags);
  };

  const handleBlur = () => {
    const newTag = inputValue.trim();
    if (newTag && !tagList.includes(newTag)) {
      const newTags = [...tagList, newTag].join(', ');
      onChange(newTags);
      setInputValue('');
    }
  };

  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 flex flex-wrap gap-2 focus-within:border-primary-500 transition-colors">
      {tagList.map((tag, index) => (
        <span key={index} className="flex items-center gap-1 bg-primary-500/20 text-primary-400 px-2.5 py-1 rounded-lg text-sm font-medium">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:text-primary-300 focus:outline-none"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tagList.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent text-white focus:outline-none min-w-[120px] text-sm py-1"
      />
    </div>
  );
}
