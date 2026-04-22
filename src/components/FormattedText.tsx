import React from 'react';
import ProfilePopover from './ProfilePopover';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export default function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (!text) return null;
  
  // Basic markdown parser
  const renderText = (str: string) => {
    // 1. Split by blockquotes first
    const lines = str.split('\n');
    const processedLines = lines.map((line, lineIndex) => {
      if (line.trim().startsWith('> ')) {
        return (
          <blockquote key={`bq-${lineIndex}`} className="border-l-4 border-primary-500/50 pl-3 my-1 italic text-neutral-300 bg-neutral-800/30 py-1 rounded-r-lg">
            {renderInline(line.trim().substring(2))}
          </blockquote>
        );
      }
      return (
        <span key={`line-${lineIndex}`}>
          {renderInline(line)}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
    return processedLines;
  };

  const renderInline = (str: string) => {
    // Regex for mentions, bold, italic
    const tokenRegex = /(@[a-zA-Z0-9_]+|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = str.split(tokenRegex);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-neutral-300">{part.slice(1, -1)}</em>;
      }
      if (part.match(/^@[a-zA-Z0-9_]+$/)) {
        const handle = part.substring(1);
        return (
          <ProfilePopover
            key={index}
            username={handle}
            user={{
              name: handle.charAt(0).toUpperCase() + handle.slice(1),
              handle: handle,
              bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
              avatar: `https://picsum.photos/seed/${handle}/100/100`
            }}
          >
            <span className="bg-primary-500/10 text-primary-400 px-1.5 py-0.5 mx-0.5 rounded-md font-medium cursor-pointer hover:bg-primary-500/20 transition-colors inline-block">
              {part}
            </span>
          </ProfilePopover>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  return (
    <span className={className}>
      {renderText(text)}
    </span>
  );
}
