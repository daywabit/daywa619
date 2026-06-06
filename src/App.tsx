import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ListMusic,
  Compass,
  FileAudio,
  Clock,
  Sparkles,
  Moon,
  Sun,
  Flame,
  Wind,
  CloudRain,
  RotateCcw,
  Shuffle,
  UploadCloud,
  HelpCircle,
  Volume1,
  Activity
} from 'lucide-react';

// Type definitions for internal tracks
interface Track {
  id: string;
  name: string;
  artist: string;
  duration: string;
  url: string;
  isUploaded?: boolean;
  gradient: string;
}

// Pre-defined curated high-quality ambient sound tracks
const CURATED_TRACKS: Track[] = [
  {
    id: 'built-in-1',
    name: 'Cosmic Dust Horizon',
    artist: 'Daywa Ambient Lab',
    duration: '03:45',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Backup demo URL
    gradient: 'from-blue-950 via-indigo-950 to-slate-900',
  },
  {
    id: 'built-in-2',
    name: 'Metanoia Shift',
    artist: 'Daywa Ambient Lab',
    duration: '04:12',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Backup demo URL
    gradient: 'from-violet-950 via-teal-950 to-neutral-900',
  },
  {
    id: 'built-in-3',
    name: 'Retrograde Sleepwalk',
    artist: 'Daywa Ambient Lab',
    duration: '03:20',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', // Backup demo URL
    gradient: 'from-fuchsia-950 via-pink-950 to-stone-900',
  }
];

export default function App() {
  // Navigation & Theme State
  const [activeTab, setActiveTab] = useState<'spaces' | 'library' | 'about'>('spaces');
  const [pinkMode, setPinkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('daywa_pink_mode');
    return saved === 'true';
  });

  // Track Collection States
  const [tracks, setTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('daywa_tracks_meta');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Track[];
        // Filter out non-functional uploaded local URLs across refreshes
        const restored = parsed.map(t => {
          if (t.isUploaded) {
            return { ...t, url: '' }; // Requires re-loading
          }
          return t;
        });
        return [...CURATED_TRACKS, ...restored.filter(t => t.isUploaded)];
      } catch {
        return CURATED_TRACKS;
      }
    }
    return CURATED_TRACKS;
  });

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isLoopTrack, setIsLoopTrack] = useState<boolean>(false);

  // File Upload States
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Breathing Guide State
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingTimer, setBreathingTimer] = useState<number>(4); // simple seconds count

  // Web Audio Procedural Synth Mixer Engine State
  const [synthActive, setSynthActive] = useState<boolean>(false);
  const [padVolume, setPadVolume] = useState<number>(0.4);
  const [rainVolume, setRainVolume] = useState<number>(0.2);
  const [crackleVolume, setCrackleVolume] = useState<number>(0.1);
  const [binauralVolume, setBinauralVolume] = useState<number>(0.3);

  // References for Audio Elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerAnimationRef = useRef<number | null>(null);

  // Web Audio Context & Node Refs for Browser Synthesizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    masterGain: GainNode | null;
    padOsc1Id: OscillatorNode | null;
    padOsc2Id: OscillatorNode | null;
    padGain: GainNode | null;
    rainGain: GainNode | null;
    rainNode: AudioNode | null;
    crackleGain: GainNode | null;
    crackleScriptNode: ScriptProcessorNode | null;
    binauralOscL: OscillatorNode | null;
    binauralOscR: OscillatorNode | null;
    binauralGain: GainNode | null;
  }>({
    masterGain: null,
    padOsc1Id: null,
    padOsc2Id: null,
    padGain: null,
    rainGain: null,
    rainNode: null,
    crackleGain: null,
    crackleScriptNode: null,
    binauralOscL: null,
    binauralOscR: null,
    binauralGain: null,
  });

  // Clock state for UI relaxation metering
  const [currentLocalTime, setCurrentLocalTime] = useState<string>('');

  // Save changes to localStorage helper
  useEffect(() => {
    localStorage.setItem('daywa_pink_mode', String(pinkMode));
  }, [pinkMode]);

  useEffect(() => {
    const uploadedOnly = tracks.filter(t => t.isUploaded);
    localStorage.setItem('daywa_tracks_meta', JSON.stringify(uploadedOnly));
  }, [tracks]);

  // Current Track resolution
  const currentTrack = useMemo(() => {
    if (tracks.length === 0) return null;
    return tracks[currentTrackIndex] || tracks[0];
  }, [tracks, currentTrackIndex]);

  // Track ticking local digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentLocalTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Audio HTML Element volume + speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  // Handle Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTrackEnded = () => {
      if (isLoopTrack) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      } else {
        handleNextTrack();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleTrackEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleTrackEnded);
    };
  }, [tracks, currentTrackIndex, isLoopTrack, isShuffle]);

  // Playback Control Triggers
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Prompt if uploaded song lacks a path URL
      if (currentTrack && currentTrack.isUploaded && !currentTrack.url) {
        alert("This track requires you to re-upload or select the local file from your system. Click 'Re-upload' in the playlist.");
        return;
      }
      
      // Safety initialize audio context if sound is synthesized
      if (synthActive) {
        resumeSynthContext();
      }

      audio.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("Autoplay block / playback error: ", e);
          setIsPlaying(false);
        });
    }
  };

  const selectTrack = (index: number) => {
    if (index < 0 || index >= tracks.length) return;
    
    // Revoke old object URL if any logic suggests
    const wasPlaying = isPlaying;
    setCurrentTrackIndex(index);
    setCurrentTime(0);

    // Give browser brief tick to shift source list
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.load();
        audio.playbackRate = playbackRate;
        if (wasPlaying) {
          audio.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      }
    }, 50);
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      selectTrack(randomIndex);
    } else {
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      selectTrack(nextIndex);
    }
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    selectTrack(prevIndex);
  };

  const handleTimelineChange = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  // Helper formatting for durations
  const formatTimeStr = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Upload/Import Custom Track Drag/Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImportedFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImportedFiles(e.target.files);
    }
  };

  const processImportedFiles = (fileList: FileList) => {
    const newItems: Track[] = [];
    const colorGradients = [
      'from-fuchsia-950 via-rose-950' + (pinkMode ? ' to-pink-950' : ' to-slate-900'),
      'from-emerald-950 via-teal-950 to-zinc-900',
      'from-cyan-950 via-blue-950 to-slate-900',
      'from-violet-950 via-purple-950 to-neutral-900',
      'from-amber-950 via-red-950 to-stone-900',
    ];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('audio/')) continue;

      const randomGradient = colorGradients[Math.floor(Math.random() * colorGradients.length)];
      const objectUrl = URL.createObjectURL(file);

      newItems.push({
        id: `uploaded-${Date.now()}-${i}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // remove file extension
        artist: 'My Custom Audio',
        duration: 'Loading...', // will be fetched by audio node metadata
        url: objectUrl,
        isUploaded: true,
        gradient: randomGradient
      });
    }

    if (newItems.length > 0) {
      setTracks(prev => {
        const updated = [...prev, ...newItems];
        // Auto play the first newly uploaded file
        const newTrackIndex = updated.length - newItems.length;
        setTimeout(() => selectTrack(newTrackIndex), 100);
        return updated;
      });
      setActiveTab('library');
    }
  };

  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trackToDelete = tracks.find(t => t.id === id);
    
    // Revoke object URL to prevent memory leaks as requested
    if (trackToDelete && trackToDelete.url && trackToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(trackToDelete.url);
    }

    const itemIndex = tracks.findIndex(t => t.id === id);
    const updated = tracks.filter(t => t.id !== id);

    setTracks(updated);

    // Safely re-index playback pointing
    if (currentTrackIndex === itemIndex) {
      const nextIdx = Math.max(0, itemIndex - 1);
      setCurrentTrackIndex(nextIdx);
      setCurrentTime(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
        }
      }, 50);
    } else if (currentTrackIndex > itemIndex) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  // Breathing Guide Loop Speed Cycle
  useEffect(() => {
    const breathLoop = setInterval(() => {
      setBreathingTimer(prev => {
        if (prev <= 1) {
          // Shifting Phases: Inhale (4s) -> Hold (4s) -> Exhale (4s)
          setBreathingPhase(curr => {
            if (curr === 'Inhale') return 'Hold';
            if (curr === 'Hold') return 'Exhale';
            return 'Inhale';
          });
          return 4; // Reset phase clock
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(breathLoop);
  }, []);

  // Web Audio Synthesizer Controls & Nodes Initializer
  const initializeSynthEngine = () => {
    try {
      if (audioContextRef.current) return; // already exists

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Master output Node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      masterGain.connect(ctx.destination);
      synthNodesRef.current.masterGain = masterGain;

      // --- 1. Warm Celestial Pad Oscillator Layer ---
      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(padVolume * 0.15, ctx.currentTime);
      padGain.connect(masterGain);
      synthNodesRef.current.padGain = padGain;

      // Oscillator 1 (Tri - base drone low)
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 note
      
      // Lowpass Filter for warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(4, ctx.currentTime);

      osc1.connect(filter);
      filter.connect(padGain);
      osc1.start();
      synthNodesRef.current.padOsc1Id = osc1;

      // Oscillator 2 (Slight detune fifth interval)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(165.4, ctx.currentTime); // E3 fifth interval slightly detuned
      osc2.connect(filter);
      osc2.start();
      synthNodesRef.current.padOsc2Id = osc2;

      // LFO modulation to simulate ambient breathing
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Very slow 0.12Hz
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(padGain.gain);
      lfo.start();

      // --- 2. Heavy Coffee Shop Rain Generator (White Noise filter-sweeps) ---
      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(rainVolume * 0.1, ctx.currentTime);
      rainGain.connect(masterGain);
      synthNodesRef.current.rainGain = rainGain;

      // Noise source: Buffer creation
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // Loop noise source
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Atmospheric bandpass sweeping for rain
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(550, ctx.currentTime);
      rainFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      noiseSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      noiseSource.start();
      synthNodesRef.current.rainNode = noiseSource;

      // Sweep Rain filter via slow oscillator
      const rainLfo = ctx.createOscillator();
      rainLfo.frequency.setValueAtTime(0.07, ctx.currentTime); // 0.07Hz breeze wave
      const rainLfoGain = ctx.createGain();
      rainLfoGain.gain.setValueAtTime(250, ctx.currentTime); // Sweep depth
      rainLfo.connect(rainLfoGain);
      rainLfoGain.connect(rainFilter.frequency);
      rainLfo.start();

      // --- 3. Crackling Campfire Sparks (Script Processor) ---
      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(crackleVolume * 0.08, ctx.currentTime);
      crackleGain.connect(masterGain);
      synthNodesRef.current.crackleGain = crackleGain;

      // Script node generates random spikes
      const crackleNode = ctx.createScriptProcessor(4096, 0, 1);
      crackleNode.onaudioprocess = (e) => {
        const outData = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < outData.length; i++) {
          // Render silent by default, with random high frequency tiny pops
          outData[i] = 0;
          if (Math.random() < 0.0006) {
            outData[i] = (Math.random() * 2 - 1) * 0.45; // Pop spark
          } else if (Math.random() < 0.05) {
            // Low crackle friction rumble
            outData[i] = (Math.random() * 2 - 1) * 0.012;
          }
        }
      };
      crackleNode.connect(crackleGain);
      synthNodesRef.current.crackleScriptNode = crackleNode;

      // --- 4. Deep Sleep Binaural Delta Beats (Panned Oscillators) ---
      const binauralGain = ctx.createGain();
      binauralGain.gain.setValueAtTime(binauralVolume * 0.15, ctx.currentTime);
      binauralGain.connect(masterGain);
      synthNodesRef.current.binauralGain = binauralGain;

      // Left Channel Oscillator (200Hz)
      const binL = ctx.createOscillator();
      binL.type = 'sine';
      binL.frequency.setValueAtTime(200, ctx.currentTime);
      const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panL) {
        panL.pan.setValueAtTime(-1, ctx.currentTime);
        binL.connect(panL);
        panL.connect(binauralGain);
      } else {
        binL.connect(binauralGain);
      }
      binL.start();
      synthNodesRef.current.binauralOscL = binL;

      // Right Channel Oscillator (206Hz - creates a soothing 6Hz Delta wave oscillation in brain!)
      const binR = ctx.createOscillator();
      binR.type = 'sine';
      binR.frequency.setValueAtTime(206, ctx.currentTime);
      const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panR) {
        panR.pan.setValueAtTime(1, ctx.currentTime);
        binR.connect(panR);
        panR.connect(binauralGain);
      } else {
        binR.connect(binauralGain);
      }
      binR.start();
      synthNodesRef.current.binauralOscR = binR;

    } catch (err) {
      console.error("Could not init synth: Web Audio API unsupported or blocked", err);
    }
  };

  const resumeSynthContext = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Toggle synthesizers
  const toggleSynth = () => {
    if (!synthActive) {
      if (!audioContextRef.current) {
        initializeSynthEngine();
      } else {
        resumeSynthContext();
      }
      setSynthActive(true);
    } else {
      setSynthActive(false);
      // Reduce volume values to zero on node levels instead of deleting them flat
      if (synthNodesRef.current.padGain) {
        synthNodesRef.current.padGain.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
      }
      if (synthNodesRef.current.rainGain) {
        synthNodesRef.current.rainGain.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
      }
      if (synthNodesRef.current.crackleGain) {
        synthNodesRef.current.crackleGain.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
      }
      if (synthNodesRef.current.binauralGain) {
        synthNodesRef.current.binauralGain.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
      }
    }
  };

  // Sync mixing slider values to active Web Audio nodes
  useEffect(() => {
    if (!audioContextRef.current || !synthActive) return;
    const ctx = audioContextRef.current;

    if (synthNodesRef.current.padGain) {
      synthNodesRef.current.padGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, padVolume * 0.18),
        ctx.currentTime + 0.1
      );
    }
  }, [padVolume, synthActive]);

  useEffect(() => {
    if (!audioContextRef.current || !synthActive) return;
    const ctx = audioContextRef.current;

    if (synthNodesRef.current.rainGain) {
      synthNodesRef.current.rainGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, rainVolume * 0.12),
        ctx.currentTime + 0.1
      );
    }
  }, [rainVolume, synthActive]);

  useEffect(() => {
    if (!audioContextRef.current || !synthActive) return;
    const ctx = audioContextRef.current;

    if (synthNodesRef.current.crackleGain) {
      synthNodesRef.current.crackleGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, crackleVolume * 0.1),
        ctx.currentTime + 0.1
      );
    }
  }, [crackleVolume, synthActive]);

  useEffect(() => {
    if (!audioContextRef.current || !synthActive) return;
    const ctx = audioContextRef.current;

    if (synthNodesRef.current.binauralGain) {
      synthNodesRef.current.binauralGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, binauralVolume * 0.15),
        ctx.currentTime + 0.1
      );
    }
  }, [binauralVolume, synthActive]);

  // Canvas visualizer rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas Resizing Handler
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let particles: Array<{ x: number; y: number; r: number; val: number; speed: number; col: string }> = [];
    const colorChoices = pinkMode
      ? ['#f472b6', '#ec4899', '#fbcfe8', '#db2777']
      : ['#3b82f6', '#8b5cf6', '#06b6d4', '#4f46e5'];

    const render = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      
      ctx.clearRect(0, 0, w, h);

      // Gradient background glow to visualizer stage
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) / 1.5);
      grad.addColorStop(0, pinkMode ? 'rgba(236,72,153,0.06)' : 'rgba(139,92,246,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Simulating sound intensity through state multipliers
      const basePulse = isPlaying ? 1.4 : 0.4;
      const synthPulse = synthActive ? (padVolume + rainVolume + crackleVolume + binauralVolume) * 0.8 : 0;
      const energy = basePulse + synthPulse;

      // Draw Center Orbiting Ring Guides
      const ringRadius = Math.min(w, h) * 0.28;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = pinkMode ? 'rgba(244,114,182,0.15)' : 'rgba(59,130,246,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w / 2, h / 2, ringRadius * (1 + Math.sin(Date.now() * 0.001) * 0.05), 0, Math.PI * 2);
      ctx.strokeStyle = pinkMode ? 'rgba(236,72,153,0.08)' : 'rgba(139,92,246,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Spawn ambient focus bubbles/particles
      if (particles.length < 50 && Math.random() < 0.15) {
        particles.push({
          x: w / 2 + (Math.random() * 2 - 1) * 20,
          y: h / 2 + (Math.random() * 2 - 1) * 20,
          r: Math.random() * 3 + 1,
          val: Math.random() * Math.PI * 2,
          speed: 0.004 + Math.random() * 0.008,
          col: colorChoices[Math.floor(Math.random() * colorChoices.length)]
        });
      }

      // Render orbiting audio particle waves
      particles.forEach((p, idx) => {
        p.val += p.speed * (isPlaying || synthActive ? 1.8 : 0.4);
        const radiusDelta = ringRadius + Math.sin(p.val * 3 + Date.now() * 0.001) * (15 * energy);
        const px = w / 2 + Math.cos(p.val) * radiusDelta;
        const py = h / 2 + Math.sin(p.val) * radiusDelta;

        ctx.beginPath();
        ctx.arc(px, py, p.r * (1 + energy * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.shadowColor = p.col;
        ctx.shadowBlur = energy * 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections to generate stellar constellation grids
        if (idx > 0 && idx % 7 === 0) {
          const prevP = particles[idx - 1];
          const prevRadiusDelta = ringRadius + Math.sin(prevP.val * 3 + Date.now() * 0.001) * (15 * energy);
          const ppx = w / 2 + Math.cos(prevP.val) * prevRadiusDelta;
          const ppy = h / 2 + Math.sin(prevP.val) * prevRadiusDelta;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ppx, ppy);
          ctx.strokeStyle = pinkMode ? 'rgba(244,114,182,0.07)' : 'rgba(59,130,246,0.05)';
          ctx.stroke();
        }
      });

      // Filter particles out if bounds are exceeded
      particles = particles.filter(p => {
        const d = Math.sqrt(Math.pow(p.x - w/2, 2) + Math.pow(p.y - h/2, 2));
        return d < Math.max(w, h);
      });

      // Render actual rhythmic pulse waveforms under current center guides
      const wavePointsCount = 80;
      ctx.beginPath();
      for (let i = 0; i <= wavePointsCount; i++) {
        const theta = (i / wavePointsCount) * Math.PI * 2;
        // Construct organic sound ripples combining sine modulators
        const modifier = Math.sin(theta * 8 + Date.now() * 0.003) * Math.cos(theta * 3 + Date.now() * 0.002) * (10 * energy);
        const radius = ringRadius + modifier;
        const wx = w / 2 + Math.cos(theta) * radius;
        const wy = h / 2 + Math.sin(theta) * radius;

        if (i === 0) {
          ctx.moveTo(wx, wy);
        } else {
          ctx.lineTo(wx, wy);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = pinkMode ? 'rgba(236,72,153,0.5)' : 'rgba(139,92,246,0.4)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = pinkMode ? '#ec4899' : '#8b5cf6';
      ctx.shadowBlur = energy * 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      visualizerAnimationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      if (visualizerAnimationRef.current) {
        cancelAnimationFrame(visualizerAnimationRef.current);
      }
    };
  }, [isPlaying, synthActive, padVolume, rainVolume, crackleVolume, binauralVolume, pinkMode]);

  // Cleanup synthesizer nodes on component unmount
  useEffect(() => {
    return () => {
      // Safely close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 relative overflow-hidden ${pinkMode ? 'bg-[#150a12] text-pink-50' : 'bg-[#09090b] text-slate-100'}`} id="app-container">
      
      {/* Decorative ambient blurred backgrounds */}
      <div className={`absolute top-[-25%] left-[-10%] w-[50%] h-[60%] rounded-full opacity-35 filter blur-[100px] pointer-events-none transition-colors duration-700 ${pinkMode ? 'bg-pink-900/40' : 'bg-violet-900/30'}`} id="bg-glow-top-left" />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[65%] rounded-full opacity-30 filter blur-[120px] pointer-events-none transition-colors duration-700 ${pinkMode ? 'bg-fuchsia-900/30' : 'bg-cyan-900/20'}`} id="bg-glow-bottom-right" />

      {/* Primary Audio Player HTML Ref */}
      {currentTrack && currentTrack.url && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          autoPlay={isPlaying}
          loop={isLoopTrack}
        />
      )}

      {/* TOP HEADER MENU */}
      <header className="border-b border-white/5 sound-card-blur relative z-20" id="app-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${pinkMode ? 'bg-pink-500 text-black shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-white text-black'}`}>
              <span className="font-bold text-sm tracking-widest font-mono">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-sans flex items-center gap-1.5 leading-none">
                Daywa
                <span className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded uppercase ${pinkMode ? 'bg-pink-500/20 text-pink-300' : 'bg-white/10 text-white/75'}`}>
                  v2.0
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest leading-none mt-1">SONIC LANDSCAPES</p>
            </div>
          </div>

          {/* Clock relaxation and ambient states */}
          <div className="hidden md:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <Clock size={12} className={pinkMode ? 'text-pink-400' : 'text-blue-400'} />
              <span>UTC • {currentLocalTime || '12:00:00'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${pinkMode ? 'bg-pink-500' : 'bg-emerald-500'}`} />
              <span className="text-slate-400">STATUS • {isPlaying || synthActive ? 'PLAYING LANDSCAPE' : 'SILENCE IS GOLDEN'}</span>
            </div>
          </div>

          {/* Interactive controls: Pink Mode & Custom Import triggers */}
          <div className="flex items-center gap-3">
            
            {/* Pink Mode Toggle */}
            <button
              id="pink-mode-toggle"
              onClick={() => setPinkMode(!pinkMode)}
              className={`p-2 rounded-xl border transition-all duration-300 hover:scale-105 flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                pinkMode 
                ? 'bg-pink-500/10 border-pink-500/30 text-pink-300' 
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              title="Toggle Retro Pink Mode"
            >
              {pinkMode ? <Sun size={14} className="animate-spin-slow" /> : <Moon size={14} />}
              <span className="hidden sm:inline">{pinkMode ? 'SLATE MODE' : 'PINK MODE'}</span>
            </button>

            {/* Quick import files picker */}
            <button
              id="import-files-trigger"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 md:px-3 md:py-2 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-xs font-mono cursor-pointer ${
                pinkMode
                ? 'bg-pink-500 text-[#150a12] font-semibold shadow-[0_4px_14px_rgba(236,72,153,0.3)]'
                : 'bg-white text-black font-semibold'
              }`}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">IMPORT AUDIO</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="audio/*"
              className="hidden"
            />
          </div>

        </div>
      </header>

      {/* PRIMARY CENTRAL GRID BOX */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 overflow-hidden" id="primary-grid">
        
        {/* LEFT COLUMN: NAVIGATION RAIL & SOUND PRESETS MIXING (3 COLS) */}
        <section className="lg:col-span-3 flex flex-col gap-5 h-full overflow-y-auto" id="left-rail">
          
          {/* Menu selectors */}
          <nav className={`p-1.5 rounded-2xl flex flex-row lg:flex-col gap-1 transition-colors border ${pinkMode ? 'bg-[#291724]/60 border-pink-900/25' : 'bg-zinc-900/60 border-white/5'}`} id="nav-rail">
            <button
              onClick={() => setActiveTab('spaces')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-300 text-sm font-medium cursor-pointer ${
                activeTab === 'spaces'
                  ? (pinkMode ? 'bg-pink-500 text-black shadow-md' : 'bg-white/10 text-white shadow-sm')
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass size={16} />
              <span>Spaces / Synthesis</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-300 text-sm font-medium cursor-pointer ${
                activeTab === 'library'
                  ? (pinkMode ? 'bg-pink-500 text-black shadow-md' : 'bg-white/10 text-white shadow-sm')
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ListMusic size={16} />
                <span>My Library</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === 'library' ? 'bg-black/20 text-inherit' : 'bg-white/5'}`}>
                {tracks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-300 text-sm font-medium cursor-pointer ${
                activeTab === 'about'
                  ? (pinkMode ? 'bg-pink-500 text-black shadow-md' : 'bg-white/10 text-white shadow-sm')
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HelpCircle size={16} />
              <span>About Daywa</span>
            </button>
          </nav>

          {/* Synthesizer Synthesis Mixers */}
          <div className={`p-5 rounded-2xl border transition-colors flex flex-col gap-4 ${pinkMode ? 'bg-[#291724]/40 border-pink-900/20' : 'bg-zinc-950/40 border-white/5'}`} id="ambient-panel">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  <Activity size={14} className={pinkMode ? 'text-pink-400 animate-pulse' : 'text-blue-400 animate-pulse'} />
                  Ambient Synthesis
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Real-time Web Audio Synthesizer</p>
              </div>

              {/* Engine Power switch */}
              <button
                id="synth-power-toggle"
                onClick={toggleSynth}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider cursor-pointer transition-all duration-300 ${
                  synthActive
                    ? (pinkMode ? 'bg-pink-500 text-[#150a12] shadow-[0_0_12px_rgba(236,72,153,0.4)]' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/15'
                }`}
              >
                {synthActive ? 'SYNTH ON' : 'SYNTH OFF'}
              </button>
            </div>

            {/* Mixer Slider controls */}
            <div className="flex flex-col gap-3 ml-1 mt-1 font-mono text-xs">
              
              {/* Celestial Node Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={11} className={synthActive ? 'text-amber-300 animate-spin-slow' : 'text-slate-500'} />
                    Celestial Pad
                  </span>
                  <span>{Math.round(padVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={padVolume}
                  onChange={(e) => setPadVolume(parseFloat(e.target.value))}
                  disabled={!synthActive}
                  className={`w-full h-1 rounded-lg appearance-none bg-white/5 outline-none disabled:opacity-30 cursor-pointer ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
                />
              </div>

              {/* Rain storm slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CloudRain size={11} className={synthActive ? 'text-blue-400' : 'text-slate-500'} />
                    heavy Rain
                  </span>
                  <span>{Math.round(rainVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={rainVolume}
                  onChange={(e) => setRainVolume(parseFloat(e.target.value))}
                  disabled={!synthActive}
                  className={`w-full h-1 rounded-lg appearance-none bg-white/5 outline-none disabled:opacity-30 cursor-pointer ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
                />
              </div>

              {/* Campfire crackle slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Flame size={11} className={synthActive ? 'text-red-400' : 'text-slate-500'} />
                    Campfire Crackle
                  </span>
                  <span>{Math.round(crackleVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={crackleVolume}
                  onChange={(e) => setCrackleVolume(parseFloat(e.target.value))}
                  disabled={!synthActive}
                  className={`w-full h-1 rounded-lg appearance-none bg-white/5 outline-none disabled:opacity-30 cursor-pointer ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
                />
              </div>

              {/* Binaural Delta wave brain entraining slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Wind size={11} className={synthActive ? 'text-teal-300' : 'text-slate-500'} />
                    Binaural delta (8Hz)
                  </span>
                  <span>{Math.round(binauralVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={binauralVolume}
                  onChange={(e) => setBinauralVolume(parseFloat(e.target.value))}
                  disabled={!synthActive}
                  className={`w-full h-1 rounded-lg appearance-none bg-white/5 outline-none disabled:opacity-30 cursor-pointer ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
                />
              </div>

            </div>

            <div className={`p-3 rounded-lg flex items-center gap-2.5 text-[10px] font-mono ${pinkMode ? 'bg-pink-950/20 text-pink-300/80 border border-pink-900/10' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${synthActive ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
              <span>{synthActive ? 'Mix with your music files played concurrently!' : 'Enable Synthesis to generate real-time ambient wave sounds.'}</span>
            </div>
          </div>

        </section>

        {/* MIDDLE SECTION: CENTRAL FOCUS STAGE (6 COLS) */}
        <section className="lg:col-span-6 flex flex-col gap-6 h-full" id="stage-visuals">
          
          {/* TAB VIEWPORTS */}
          <div className="flex-1 flex flex-col min-h-[380px] lg:min-h-0 relative">
            
            {/* SPACES / SYNTH PRESETS VIEWPORT */}
            {activeTab === 'spaces' && (
              <div className="flex-1 flex flex-col justify-between h-full relative" id="spaces-pane">
                
                {/* Visualizer Stage Container */}
                <div className={`flex-1 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${pinkMode ? 'bg-[#291724]/20 border-pink-900/15' : 'bg-zinc-950/20 border-white/5'}`} id="visualizer-container">
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    id="wave-canvas"
                  />

                  {/* Core Status display */}
                  <div className="absolute top-6 left-6 z-10 flex flex-col" id="playing-track-overlay">
                    <span className={`text-[10px] font-mono tracking-widest text-slate-400 uppercase ${pinkMode ? 'text-pink-400' : ''}`}>NOW CURATING</span>
                    <h2 className="text-xl font-bold tracking-tight font-sans mt-0.5">
                      {currentTrack ? currentTrack.name : 'Silence is Golden'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{currentTrack ? currentTrack.artist : 'Empty Trackspace'}</p>
                  </div>

                  {/* Breathing Cycle Guidance Overlay */}
                  <div className="relative flex flex-col items-center justify-center z-10" id="breathing-ring-panel">
                    <div className="relative flex items-center justify-center">
                      
                      {/* Interactive Expanding Breathing Guidance Circle */}
                      <div className={`rounded-full absolute transition-all duration-1000 ease-in-out border ${
                        breathingPhase === 'Inhale' 
                          ? (pinkMode ? 'w-44 h-44 bg-pink-500/15 border-pink-400/40 shadow-[0_0_35px_rgba(236,72,153,0.25)]' : 'w-44 h-44 bg-blue-500/10 border-blue-400/30' )
                          : breathingPhase === 'Hold'
                            ? (pinkMode ? 'w-52 h-52 bg-pink-400/20 border-pink-300/50 shadow-[0_0_50px_rgba(236,72,153,0.35)]' : 'w-52 h-52 bg-indigo-500/15 border-indigo-400/45' )
                            : (pinkMode ? 'w-32 h-32 bg-pink-500/5 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]' : 'w-32 h-32 bg-purple-500/5 border-purple-400/20' )
                      }`} id="breath-circle-base" />
                      
                      {/* Content of the breathing guide */}
                      <div className="w-28 h-28 rounded-full border border-white/10 flex flex-col items-center justify-center sound-card-blur z-20 text-center" id="breath-meta">
                        <span className={`text-[8.5px] font-mono tracking-widest uppercase transition-colors duration-400 ${pinkMode ? 'text-pink-300' : 'text-slate-400'}`}>
                          BREATHE
                        </span>
                        <span className="text-md font-bold tracking-tight mt-1 font-sans">
                          {breathingPhase}
                        </span>
                        <span className={`text-xs font-mono mt-1 ${pinkMode ? 'text-pink-400/70' : 'text-slate-500'}`}>
                          {breathingTimer}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[11px] text-slate-400 font-mono z-10" id="breathing-guide-instructions">
                    <span className="flex items-center gap-1.5">
                      <Plus size={12} className={pinkMode ? 'text-pink-400' : 'text-blue-400'} />
                      Use the breathing guide to sync your breath
                    </span>
                    <span>1:1 FOCUS CYCLE</span>
                  </div>
                </div>

                {/* Built-in space presets selectors */}
                <div className="mt-4 flex flex-col gap-2.5" id="space-presets-panel">
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="text-slate-400 uppercase tracking-wider">Quick Sonic Spaces presets</span>
                    <span className={pinkMode ? 'text-pink-400' : 'text-blue-400'}>SELECT PRESET</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="spaces-grid shadow-inner">
                    
                    <button
                      onClick={() => {
                        // Nebula Preset Setting
                        setPadVolume(0.55);
                        setRainVolume(0.0);
                        setCrackleVolume(0.12);
                        setBinauralVolume(0.4);
                        if (!synthActive) toggleSynth();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group hover:scale-[1.02] cursor-pointer ${
                        synthActive && padVolume > 0.4 && rainVolume === 0
                          ? (pinkMode ? 'bg-pink-500/10 border-pink-500/40 text-pink-300' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300')
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <Sparkles size={14} className="mb-2 transition-transform duration-300 group-hover:rotate-12" />
                      <div>
                        <span className="text-[11px] font-bold leading-none block">Starlit Nebula</span>
                        <span className="text-[9px] text-slate-400 font-mono leading-none mt-1 block">Deep Focus</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        // Rainy preset Setup
                        setPadVolume(0.3);
                        setRainVolume(0.7);
                        setCrackleVolume(0.0);
                        setBinauralVolume(0.2);
                        if (!synthActive) toggleSynth();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group hover:scale-[1.02] cursor-pointer ${
                        synthActive && rainVolume > 0.5
                          ? (pinkMode ? 'bg-pink-500/10 border-pink-500/40 text-pink-300' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300')
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <CloudRain size={14} className="mb-2 transition-transform duration-300 group-hover:translate-y-0.5" />
                      <div>
                        <span className="text-[11px] font-bold leading-none block">Rainy Cafe</span>
                        <span className="text-[9px] text-slate-400 font-mono leading-none mt-1 block">Stress Relief</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        // Fire Crack Preset
                        setPadVolume(0.2);
                        setRainVolume(0.0);
                        setCrackleVolume(0.75);
                        setBinauralVolume(0.3);
                        if (!synthActive) toggleSynth();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group hover:scale-[1.02] cursor-pointer ${
                        synthActive && crackleVolume > 0.5
                          ? (pinkMode ? 'bg-pink-500/10 border-pink-500/40 text-pink-300' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300')
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <Flame size={14} className="mb-2 transition-transform duration-300 group-hover:scale-110" />
                      <div>
                        <span className="text-[11px] font-bold leading-none block">Campfire Solo</span>
                        <span className="text-[9px] text-slate-400 font-mono leading-none mt-1 block">Cozy Calm</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        // Delta wave sleep setup
                        setPadVolume(0.1);
                        setRainVolume(0.1);
                        setCrackleVolume(0.1);
                        setBinauralVolume(0.85);
                        if (!synthActive) toggleSynth();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group hover:scale-[1.02] cursor-pointer ${
                        synthActive && binauralVolume > 0.7
                          ? (pinkMode ? 'bg-pink-500/10 border-pink-500/40 text-pink-300' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300')
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <Wind size={14} className="mb-2" />
                      <div>
                        <span className="text-[11px] font-bold leading-none block">Astral Sleep</span>
                        <span className="text-[9px] text-slate-400 font-mono leading-none mt-1 block">Binaural Delta</span>
                      </div>
                    </button>

                  </div>
                </div>

              </div>
            )}

            {/* LIBRARY / FILE UPLOADER VIEWPORT */}
            {activeTab === 'library' && (
              <div className="flex-1 flex flex-col h-full" id="library-pane">
                
                {/* Visual Drag & Drop Upload Space */}
                <div
                  id="drag-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 h-56 cursor-pointer select-none ${
                    isDragging
                      ? (pinkMode ? 'border-pink-500 bg-pink-500/10 text-pink-300 shadow-md' : 'border-blue-500 bg-blue-500/5 text-blue-300')
                      : pinkMode
                        ? 'border-pink-900/45 bg-[#291724]/20 hover:bg-[#291724]/40 hover:border-pink-900/70 text-pink-200'
                        : 'border-white/10 bg-zinc-950/10 hover:bg-zinc-950/35 hover:border-white/20 text-slate-300'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={40} className={`mb-3 transition-transform ${isDragging ? 'scale-110 pointer-events-none' : ''}`} />
                  <h4 className="font-bold text-sm tracking-tight">Import Custom Music Tracks</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Drag and drop your own audio files here, or click to browse files from your disk.
                  </p>
                  <span className={`text-[10px] font-mono mt-3 px-2 py-1 rounded bg-white/5 border border-white/5 text-slate-400 uppercase ${pinkMode ? 'text-pink-400' : ''}`}>
                    Supports MP3, WAV, M4A, OGG
                  </span>
                </div>

                {/* Library File list track explorer */}
                <div className="flex-1 flex flex-col gap-2.5 mt-4" id="uploaded-files-display-list">
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="text-slate-400 uppercase tracking-wider">Active Library Playlist</span>
                    <span className="text-slate-400 text-[10px]">{tracks.length} tracks cataloged</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[220px] rounded-xl flex flex-col gap-1.5" id="library-inner-scroller">
                    {tracks.length === 0 ? (
                      <div className="p-8 border border-white/5 rounded-xl text-center flex flex-col items-center justify-center" id="empty-state">
                        <FileAudio size={24} className="text-slate-500 mb-2" />
                        <span className="text-xs text-slate-400">Your library is currently empty.</span>
                      </div>
                    ) : (
                      tracks.map((track, index) => {
                        const isSelected = index === currentTrackIndex;
                        return (
                          <div
                            id={`track-${track.id}`}
                            key={track.id}
                            onClick={() => selectTrack(index)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? (pinkMode ? 'bg-[#291724] border-pink-500/45 text-pink-300 shadow-sm' : 'bg-white/10 border-white/15 text-white')
                                : pinkMode
                                  ? 'bg-transparent border-pink-900/10 hover:bg-[#291724]/20 text-pink-50/70 hover:text-pink-50'
                                  : 'bg-transparent border-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              
                              {/* Abstract cover gradient representation */}
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${track.gradient} flex items-center justify-center font-mono font-bold text-xs shadow-inner flex-shrink-0 relative`}>
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="flex gap-0.5 items-end justify-center w-3 h-3">
                                      <span className="w-0.5 h-3 bg-white block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.1s' }} />
                                      <span className="w-0.5 h-3 bg-white block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.3s' }} />
                                      <span className="w-0.5 h-3 bg-white block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.5s' }} />
                                    </div>
                                  </div>
                                )}
                                {!isSelected && track.name[0]?.toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold truncate leading-tight">{track.name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{track.artist}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="text-[10px] font-mono text-slate-400">{track.duration}</span>
                              <button
                                aria-label="Delete track"
                                onClick={(e) => handleDeleteTrack(track.id, e)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all duration-200 cursor-pointer"
                                title="Delete Track"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* DIRECT INFO / ABOUT PAGE */}
            {activeTab === 'about' && (
              <div className="flex-1 flex flex-col justify-between h-full relative p-6 rounded-2xl border transition-colors bg-zinc-950/20 border-white/5" id="about-pane">
                <div className="flex flex-col gap-4">
                  <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles size={16} className={pinkMode ? 'text-pink-400' : 'text-blue-400'} />
                    The Philosophy of Daywa
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Daywa is structured to serve as an offline, immediate, and fully customizable relaxation sanctuary. By synthesizing ambient loops directly on your GPU/CPU via the standard Web Audio API, Daywa operates completely client-side.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    You can mix the cozy rain storms, real physical crackling campfire, celestial drone oscillators, or standard 6Hz stereoscopic Binaural beats in real-time, matching and blending them over any imported musical loops or audio files of your own selection.
                  </p>

                  <div className="mt-4 flex flex-col gap-2 font-mono text-[10px]">
                    <span className="text-slate-400 uppercase tracking-wider block">Core Specifications</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded bg-white/5 border border-white/5">
                        <span className="text-slate-400 block">WEB SYNTH INJECT</span>
                        <span className={`font-semibold mt-0.5 block ${pinkMode ? 'text-pink-300' : 'text-slate-200'}`}>Standard HTML5 Web Audio</span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/5">
                        <span className="text-slate-400 block">BASE HOST MAPPING</span>
                        <span className={`font-semibold mt-0.5 block ${pinkMode ? 'text-pink-300' : 'text-slate-200'}`}>GitHub Pages Custom Base</span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/5">
                        <span className="text-slate-400 block">MEMORY SAFETY PROTECT</span>
                        <span className={`font-semibold mt-0.5 block ${pinkMode ? 'text-pink-300' : 'text-slate-200'}`}>Object URL Revocation</span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/5">
                        <span className="text-slate-400 block">THEME SELECTIONS</span>
                        <span className={`font-semibold mt-0.5 block ${pinkMode ? 'text-pink-300' : 'text-slate-200'}`}>Slate / Neo-Pink Mode</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center font-mono text-[9px] text-slate-400 mt-6 pt-4 border-t border-white/5">
                  Designed & Synthesized elegantly inside Daywa Labs under manual GitHub source structures.
                </div>
              </div>
            )}

          </div>

        </section>

        {/* RIGHT COLUMN: ACTIVE QUEUE & METRICS (3 COLS) */}
        <section className="lg:col-span-3 flex flex-col gap-5 h-full overflow-y-auto" id="right-rail">
          
          {/* Active Player Deck Cover Art View */}
          {currentTrack ? (
            <div className={`p-4 rounded-2xl border transition-colors flex flex-col gap-4 relative overflow-hidden ${pinkMode ? 'bg-[#291724]/40 border-pink-900/20' : 'bg-zinc-950/40 border-white/5'}`} id="active-track-deck">
              
              {/* Dynamic Abstract gradient visual matching track card */}
              <div className={`aspect-square rounded-xl bg-gradient-to-tr ${currentTrack.gradient} flex items-center justify-center shadow-inner relative overflow-hidden group border border-white/5`}>
                
                {/* Visual pulsating sound guide bars */}
                {isPlaying && (
                  <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-1 h-8 z-10 pointer-events-none">
                    <span className="w-1 h-3 bg-white/60 block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-3 bg-white/80 block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 h-3 bg-white/60 block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.5s' }} />
                    <span className="w-1.5 h-3 bg-white/85 block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-3 bg-white/60 block rounded-sm animate-wave-bar origin-bottom" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}

                <span className="text-4xl font-black font-mono tracking-widest text-white/20 select-none group-hover:scale-105 transition-transform duration-500">
                  {currentTrack.name[0]?.toUpperCase()}{currentTrack.name[1]?.toUpperCase() || ''}
                </span>
                
                {/* Visual layout border mask */}
                <div className="absolute inset-0 bg-neutral-950/15 pointer-events-none" />
              </div>

              {/* Title & Artist details */}
              <div className="flex flex-col">
                <h4 className="text-sm font-bold tracking-tight truncate">{currentTrack.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{currentTrack.artist}</p>
              </div>

              {/* Playback rate multiplier speed shift */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5 font-mono text-[10px]">
                <span className="text-slate-400 uppercase tracking-wider">Play Tempo Shift</span>
                <div className="grid grid-cols-5 gap-1" id="speed-shift-group">
                  {[0.5, 0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={`py-1 rounded text-center font-mono cursor-pointer transition-all duration-200 ${
                        playbackRate === rate
                          ? (pinkMode ? 'bg-pink-500 text-[#150a12] font-semibold' : 'bg-white text-black font-semibold')
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center transition-colors h-48 ${pinkMode ? 'bg-[#291724]/40 border-pink-900/20' : 'bg-zinc-950/40 border-white/5'}`} id="active-track-deck-empty">
              <FileAudio size={28} className="text-slate-500 mb-2" />
              <h4 className="text-xs font-semibold">Silence is Golden</h4>
              <p className="text-[10px] text-slate-400 mt-1">Import some audio file or trigger Synthesis space preset drone layers.</p>
            </div>
          )}

          {/* Quick instructions widget */}
          <div className={`p-5 rounded-2xl border transition-colors flex flex-col gap-3 font-sans ${pinkMode ? 'bg-[#291724]/30 border-pink-900/15' : 'bg-zinc-950/30 border-white/5'}`} id="instructions-deck">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono">SANCTUARY CONTROL</h4>
            <ul className="text-[11px] text-slate-300 flex flex-col gap-2 list-none">
              <li className="flex items-start gap-1.5">
                <span className={pinkMode ? 'text-pink-400' : 'text-blue-400'}>•</span>
                Mix procedural generators with ambient audio tracks.
              </li>
              <li className="flex items-start gap-1.5">
                <span className={pinkMode ? 'text-pink-400' : 'text-blue-400'}>•</span>
                Toggle "Pink Mode" in the header for vibrant neon aesthetics.
              </li>
              <li className="flex items-start gap-1.5">
                <span className={pinkMode ? 'text-pink-400' : 'text-blue-400'}>•</span>
                Clean Object URL allocations avoid state leakages and crashes.
              </li>
            </ul>
          </div>

        </section>

      </main>

      {/* BOTTOM FLOATING PLAYBACK MAIN BAR */}
      <footer className="border-t border-white/5 sound-card-blur py-4 px-6 relative z-20 mt-auto" id="bottom-bar">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* TRACK PROGRESS BAR TIMELINE */}
          <div className="w-full md:w-1/3 flex items-center gap-3 font-mono text-[10px]" id="scrubber-timeline">
            <span className="text-slate-400 w-8 text-right">{formatTimeStr(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleTimelineChange(parseFloat(e.target.value))}
              className={`flex-1 h-1 rounded-lg appearance-none bg-white/10 outline-none cursor-pointer transition-all duration-200 ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
            />
            <span className="text-slate-400 w-8 text-left">{formatTimeStr(duration)}</span>
          </div>

          {/* CORE PLAYBACK MEDIA BUTTONS */}
          <div className="flex items-center gap-4.5" id="playback-buttons-dock">
            
            {/* Shuffle Button */}
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-xl transition-all duration-200 ${isShuffle ? (pinkMode ? 'text-pink-300 bg-pink-500/10' : 'text-indigo-400 bg-white/5') : 'text-slate-400 hover:text-white hover:bg-white/5'} cursor-pointer`}
              title="Shuffle queue"
            >
              <Shuffle size={16} />
            </button>

            {/* Skip Back */}
            <button
              onClick={handlePrevTrack}
              disabled={tracks.length <= 1}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200 disabled:opacity-30 cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={18} />
            </button>

            {/* Play/Pause Main */}
            <button
              id="main-play-pause-btn"
              onClick={togglePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                pinkMode
                  ? 'bg-pink-500 text-[#150a12] shadow-[0_4px_16px_rgba(236,72,153,0.4)] hover:shadow-[0_0_24px_rgba(236,72,153,0.65)]'
                  : 'bg-white text-black hover:bg-neutral-100 shadow'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
            </button>

            {/* Skip Forward */}
            <button
              onClick={handleNextTrack}
              disabled={tracks.length <= 1}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200 disabled:opacity-30 cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={18} />
            </button>

            {/* Loop Track Button */}
            <button
              onClick={() => setIsLoopTrack(!isLoopTrack)}
              className={`p-2 rounded-xl transition-all duration-200 ${isLoopTrack ? (pinkMode ? 'text-pink-300 bg-pink-500/10' : 'text-indigo-400 bg-white/5') : 'text-slate-400 hover:text-white hover:bg-white/5'} cursor-pointer`}
              title="Loop Single Track"
            >
              <RotateCcw size={16} />
            </button>

          </div>

          {/* MASTER HARDWARE VOLUME CONTROL */}
          <div className="w-full md:w-1/3 flex items-center justify-end gap-3 font-mono text-[10px]" id="volume-fader">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={15} />
              ) : volume < 0.4 ? (
                <Volume1 size={15} />
              ) : (
                <Volume2 size={15} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.01"
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className={`w-28 h-1 rounded-lg appearance-none bg-white/10 outline-none cursor-pointer transition-all duration-200 hover:bg-white/15 ${pinkMode ? 'accent-pink-500' : 'accent-indigo-400'}`}
            />
          </div>

        </div>
      </footer>

    </div>
  );
}
