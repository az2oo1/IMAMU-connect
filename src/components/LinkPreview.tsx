import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import NewsArticleModal from './NewsArticleModal';

const linkPreviewCache: Record<string, any> = {};

export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(linkPreviewCache[url] || null);
  const [loading, setLoading] = useState(!linkPreviewCache[url]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    if (linkPreviewCache[url]) {
      setData(linkPreviewCache[url]);
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    const fetchLinkData = async () => {
      try {
        const res = await fetch(`/api/preview-link?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const d = await res.json();
          if (isMounted) {
            linkPreviewCache[url] = d;
            setData(d);
          }
        }
      } catch (e) {
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLinkData();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-sm rounded-xl border border-neutral-700/50 bg-neutral-800/20 p-4 animate-pulse flex gap-4">
        <div className="w-12 h-12 bg-neutral-700 rounded-lg shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!data || (!data.title && !data.image)) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer" 
        className="mt-2 flex items-center gap-3 w-full max-w-md rounded-xl border border-neutral-700/50 bg-neutral-800/20 hover:bg-neutral-800/40 p-3 transition-colors no-underline"
      >
        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
          <LinkIcon className="text-neutral-400 w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{new URL(url).hostname}</div>
          <div className="text-neutral-500 text-xs truncate">{url}</div>
        </div>
      </a>
    );
  }

  return (
    <>
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer" 
        onClick={(e) => {
          if (data.type === 'article') {
            e.preventDefault();
            setShowArticleModal(true);
          } else if (data.type === 'form') {
            e.preventDefault();
            setShowFormModal(true);
          }
        }}
        className="mt-2 block w-full max-w-md rounded-xl border border-neutral-700/50 bg-neutral-800/40 hover:bg-neutral-800 transition-colors overflow-hidden no-underline cursor-pointer"
        style={{ textDecoration: 'none' }}
      >
        {data.image && (
          <div className="w-full h-32 md:h-40 bg-neutral-900 border-b border-neutral-700/50 overflow-hidden relative group">
            <img src={data.image} alt={data.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ExternalLink className="text-white w-8 h-8 drop-shadow-md" />
            </div>
          </div>
        )}
        <div className="p-3 md:p-4">
          {data.title && <h4 className="text-white font-bold text-sm md:text-base line-clamp-1 mb-1 m-0">{data.title}</h4>}
          {data.description && <p className="text-neutral-400 text-xs md:text-sm line-clamp-2 leading-relaxed mb-2 m-0">{data.description}</p>}
          <div className="flex items-center justify-between gap-1.5 text-neutral-500 text-[10px] md:text-xs m-0">
            <div className="flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3" />
              <span className="truncate">{new URL(url).hostname}</span>
            </div>
            {(data.type === 'article' || data.type === 'form') && (
              <span className="bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 text-[9px] md:text-[10px] flex items-center">
                {data.type === 'article' ? 'Read Article' : 'Open Form'}
              </span>
            )}
          </div>
        </div>
      </a>
      
      {showArticleModal && data.article && createPortal(
        <NewsArticleModal
          article={{
            id: data.article.id,
            title: data.article.title,
            category: data.article.category || 'News',
            date: new Date(data.article.createdAt).toLocaleDateString(),
            readTime: '5 min read',
            image: data.article.coverImage || data.article.photoUrl || (data.article.club ? data.article.club.coverImage : null) || null,
            excerpt: data.article.content?.substring(0, 150),
            content: data.article.content,
            author: data.article.author,
            isSaved: false
          }}
          isOpen={showArticleModal}
          onClose={() => {
            setShowArticleModal(false);
          }}
        />,
        document.body
      )}

      {showFormModal && data.form && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowFormModal(false); }}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setShowFormModal(false); }} className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 z-10">
              <X className="w-5 h-5"/>
            </button>
            {data.image && <img src={data.image} alt="Form cover" className="w-full h-32 md:h-40 object-cover rounded-xl mb-6 shadow-md" />}
            <h2 className="text-2xl font-bold text-white mb-3">{data.title}</h2>
            <p className="text-neutral-400 mb-8 leading-relaxed">{data.description}</p>
            <a href={`/forms/${data.formId}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-3 md:py-4 rounded-xl transition-colors">
              Answer Now
            </a>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
