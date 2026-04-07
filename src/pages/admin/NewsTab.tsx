import React, { useState, useEffect } from 'react';
import { Search, Trash2, Calendar } from 'lucide-react';

export default function NewsTab() {
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/admin/news', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Failed to fetch articles', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Failed to delete article', error);
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.author.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">News Management</h2>
        <p className="text-neutral-400">Manage news articles written by users and news writers.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search articles by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/50">
                <th className="p-4 text-sm font-medium text-neutral-400">Title</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Author</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">Loading articles...</td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No articles found.</td>
                </tr>
              ) : filteredArticles.map((article) => (
                <tr key={article.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white line-clamp-1">{article.title}</p>
                    {article.tag && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-400">
                        {article.tag}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-neutral-300">{article.author.name || article.author.username}</p>
                    <p className="text-xs text-neutral-500">@{article.author.username}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-400">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteArticle(article.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
