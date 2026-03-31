import { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, ChevronRight, Newspaper, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import NewsArticleModal from '../components/NewsArticleModal';

const NEWS_ITEMS = [
  {
    id: 1,
    title: "New Science Building Opening Next Month",
    category: "Campus",
    date: "Mar 28, 2026",
    readTime: "5 min read",
    image: "https://picsum.photos/seed/science/1200/600",
    excerpt: "The state-of-the-art facility will house advanced laboratories, collaborative spaces for STEM students, and a new student cafe. Join us for the ribbon-cutting ceremony.",
    featured: true
  },
  {
    id: 2,
    title: "Spring Registration Deadlines Approaching",
    category: "Academic",
    date: "Mar 29, 2026",
    readTime: "2 min read",
    image: "https://picsum.photos/seed/library2/600/400",
    excerpt: "Make sure to meet with your academic advisor before the April 15th deadline to secure your classes for the upcoming semester."
  },
  {
    id: 3,
    title: "Basketball Team Advances to Finals",
    category: "Sports",
    date: "Mar 30, 2026",
    readTime: "3 min read",
    image: "https://picsum.photos/seed/basketball/600/400",
    excerpt: "A thrilling overtime victory secures our spot in the regional championship game this weekend. Get your tickets now!"
  },
  {
    id: 4,
    title: "Guest Lecture: AI in Modern Healthcare",
    category: "Events",
    date: "Mar 30, 2026",
    readTime: "4 min read",
    image: "https://picsum.photos/seed/lecture/600/400",
    excerpt: "Dr. Sarah Jenkins will be speaking at the main auditorium this Friday at 4 PM. Open to all students and faculty."
  },
  {
    id: 5,
    title: "Campus Sustainability Initiative Reaches Goal",
    category: "Campus",
    date: "Mar 27, 2026",
    readTime: "3 min read",
    image: "https://picsum.photos/seed/nature/600/400",
    excerpt: "Thanks to student efforts, we have reduced campus plastic waste by 40% this semester, hitting our sustainability target early."
  }
];

const CATEGORIES = ["All", "Campus", "Academic", "Sports", "Events"];

export default function NewsTab() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<typeof NEWS_ITEMS[0] | null>(null);
  const dragScroll = useDraggableScroll<HTMLDivElement>();

  const filteredNews = NEWS_ITEMS.filter(
    item => activeCategory === "All" || item.category === activeCategory
  );

  const featuredPost = filteredNews.find(item => item.featured) || filteredNews[0];
  const regularPosts = filteredNews.filter(item => item.id !== featuredPost?.id);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 h-full overflow-y-auto bg-neutral-950 relative"
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto min-h-screen py-8 px-4 relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 mb-2 flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary-500" />
            Campus News
          </h1>
          <p className="text-neutral-400 font-medium">Stay updated with the latest college announcements and stories.</p>
        </div>

        {/* Category Filter */}
        <div 
          {...dragScroll}
          className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide select-none"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={clsx(
                "px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300",
                activeCategory === category
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                  : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-10 group cursor-pointer"
            onClick={() => setSelectedArticle(featuredPost)}
          >
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-neutral-900 aspect-[2/1] md:aspect-[2.5/1]">
              <img 
                src={featuredPost.image} 
                alt={featuredPost.title} 
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col justify-end">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold tracking-wider uppercase">
                    {featuredPost.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {featuredPost.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredPost.readTime}
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight mb-3 group-hover:text-primary-400 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-neutral-300 text-sm md:text-base max-w-3xl line-clamp-2 md:line-clamp-none">
                  {featuredPost.excerpt}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Regular Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {regularPosts.map((post, index) => (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              key={post.id}
              onClick={() => setSelectedArticle(post)}
              className="group cursor-pointer bg-neutral-900/40 backdrop-blur-md border border-white/5 hover:border-primary-500/30 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md text-primary-400 border border-white/10 text-xs font-bold tracking-wider uppercase">
                    {post.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-neutral-500 text-xs font-medium mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white leading-snug mb-2 group-hover:text-primary-400 transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-neutral-400 text-sm line-clamp-3 mb-6 flex-1">
                  {post.excerpt}
                </p>
                
                <div className="mt-auto flex items-center text-primary-500 text-sm font-bold group-hover:gap-2 transition-all">
                  Read Article <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <NewsArticleModal 
          article={selectedArticle} 
          isOpen={!!selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      </div>
    </motion.div>
  );
}
