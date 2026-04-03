import React from 'react';
import ProfilePopover from './ProfilePopover';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export default function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Regex to match @username (alphanumeric and underscores)
  const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
  
  const parts = text.split(mentionRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(mentionRegex)) {
          const handle = part.substring(1);
          return (
            <ProfilePopover
              key={index}
              user={{
                name: handle.charAt(0).toUpperCase() + handle.slice(1),
                handle: handle,
                bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
                avatar: `https://picsum.photos/seed/${handle}/100/100`
              }}
            >
              <span className="bg-primary-500/10 text-primary-400 px-1.5 py-0.5 mx-0.5 rounded-md font-medium cursor-pointer hover:bg-primary-500/20 transition-colors">
                {part}
              </span>
            </ProfilePopover>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
