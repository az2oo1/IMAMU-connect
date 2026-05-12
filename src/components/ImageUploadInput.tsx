import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  type: 'avatar' | 'banner';
  uploadUrl?: string; // Optional backend endpoint
}

export default function ImageUploadInput({ label, value, onChange, type, uploadUrl = '/api/upload' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        alert('File upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1.5">{label}</label>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Preview */}
        {value ? (
          <img 
            referrerPolicy="no-referrer" 
            src={value.startsWith('/uploads/') ? value : `/api/image?url=${encodeURIComponent(value)}&w=200`} 
            alt={label} 
            className={type === 'avatar' ? "w-12 h-12 rounded-xl object-cover shrink-0" : "w-24 h-12 rounded-xl object-cover shrink-0 bg-neutral-800"} 
            onError={(e) => {
              (e.target as HTMLImageElement).src = value; // fallback to original if scaling fails
            }}
          />
        ) : (
          <div className={type === 'avatar' ? "w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0" : "w-24 h-12 rounded-xl bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0"}>
            <ImageIcon className="w-5 h-5 text-neutral-500" />
          </div>
        )}
        
        {/* Upload/Remove button */}
        <div className="flex items-center">
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm transition-colors border border-red-500/20 shrink-0 min-w-[40px] sm:min-w-[auto]"
              title="Remove Image"
            >
              <span className="hidden sm:inline">Remove Image</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-xl text-sm transition-colors border border-neutral-700/50 shrink-0 min-w-[40px] sm:min-w-[auto]"
              title="Upload Image"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">Upload Image</span>
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
}
