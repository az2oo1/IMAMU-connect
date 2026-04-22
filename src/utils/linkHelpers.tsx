import React from 'react';
import { Link as LinkIcon, Linkedin, Github, Instagram, Twitter, Globe } from 'lucide-react';

export const getIconForUrl = (url: string) => {
  if (!url) return <LinkIcon className="w-4 h-4" />;
  if (url.includes('github.com')) return <Github className="w-4 h-4" />;
  if (url.includes('linkedin.com')) return <Linkedin className="w-4 h-4" />;
  if (url.includes('instagram.com')) return <Instagram className="w-4 h-4" />;
  if (url.includes('twitter.com') || url.includes('x.com')) return <Twitter className="w-4 h-4" />;
  if (url.includes('letterboxd.com')) return <Globe className="w-4 h-4" />;
  return <LinkIcon className="w-4 h-4" />;
};

export const getPlatformName = (url: string) => {
  if (!url) return 'Link';
  if (url.includes('github.com')) return 'GitHub';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
  if (url.includes('letterboxd.com')) return 'Letterboxd';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return 'Link';
  }
};
