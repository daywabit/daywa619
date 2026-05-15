import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { get, set, del } from 'idb-keyval';
import { 
  Home, 
  Search, 
  Library, 
  Settings, 
  ChevronDown, 
  Bolt, 
  Brain, 
  Moon, 
  Leaf, 
  Sun, 
  Activity, 
  Heart, 
  Plus,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  PlusCircle,
  Music,
  Trash2
} from 'lucide-react';

// --- Types ---
type Tab = 'home' | 'search' | 'library' | 'settings';

interface Collection {
  id: string;
  name: string;
  icon: any;
  color: string;
  url?: string; // Local URL for imported tracks
}

// --- Constants ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];

const COLLECTIONS: Collection[] = [
  { id: 'energy', name: 'ENERGY', icon: Bolt, color: '#ff4d6d' },
  { id: 'focus', name: 'FOCUS', icon: Brain, color: '#ff4d6d' },
  { id: 'night', name: 'NIGHT', icon: Moon, color: '#ff4d6d' },
  { id: 'zen', name: 'ZEN', icon: Leaf, color: '#ff4d6d' },
  { id: 'rise', name: 'RISE', icon: Sun, color: '#ff4d6d' },
  { id: 'bass', name: 'BASS', icon: Activity, color: '#ff4d6d' },
  { id: 'soul', name: 'SOUL', icon: Heart, color: '#ff4d6d' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPinkMode, setIsPinkMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Apply Pink Mode to body
  useEffect(() => {
    if (isPinkMode) {
      document.body.classList.add('pink-mode');
    } else {
      document.body.classList.remove('pink-mode');
    }
  }, [isPinkMode]);

  // Persistence: Load from IndexedDB on mount
  useEffect(() => {
    const loadStoredTracks = async () => {
      try {
        const stored = await get('user_tracks');
        if (stored && Array.isArray(stored)) {
          // Recreate object URLs from Blobs
          const hydrated = stored.map(track => {
            if (track.blob) {
              return {
                ...track,
                blob: undefined, // cleanup
                url: URL.createObjectURL(track.blob),
                icon: Music
              };
            }
            return track;
          });
          setCollections(hydrated);
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
      }
    };
    loadStoredTracks();

    // Cleanup object URLs on unmount
    return () => {
      collections.forEach(track => {
        if (track.url) URL.revokeObjectURL(track.url);
      });
    };
  }, []);

  // Audio Control Logic
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error('Playback failed:', err);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack?.url]);

  const handleTrackSelect = (collection: Collection) => {
    setCurrentTrack(collection);
    setIsPlaying(true);
  };

  const deleteCollection = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    
    if (currentTrack?.id === id) {
      setCurrentTrack(null);
      setIsPlaying(false);
    }

    setCollections(prev => {
      const itemToDelete = prev.find(c => c.id === id);
      if (itemToDelete?.url) URL.revokeObjectURL(itemToDelete.url);
      return prev.filter(c => c.id !== id);
    });

    try {
      const stored = await get('user_tracks') || [];
      const filtered = stored.filter((t: any) => t.id !== id);
      await set('user_tracks', filtered);
    } catch (err) {
      console.error('Failed to delete track from storage:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Security & Validation
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('audio/')) {
      setError('Invalid file type. Please select a valid audio file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 50MB.');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      const trackId = `user-${Date.now()}`;
      const newTrack: Collection = {
        id: trackId,
        name: file.name.split('.')[0].toUpperCase().slice(0, 15),
        icon: Music,
        color: '#ff4d6d',
        url: url
      };

      // Update State
      setCollections(prev => [...prev, newTrack]);
      
      // Save to IndexedDB (as Blob)
      const stored = await get('user_tracks') || [];
      const trackToStore = {
        id: newTrack.id,
        name: newTrack.name,
        color: newTrack.color,
        blob: file // Store the actual file blob
      };
      await set('user_tracks', [...stored, trackToStore]);

      setActiveTab('home');
      handleTrackSelect(newTrack);
    } catch (err) {
      setError('Failed to process file. Please try again.');
      console.error(err);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closePlayer = () => {
    setCurrentTrack(null);
  };

  return (
    <div className="relative min-h-screen bg-background text-on-surface overflow-x-hidden">
      {/* Audio Engine */}
      {currentTrack?.url && (
        <audio 
          src={currentTrack.url} 
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-top))] bg-surface/80 backdrop-blur-md z-40 flex items-end justify-between px-margin-mobile md:px-margin-desktop pb-3 text-primary">
        <div className="w-10 flex justify-start">
          {activeTab !== 'home' && (
            <button 
              onClick={() => setActiveTab('home')}
              className="p-2 transition-opacity active:opacity-50"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          )}
        </div>
        <h1 className="text-[24px] font-[800] tracking-tighter mb-1">Daywa</h1>
        <div className="w-10 flex justify-end">
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-section"
            >
              {collections.length === 0 ? (
                <section className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-primary/10 flex items-center justify-center rounded-full mb-8">
                    <Music className="w-10 h-10 text-primary opacity-40" />
                  </div>
                  <h2 className="text-[32px] font-[800] tracking-tighter uppercase mb-4">Silence is Golden</h2>
                  <p className="text-body-lg text-on-surface-variant max-w-[280px] mb-12 opacity-70">
                    Your collection is currently empty. Import some music to start your sonic journey.
                  </p>
                  <button 
                    onClick={() => setActiveTab('search')}
                    className="px-10 py-5 bg-primary text-background font-bold uppercase tracking-widest text-[14px] shadow-xl active:scale-95 transition-all rounded-full flex items-center gap-3"
                  >
                    <PlusCircle className="w-5 h-5 stroke-[3px]" />
                    Import Music
                  </button>
                </section>
              ) : (
                <>
                  <section>
                    <h2 className="text-headline-lg-mobile md:text-headline-lg mb-2 uppercase">My Universe</h2>
                    <p className="text-body-md text-on-surface-variant opacity-70">Tap to launch your sonic landscape.</p>
                  </section>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                    {collections.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleTrackSelect(item)}
                        className="aspect-square bg-primary flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 group relative overflow-hidden cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleTrackSelect(item)}
                      >
                        <item.icon className="w-16 h-16 text-white stroke-[1.5px]" />
                        <span className="text-label-sm text-white">{item.name}</span>
                        
                        {/* Delete Icon - Visible on hover (desktop) or always accessible */}
                        <button 
                          onClick={(e) => deleteCollection(e, item.id)}
                          className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-white/20"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ))}
              <button 
                onClick={() => setActiveTab('search')}
                className="aspect-square bg-surface border-4 border-primary flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 group"
              >
                <PlusCircle className="w-16 h-16 text-primary stroke-[1.5px] group-hover:scale-110 transition-transform" />
                <span className="text-label-sm text-primary uppercase font-bold tracking-widest text-center px-4">Add Track</span>
              </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-12"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="audio/*" 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer flex flex-col items-center"
              >
                <div className="absolute inset-0 bg-primary/5 transition-colors group-hover:bg-primary/10 -m-8" />
                <PlusCircle className="w-40 h-40 text-primary stroke-[1px] relative z-10" />
                <div className="mt-8 flex flex-col items-center space-y-2">
                  <h2 className="text-display tracking-tighter uppercase">IMPORT</h2>
                  <div className="w-24 h-0.5 bg-primary" />
                </div>
              </button>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-primary font-bold text-center px-4"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-gutter"
            >
              {collections.map((item, i) => (
                <div 
                  key={item.id} 
                  className="aspect-square bg-surface-container-highest overflow-hidden group cursor-pointer relative"
                >
                  <div 
                    onClick={() => handleTrackSelect(item)}
                    className="w-full h-full"
                  >
                    <img 
                      src={item.url ? `https://picsum.photos/seed/${item.id}/600/600?grayscale` : `https://picsum.photos/seed/${i + 50}/600/600`}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm flex justify-between items-center translate-y-full group-hover:translate-y-0 transition-transform">
                    <span className="text-[10px] text-white font-bold truncate pr-2 uppercase">{item.name}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCollection(e, item.id);
                      }}
                      className="p-1 hover:text-primary transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setActiveTab('search')}
                className="aspect-square bg-primary flex items-center justify-center text-background transition-opacity active:opacity-80"
              >
                 <PlusCircle className="w-12 h-12" />
              </button>
            </motion.div>
          )}

          {activeTab === 'settings' && (
             <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
             >
               <h2 className="text-headline-lg">Settings</h2>
               <div className="space-y-2">
                 <button 
                   onClick={() => setIsPinkMode(!isPinkMode)}
                   className="w-full h-16 bg-surface flex items-center px-4 justify-between transition-colors active:opacity-80"
                 >
                   <span className="font-bold">Pink Mode</span>
                   <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${isPinkMode ? 'bg-white' : 'bg-on-surface/20'}`}>
                     <motion.div 
                        animate={{ x: isPinkMode ? 24 : 0 }}
                        className={`w-4 h-4 rounded-full ${isPinkMode ? 'bg-[#ff4d6d]' : 'bg-on-surface/40'}`} 
                     />
                   </div>
                 </button>
                 <div className="h-16 bg-surface flex items-center px-4">
                   <span className="font-bold opacity-60">Account Preferences</span>
                 </div>
                 <div className="h-16 bg-surface flex items-center px-4">
                   <span className="font-bold opacity-60">About Daywa</span>
                 </div>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Now Playing Overlay */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-surface z-50 flex flex-col"
          >
            <header className="h-[calc(4rem+env(safe-area-inset-top))] flex items-end justify-between px-margin-mobile pb-3">
              <button onClick={closePlayer} className="p-2">
                <ChevronDown className="w-6 h-6 text-primary" />
              </button>
              <h1 className="text-label-sm text-primary mb-2">Daywa</h1>
              <div className="w-10" />
            </header>

            <main className="flex-grow flex flex-col items-center justify-between py-10 px-margin-mobile">
              <div className="w-full max-w-[320px] aspect-square bg-surface-container-highest shadow-2xl relative overflow-hidden flex-shrink">
                <img 
                  src={currentTrack.url ? `https://picsum.photos/seed/${currentTrack.id}/1200/1200?grayscale` : `https://picsum.photos/seed/${currentTrack.id}/1200/1200`} 
                  alt={currentTrack.name}
                  className="w-full h-full object-cover"
                />
                {isPlaying && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-primary/20 pointer-events-none mix-blend-overlay"
                  />
                )}
              </div>

              <div className="w-full max-w-[600px] text-center px-4">
                <h2 className="text-[28px] md:text-[36px] font-[800] tracking-tighter uppercase leading-tight mb-1">
                  {currentTrack.url ? currentTrack.name : `${currentTrack.name} GENESIS`}
                </h2>
                <p className="text-[18px] font-medium opacity-60">
                  {currentTrack.url ? 'Imported Track' : 'Vapor Theory'}
                </p>
              </div>

              <div className="w-full max-w-[600px] flex flex-col items-center gap-12">
                {/* Progress Bar */}
                <div className="w-full h-[6px] bg-on-surface/10 relative rounded-full overflow-hidden mb-4">
                  <motion.div 
                    key={currentTrack.id}
                    initial={{ width: 0 }}
                    animate={{ width: isPlaying ? '100%' : '35%' }}
                    transition={{ duration: isPlaying ? 180 : 0.5, ease: isPlaying ? 'linear' : 'easeOut' }}
                    className="absolute left-0 top-0 h-full bg-primary" 
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-16 md:gap-24 mb-10">
                  <button className="transition-all active:scale-75 active:opacity-50 group">
                    <SkipBack className="w-12 h-12 fill-current group-hover:text-primary" />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-24 h-24 bg-primary flex items-center justify-center transition-all active:scale-90 shadow-xl active:shadow-none rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-12 h-12 text-surface fill-surface" />
                    ) : (
                      <Play className="w-12 h-12 text-surface fill-surface translate-x-1" />
                    )}
                  </button>
                  <button className="transition-all active:scale-75 active:opacity-50 group">
                    <SkipForward className="w-12 h-12 fill-current group-hover:text-primary" />
                  </button>
                </div>
              </div>
            </main>
            
            {/* Nav Spacing in Overlay */}
            <div className="h-[calc(6rem+env(safe-area-inset-bottom))]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-[calc(6rem+env(safe-area-inset-bottom))] bg-surface/90 backdrop-blur-lg border-t border-surface-container flex items-start justify-around px-margin-mobile pt-4 z-40">
        <TabButton 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')}
          icon={Home} 
          isPinkMode={isPinkMode}
        />
        <TabButton 
          active={activeTab === 'search'} 
          onClick={() => setActiveTab('search')}
          icon={PlusCircle} 
          isPinkMode={isPinkMode}
        />
        <TabButton 
          active={activeTab === 'library'} 
          onClick={() => setActiveTab('library')}
          icon={Library} 
          isBrand={true}
          isPinkMode={isPinkMode}
        />
        <TabButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={Settings} 
          isPinkMode={isPinkMode}
        />
      </nav>
    </div>
  );
}

function TabButton({ 
  icon: Icon, 
  active, 
  onClick, 
  isBrand = false,
  isPinkMode = false
}: { 
  icon: any, 
  active: boolean, 
  onClick: () => void,
  isBrand?: boolean,
  isPinkMode?: boolean
}) {
  return (
    <button 
      onClick={onClick}
      className="relative p-4 transition-all duration-300 group"
    >
      {active && (
        <motion.div 
          layoutId="activeTab"
          className={`absolute inset-0 rounded-2xl -z-10 ${isPinkMode ? 'bg-white' : 'bg-primary/10'}`}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className={`w-8 h-8 transition-all ${
        active 
          ? (isPinkMode ? 'text-[#ff4d6d] scale-110' : 'text-primary scale-110') 
          : 'text-on-surface-variant group-hover:text-primary opacity-60'
      } ${active && isBrand ? (isPinkMode ? 'fill-[#ff4d6d]' : 'fill-primary') : ''}`} />
    </button>
  );
}
