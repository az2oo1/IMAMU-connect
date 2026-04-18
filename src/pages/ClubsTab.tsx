import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';
import { Tent, Search, ArrowRight, Flag } from 'lucide-react';
import { clsx } from 'clsx';
import { useDraggableScroll } from '../hooks/useDraggableScroll';

export const CLUBS_DATA = [
  {
    id: '1',
    name: 'Robotics Club',
    category: 'Tech',
    banner: 'https://picsum.photos/seed/robotics_banner/800/400',
    logo: 'https://picsum.photos/seed/robotics_logo/200/200',
    bio: 'We build robots, compete in national tournaments, and host workshops on Arduino, Raspberry Pi, and AI. Open to all majors!',
    members: 120,
    socials: {
      twitter: '@campus_robotics',
      instagram: '@robotics_club',
      linkedin: 'Campus Robotics'
    },
    news: [
      {
        id: 101,
        title: 'Robotics Team Wins Regional Championship',
        category: 'Tech',
        date: 'Mar 15, 2026',
        readTime: '3 min read',
        image: 'https://picsum.photos/seed/robotwin/600/400',
        excerpt: 'Our autonomous rover took first place at the state competition.'
      }
    ]
  },
  {
    id: '2',
    name: 'Debate Society',
    category: 'Academic',
    banner: 'https://picsum.photos/seed/debate_banner/800/400',
    logo: 'https://picsum.photos/seed/debate_logo/200/200',
    bio: 'Join us to improve your public speaking, critical thinking, and argumentation skills. We meet every Thursday evening.',
    members: 85,
    socials: {
      twitter: '@debate_soc',
      instagram: '@debate_society'
    },
    news: []
  },
  {
    id: '3',
    name: 'Photography Club',
    category: 'Arts',
    banner: 'https://picsum.photos/seed/camera_banner/800/400',
    logo: 'https://picsum.photos/seed/camera_logo/200/200',
    bio: 'A community for photographers of all skill levels. We organize photo walks, gallery exhibitions, and editing workshops.',
    members: 210,
    socials: {
      instagram: '@campus_photo'
    },
    news: [
      {
        id: 102,
        title: 'Spring Exhibition Call for Submissions',
        category: 'Arts',
        date: 'Apr 02, 2026',
        readTime: '2 min read',
        image: 'https://picsum.photos/seed/gallery/600/400',
        excerpt: 'Submit your best campus life photos for our upcoming gallery.'
      }
    ]
  },
  {
    id: '4',
    name: 'Cybersecurity Group',
    category: 'Tech',
    banner: 'https://picsum.photos/seed/hacker_banner/800/400',
    logo: 'https://picsum.photos/seed/hacker_logo/200/200',
    bio: 'Learn ethical hacking, network defense, and participate in CTF (Capture The Flag) competitions.',
    members: 150,
    socials: {
      twitter: '@cyber_group',
      linkedin: 'Cybersecurity Group'
    },
    news: []
  },
  {
    id: '5',
    name: 'Outdoor Adventure',
    category: 'Sports',
    banner: 'https://picsum.photos/seed/hiking_banner/800/400',
    logo: 'https://picsum.photos/seed/hiking_logo/200/200',
    bio: 'Hiking, rock climbing, camping, and more! We explore the great outdoors every weekend.',
    members: 340,
    socials: {
      instagram: '@outdoor_adv'
    },
    news: [
      {
        id: 103,
        title: 'Weekend Trip to the National Park',
        category: 'Sports',
        date: 'Apr 10, 2026',
        readTime: '4 min read',
        image: 'https://picsum.photos/seed/mountain/600/400',
        excerpt: 'Join us for a 2-day camping and hiking trip. Gear provided.'
      }
    ]
  }
];

const CATEGORIES = ["All", "Tech", "Academic", "Arts", "Sports", "Social"];

export default function ClubsTab() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dragScroll = useDraggableScroll<HTMLDivElement>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await fetch('/api/clubs');
        if (res.ok) {
          const data = await res.json();
          setClubs(data.clubs);
        }
      } catch (error) {
        console.error('Failed to fetch clubs', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const filteredClubs = clubs.filter(club => {
    const matchesCategory = activeCategory === "All" || (club.tags && club.tags.includes(activeCategory));
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 h-full overflow-y-auto custom-scrollbar bg-neutral-950 relative"
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto min-h-screen py-8 px-4 relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 mb-2 flex items-center gap-3">
            <Tent className="w-8 h-8 text-primary-500" />
            Campus Clubs
          </h1>
          <p className="text-neutral-400 font-medium">Discover communities, join clubs, and get involved.</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search clubs..." 
              className="w-full bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors shadow-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-neutral-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl inline-flex max-w-full">
            <div 
              {...dragScroll}
              className="flex gap-1 overflow-x-auto scrollbar-hide select-none"
            >
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={clsx(
                    "relative px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors duration-300",
                    activeCategory === category
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                  )}
                >
                  {activeCategory === category && (
                    <motion.div
                      layoutId="clubs-category"
                      className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/25"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredClubs.map((club, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={club.id}
              onClick={() => navigate(`/clubs/${club.id}`)}
              className="group relative rounded-[2rem] overflow-hidden border border-white/10 bg-neutral-900/40 backdrop-blur-md shadow-2xl hover:border-primary-500/50 transition-all duration-500 flex flex-col cursor-pointer min-h-[280px] p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-800 shrink-0 shadow-xl">
                  {club.avatarUrl ? (
                    <OptimizedImage 
                      src={club.avatarUrl} 
                      alt={`${club.name} logo`} 
                      variant="medium"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-xl">
                      {club.name.charAt(0)}
                    </div>
                  )}
                </div>
                {club.tags && (
                  <span className="px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                    {club.tags.split(',')[0]}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col flex-1 relative">
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-primary-400 transition-colors">
                  {club.name}
                </h3>
                <p className="text-neutral-400 text-sm line-clamp-3 mb-4 flex-1">
                  {club.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <span className="text-neutral-500 text-sm font-medium flex items-center gap-1.5">
                    <Tent className="w-4 h-4" /> {club._count?.members || 0} Members
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white text-neutral-400 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredClubs.length === 0 && (
          <div className="text-center py-20 bg-neutral-900/30 rounded-[3rem] border border-neutral-800 border-dashed mb-16">
            <Tent className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No clubs found</h3>
            <p className="text-neutral-400">Try adjusting your search or category filter.</p>
          </div>
        )}

        {/* Claim / Register Club Section */}
        <div className="bg-gradient-to-br from-primary-900/20 to-neutral-900/40 border border-primary-500/20 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center shrink-0 border border-primary-500/30">
                <Flag className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-1">Don't see your club?</h2>
                <p className="text-neutral-400 text-sm max-w-md">
                  Register your club to get an official page, or claim an existing one to manage its profile.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-500 text-white transition-colors shadow-lg shadow-primary-500/25">
                Register Club
              </button>
              <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">
                Claim Club
              </button>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
