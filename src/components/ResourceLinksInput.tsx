import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface Link {
  name: string;
  url: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  color?: 'primary' | 'amber';
}

export function parseMarkdownLinks(text: string): Link[] {
  if (!text) return [];
  const links: Link[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let hasMatches = false;
  while ((match = regex.exec(text)) !== null) {
    hasMatches = true;
    links.push({ name: match[1], url: match[2] });
  }
  if (!hasMatches && text.trim()) {
    // maybe just plain URLs separated by whitespace
    const urls = text.split(/\s+/).filter(Boolean);
    urls.forEach((url, i) => {
      links.push({ name: `Resource ${i + 1}`, url });
    });
  }
  return links;
}

function serializeMarkdownLinks(links: Link[]): string {
  return links.filter(l => l.name && l.url).map(l => `[${l.name}](${l.url})`).join('\n');
}

export default function ResourceLinksInput({ label, value, onChange, color = 'primary' }: Props) {
  const [links, setLinks] = useState<Link[]>([]);
  // We only parse once when component mounts or value significantly changes from outside
  useEffect(() => {
    if (value && links.length === 0) {
      setLinks(parseMarkdownLinks(value));
    }
  }, [value]);

  const updateLink = (index: number, field: 'name' | 'url', val: string) => {
    const newLinks = [...links];
    newLinks[index][field] = val;
    setLinks(newLinks);
    onChange(serializeMarkdownLinks(newLinks));
  };

  const addLink = () => {
    setLinks([...links, { name: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    onChange(serializeMarkdownLinks(newLinks));
  };

  const focusClass = color === 'primary' ? 'focus:border-primary-500 focus:ring-primary-500/20' : 'focus:border-amber-500 focus:ring-amber-500/20';

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-sm font-medium text-neutral-300">{label}</label>
        <button 
          type="button" 
          onClick={addLink}
          className={`text-xs flex items-center gap-1 ${color === 'primary' ? 'text-primary-400 hover:text-primary-300' : 'text-amber-400 hover:text-amber-300'}`}
        >
          <Plus className="w-3 h-3" /> Add Link
        </button>
      </div>
      
      <div className="space-y-2">
        {links.length === 0 && (
          <div className="text-sm text-neutral-500 italic py-2">No links added yet.</div>
        )}
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Link Name"
                value={link.name}
                onChange={e => updateLink(i, 'name', e.target.value)}
                className={`w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 transition-all ${focusClass}`}
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={e => updateLink(i, 'url', e.target.value)}
                className={`w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 transition-all ${focusClass}`}
              />
            </div>
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-colors mt-0.5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
