import React from 'react';
import { Link as LinkIcon, Linkedin, Github, Instagram, Twitter, Globe, MessageSquare } from 'lucide-react';

const RedditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <path d="M22 11.5c0-1.4-1.1-2.5-2.5-2.5-1 0-1.8.6-2.2 1.4-1.6-1.1-3.6-1.8-5.8-1.9l1-4.6 3.2.7c.1 1.2 1.1 2.2 2.4 2.2 1.3 0 2.4-1.1 2.4-2.4 0-1.3-1.1-2.4-2.4-2.4-1.1 0-2 .7-2.3 1.7l-3.5-.8c-.2 0-.4.1-.5.3l-1.1 5.3c-2.3.1-4.3.8-5.8 1.9-.4-.8-1.2-1.4-2.2-1.4C1.1 9 0 10.1 0 11.5c0 1 .6 1.8 1.4 2.2-.1.4-.2.8-.2 1.3 0 3.9 4.9 7 10.8 7s10.8-3.1 10.8-7c0-.5-.1-.9-.2-1.3.8-.4 1.4-1.2 1.4-2.2zM8 13.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5S8 14.3 8 13.5zm7.3 4.2c-1.3 1.3-4 1.4-4.8 1.4-.8 0-3.5-.1-4.8-1.4-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0 .8.8 2.8.8 4 .8 1.2 0 3.2 0 4-.8.2-.2.6-.2.8 0 .2.2.2.6 0 .8zm-1.8-2.7c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/>
  </svg>
);

const LetterboxdIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <circle cx="4.5" cy="12" r="3.75" />
    <circle cx="12" cy="12" r="3.75" />
    <circle cx="19.5" cy="12" r="3.75" />
  </svg>
);

export const getIconForUrl = (url: string) => {
  if (!url) return <LinkIcon className="w-4 h-4" />;
  if (url.includes('github.com')) return <Github className="w-4 h-4" />;
  if (url.includes('linkedin.com')) return <Linkedin className="w-4 h-4" />;
  if (url.includes('instagram.com')) return <Instagram className="w-4 h-4" />;
  if (url.includes('twitter.com') || url.includes('x.com')) return <Twitter className="w-4 h-4" />;
  if (url.includes('reddit.com')) return <RedditIcon className="w-4 h-4" />;
  if (url.includes('letterboxd.com')) return <LetterboxdIcon className="w-4 h-4" />;
  return <LinkIcon className="w-4 h-4" />;
};

export const getPlatformName = (url: string) => {
  if (!url) return 'Link';
  if (url.includes('github.com')) return 'GitHub';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('letterboxd.com')) return 'Letterboxd';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return 'Link';
  }
};
