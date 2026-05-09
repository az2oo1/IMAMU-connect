import React from 'react';
import ProfilePopover from './ProfilePopover';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import LinkPreview from './LinkPreview';

interface FormattedTextProps {
  text: string;
  className?: string;
  onImageClick?: (src: string) => void;
  hidePreviews?: boolean;
}

export default function FormattedText({ text, className = '', onImageClick, hidePreviews = false }: FormattedTextProps) {
  if (!text) return null;

  // Pre-process mentions into custom links to be handled by react-markdown
  const processedText = text.replace(/(?:^|\s)@([a-zA-Z0-9_]+)/g, (match, handle) => {
    return match.replace(`@${handle}`, `[@${handle}](mention://${handle})`);
  });

  const urlRegex = /https?:\/\/[^\s)\]'"]+/g;
  const urls = text.match(urlRegex) || [];
  const uniqueUrls = Array.from(new Set(urls));
  const isOnlyUrls = text.trim().split(/\s+/).every(token => /^https?:\/\/[^\s)\]'"]+$/.test(token));

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {(!isOnlyUrls || hidePreviews) && (
      <div dir="auto" className={`markdown-body prose prose-invert prose-lg max-w-none prose-p:text-neutral-300 prose-headings:text-white prose-a:text-primary-400 hover:prose-a:text-primary-300 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-neutral-300 [&_blockquote]:bg-neutral-800/30 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_img]:rounded-xl [&_img]:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={{
          img: ({ node, src, alt, width, containerstyle, wrapperstyle, ...props }: any) => {
          const handleClick = (e: React.MouseEvent) => {
            if (onImageClick && src) {
              e.preventDefault();
              e.stopPropagation();
              onImageClick(src.replace(/&amp;/g, '&'));
            }
          };
          
          // Reconstruct the image inside its wrapper if width or styles are provided.
          if (width || containerstyle || wrapperstyle) {
            return (
              <div 
                className="w-full my-4 flex justify-center clear-both"
                style={
                wrapperstyle ? 
                  Object.fromEntries(wrapperstyle.split(';').filter(Boolean).map((s: string) => s.split(':').map(str => str.trim())).filter((x: string[]) => x.length === 2).map(([k,v]: string[]) => [k.replace(/-([a-z])/g, (g) => g[1].toUpperCase()), v])) 
                  : {}
              }>
                <div className="w-full relative" style={
                  containerstyle ?
                    Object.fromEntries(containerstyle.split(';').filter(Boolean).map((s: string) => s.split(':').map(str => str.trim())).filter((x: string[]) => x.length === 2).map(([k,v]: string[]) => [k.replace(/-([a-z])/g, (g) => g[1].toUpperCase()), v]))
                    : {}
                }>
                  <img 
                    src={src} 
                    alt={alt} 
                    {...props} 
                    className={`w-full h-auto object-cover rounded-2xl m-0 ${onImageClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} 
                    style={{width: width ? '100%' : undefined, ...props.style}} 
                    onClick={handleClick} 
                  />
                </div>
              </div>
            );
          }
          return <img src={src} alt={alt} {...props} className={`w-full max-h-[70vh] object-cover rounded-2xl my-4 mx-auto ${onImageClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} onClick={handleClick} />;
        },
        a: ({ node, href, children, ...props }) => {
          if (href?.startsWith('mention://')) {
            const handle = href.replace('mention://', '');
            return (
              <ProfilePopover
                username={handle}
                user={{
                  name: handle.charAt(0).toUpperCase() + handle.slice(1),
                  handle: handle,
                  bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
                  avatar: `https://picsum.photos/seed/${handle}/100/100`
                }}
              >
                <span className="bg-primary-500/10 text-primary-400 px-1.5 py-0.5 mx-0.5 rounded-md font-medium cursor-pointer hover:bg-primary-500/20 transition-colors inline-block">
                  @{handle}
                </span>
              </ProfilePopover>
            );
          }
          if (href && uniqueUrls.includes(href)) {
            const childText = Array.isArray(children) ? children[0] : children;
            if (String(childText) === href) {
              return null;
            }
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline underline-offset-2 font-medium break-words transition-colors" {...props}>
              {children}
            </a>
          );
        }
      }}
    >
      {processedText}
    </ReactMarkdown>
    </div>
    )}

      {!hidePreviews && uniqueUrls.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {uniqueUrls.map(url => (
            <LinkPreview key={url} url={url} />
          ))}
        </div>
      )}
    </div>
  );
}
