import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palmtree, 
  MapPin, 
  ExternalLink, 
  Star, 
  Heart, 
  Camera, 
  Coffee, 
  Mountain, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  BedDouble, 
  Utensils, 
  Briefcase, 
  Check, 
  Sun, 
  ChevronRight, 
  ChevronDown,
  Car, 
  Plane,
  Compass
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { 
  HoneymoonDestination, 
  HoneymoonHotel, 
  HoneymoonSpot, 
  HoneymoonSpotCategory, 
  HoneymoonItineraryDay, 
  PackingItem 
} from '../types';
import { 
  INITIAL_DESTINATIONS, 
  INITIAL_HOTELS, 
  INITIAL_SPOTS, 
  INITIAL_ITINERARY, 
  INITIAL_PACKING_LIST 
} from '../data/honeymoonData';

const STORAGE_KEY = 'fn_honeymoon_storage_v1';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 24,
    },
  },
};

const tabPanelVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 290,
      damping: 26,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.16 },
  },
};

const Honeymoon: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  // State Data
  const [destinations, setDestinations] = useState<HoneymoonDestination[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_destinations`);
      return saved ? JSON.parse(saved) : INITIAL_DESTINATIONS;
    } catch {
      return INITIAL_DESTINATIONS;
    }
  });

  const [selectedDestId, setSelectedDestId] = useState<string>(() => {
    return 'bali';
  });

  const [hotels, setHotels] = useState<HoneymoonHotel[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_hotels`);
      return saved ? JSON.parse(saved) : INITIAL_HOTELS;
    } catch {
      return INITIAL_HOTELS;
    }
  });

  const [spots, setSpots] = useState<HoneymoonSpot[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_spots`);
      return saved ? JSON.parse(saved) : INITIAL_SPOTS;
    } catch {
      return INITIAL_SPOTS;
    }
  });

  const [itinerary, setItinerary] = useState<HoneymoonItineraryDay[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_itinerary`);
      return saved ? JSON.parse(saved) : INITIAL_ITINERARY;
    } catch {
      return INITIAL_ITINERARY;
    }
  });

  const [packingList, setPackingList] = useState<PackingItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_packing`);
      return saved ? JSON.parse(saved) : INITIAL_PACKING_LIST;
    } catch {
      return INITIAL_PACKING_LIST;
    }
  });

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'hotels' | 'spots' | 'itinerary' | 'budget' | 'packing'>('hotels');
  const [spotCategoryFilter, setSpotCategoryFilter] = useState<'all' | HoneymoonSpotCategory>('all');
  const [packingCategoryFilter, setPackingCategoryFilter] = useState<'all' | 'dokumen' | 'outfit' | 'elektronik' | 'kesehatan'>('all');
  const [packingPersonFilter, setPackingPersonFilter] = useState<'all' | 'Fikri' | 'Nadya' | 'Bersama'>('all');

  // Lightweight UI-only States
  const [expandedAmenities, setExpandedAmenities] = useState<Record<string, boolean>>({});
  const [selectedItineraryDay, setSelectedItineraryDay] = useState<'all' | number>('all');

  // Modal States
  const [isAddHotelModalOpen, setIsAddHotelModalOpen] = useState(false);
  const [isAddSpotModalOpen, setIsAddSpotModalOpen] = useState(false);
  const [isAddPackingModalOpen, setIsAddPackingModalOpen] = useState(false);

  // Form States for Adding Hotel
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelLocation, setNewHotelLocation] = useState('');
  const [newHotelGmaps, setNewHotelGmaps] = useState('');
  const [newHotelPricePerNight, setNewHotelPricePerNight] = useState<number>(3500000);
  const [newHotelNights, setNewHotelNights] = useState<number>(2);
  const [newHotelRoomType, setNewHotelRoomType] = useState('Private Pool Villa');
  const [newHotelAmenitiesInput, setNewHotelAmenitiesInput] = useState('Private Pool, Floating Breakfast, Bathtub Bunga, King Bed, Butler 24 Jam');
  const [newHotelImageUrl, setNewHotelImageUrl] = useState('');
  const [newHotelRating, setNewHotelRating] = useState<number>(4.9);
  const [newHotelNotes, setNewHotelNotes] = useState('');

  // Form States for Adding Spot
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotCategory, setNewSpotCategory] = useState<HoneymoonSpotCategory>('photo_spot');
  const [newSpotLocation, setNewSpotLocation] = useState('');
  const [newSpotGmaps, setNewSpotGmaps] = useState('');
  const [newSpotCost, setNewSpotCost] = useState<number>(200000);
  const [newSpotCostNote, setNewSpotCostNote] = useState('Tiket masuk & sewa spot foto');
  const [newSpotDesc, setNewSpotDesc] = useState('');
  const [newSpotImageUrl, setNewSpotImageUrl] = useState('');
  const [newSpotTips, setNewSpotTips] = useState('');

  // Form States for Adding Packing
  const [newPackingName, setNewPackingName] = useState('');
  const [newPackingCategory, setNewPackingCategory] = useState<'dokumen' | 'outfit' | 'elektronik' | 'kesehatan' | 'lainnya'>('outfit');
  const [newPackingPerson, setNewPackingPerson] = useState<'Fikri' | 'Nadya' | 'Bersama'>('Bersama');

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_hotels`, JSON.stringify(hotels));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [hotels]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_spots`, JSON.stringify(spots));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [spots]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_packing`, JSON.stringify(packingList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [packingList]);

  // Active Destination Object
  const currentDestination = destinations.find(d => d.id === selectedDestId) || destinations[0];

  // Helper format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Handlers for Hotels
  const handleToggleHotelStatus = (hotelId: string) => {
    setHotels(prev => prev.map(h => {
      if (h.id === hotelId) {
        const nextStatus = h.status === 'recommended' ? 'booked' : h.status === 'booked' ? 'wishlist' : 'recommended';
        toast.success(`Status ${h.name} diubah menjadi "${nextStatus.toUpperCase()}"`);
        return { ...h, status: nextStatus };
      }
      return h;
    }));
  };

  const handleDeleteHotel = (hotelId: string) => {
    if (window.confirm('Hapus penginapan ini dari daftar honeymoon?')) {
      setHotels(prev => prev.filter(h => h.id !== hotelId));
      toast.success('Penginapan berhasil dihapus');
    }
  };

  const handleCreateHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim()) {
      toast.error('Mohon isi nama penginapan / hotel');
      return;
    }

    const amenitiesArray = newHotelAmenitiesInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const newEntry: HoneymoonHotel = {
      id: `hotel-${Date.now()}`,
      name: newHotelName.trim(),
      destination: currentDestination.name,
      location: newHotelLocation.trim() || `${currentDestination.name}`,
      gmaps_link: newHotelGmaps.trim() || `https://maps.google.com/?q=${encodeURIComponent(newHotelName)}`,
      price_per_night: Number(newHotelPricePerNight) || 0,
      nights_count: Number(newHotelNights) || 1,
      total_price: (Number(newHotelPricePerNight) || 0) * (Number(newHotelNights) || 1),
      room_type: newHotelRoomType.trim() || 'Private Villa',
      amenities: amenitiesArray.length > 0 ? amenitiesArray : ['Private Pool', 'Floating Breakfast', 'King Size Bed'],
      image_url: newHotelImageUrl.trim() || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      rating: Number(newHotelRating) || 4.9,
      status: 'recommended',
      romantic_notes: newHotelNotes.trim()
    };

    setHotels(prev => [newEntry, ...prev]);
    toast.success(`Hotel "${newHotelName}" berhasil ditambahkan ke agenda!`);
    setIsAddHotelModalOpen(false);
    setNewHotelName('');
    setNewHotelLocation('');
    setNewHotelGmaps('');
    setNewHotelNotes('');
  };

  // Handlers for Spots
  const handleToggleFavoriteSpot = (spotId: string) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        const next = !s.is_favorite;
        toast.success(next ? 'Disimpan ke favorit berdua ❤️' : 'Dihapus dari favorit');
        return { ...s, is_favorite: next };
      }
      return s;
    }));
  };

  const handleToggleVisitedSpot = (spotId: string) => {
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        const next = !s.is_visited;
        toast.success(next ? 'Ditandai sudah dikunjungi! 🎉' : 'Ditandai belum dikunjungi');
        return { ...s, is_visited: next };
      }
      return s;
    }));
  };

  const handleDeleteSpot = (spotId: string) => {
    if (window.confirm('Hapus destinasi ini dari daftar?')) {
      setSpots(prev => prev.filter(s => s.id !== spotId));
      toast.success('Destinasi berhasil dihapus');
    }
  };

  const handleCreateSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpotName.trim()) {
      toast.error('Mohon isi nama tempat / destinasi');
      return;
    }

    const defaultImages: Record<HoneymoonSpotCategory, string> = {
      photo_spot: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=800&q=80',
      nature: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
      cafe_culinary: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      unique_place: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'
    };

    const newSpotEntry: HoneymoonSpot = {
      id: `spot-${Date.now()}`,
      name: newSpotName.trim(),
      category: newSpotCategory,
      destination: currentDestination.name,
      location: newSpotLocation.trim() || currentDestination.name,
      gmaps_link: newSpotGmaps.trim() || `https://maps.google.com/?q=${encodeURIComponent(newSpotName)}`,
      estimated_cost: Number(newSpotCost) || 0,
      cost_note: newSpotCostNote.trim(),
      description: newSpotDesc.trim() || 'Destinasi romantis istimewa untuk dinikmati berdua.',
      image_url: newSpotImageUrl.trim() || defaultImages[newSpotCategory],
      romantic_tips: newSpotTips.trim() || 'Ambil foto romantis bersama dan nikmati momen berdua.',
      is_favorite: true,
      is_visited: false
    };

    setSpots(prev => [newSpotEntry, ...prev]);
    toast.success(`Destinasi "${newSpotName}" berhasil ditambahkan!`);
    setIsAddSpotModalOpen(false);
    setNewSpotName('');
    setNewSpotLocation('');
    setNewSpotGmaps('');
    setNewSpotDesc('');
    setNewSpotTips('');
  };

  // Handlers for Packing List
  const handleTogglePacking = (itemId: string) => {
    setPackingList(prev => prev.map(p => {
      if (p.id === itemId) {
        return { ...p, is_packed: !p.is_packed };
      }
      return p;
    }));
  };

  const handleDeletePackingItem = (itemId: string) => {
    setPackingList(prev => prev.filter(p => p.id !== itemId));
  };

  const handleCreatePacking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackingName.trim()) {
      toast.error('Mohon isi nama barang bawaan');
      return;
    }

    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      name: newPackingName.trim(),
      category: newPackingCategory,
      for_person: newPackingPerson,
      is_packed: false
    };

    setPackingList(prev => [...prev, newItem]);
    toast.success('Barang berhasil ditambahkan ke checklist!');
    setIsAddPackingModalOpen(false);
    setNewPackingName('');
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan seluruh agenda, hotel, destinasi, dan checklist ke rekomendasi kurasi awal?')) {
      setDestinations(INITIAL_DESTINATIONS);
      setHotels(INITIAL_HOTELS);
      setSpots(INITIAL_SPOTS);
      setItinerary(INITIAL_ITINERARY);
      setPackingList(INITIAL_PACKING_LIST);
      localStorage.removeItem(`${STORAGE_KEY}_destinations`);
      localStorage.removeItem(`${STORAGE_KEY}_hotels`);
      localStorage.removeItem(`${STORAGE_KEY}_spots`);
      localStorage.removeItem(`${STORAGE_KEY}_itinerary`);
      localStorage.removeItem(`${STORAGE_KEY}_packing`);
      toast.success('Agenda honeymoon berhasil direset ke kurasi awal!');
    }
  };

  // Calculations for Summary & Budgeting
  const totalHotelCost = hotels
    .filter(h => h.status === 'recommended' || h.status === 'booked')
    .reduce((acc, curr) => acc + (curr.total_price || curr.price_per_night * curr.nights_count), 0);

  const totalSpotsCost = spots
    .filter(s => s.is_favorite)
    .reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

  const estimatedFlightCost = 4800000;
  const estimatedDiningCost = 3500000;
  const estimatedSouvenirEmergency = 2000000;

  const grandTotalBudget = totalHotelCost + totalSpotsCost + estimatedFlightCost + estimatedDiningCost + estimatedSouvenirEmergency;

  const packedCount = packingList.filter(p => p.is_packed).length;
  const packedPercentage = packingList.length > 0 ? Math.round((packedCount / packingList.length) * 100) : 0;

  // Filtered Spots
  const filteredSpots = spots.filter(s => {
    if (spotCategoryFilter === 'all') return true;
    return s.category === spotCategoryFilter;
  });

  // Filtered Itinerary
  const filteredItinerary = selectedItineraryDay === 'all'
    ? itinerary
    : itinerary.filter(d => d.day_number === selectedItineraryDay);

  // Filtered Packing List
  const filteredPacking = packingList.filter(p => {
    if (packingCategoryFilter !== 'all' && p.category !== packingCategoryFilter) return false;
    if (packingPersonFilter !== 'all' && p.for_person !== packingPersonFilter) return false;
    return true;
  });

  const navTabs: {
    id: 'hotels' | 'spots' | 'itinerary' | 'budget' | 'packing';
    label: string;
    icon: React.ElementType;
    count?: number | string;
  }[] = [
    { id: 'hotels', label: 'Penginapan & Villa', icon: BedDouble, count: hotels.length },
    { id: 'spots', label: 'Destinasi & Cafe', icon: Camera, count: spots.length },
    { id: 'itinerary', label: 'Rencana Itinerary', icon: Calendar, count: `${itinerary.length}H` },
    { id: 'budget', label: 'Estimasi Biaya', icon: DollarSign },
    { id: 'packing', label: 'Checklist Bawaan', icon: Briefcase, count: `${packedCount}/${packingList.length}` },
  ];

  const budgetRows = [
    {
      title: 'Akomodasi & Villa Mewah',
      subtitle: 'Koleksi villa privat dengan private pool & sarapan',
      amount: totalHotelCost,
      icon: BedDouble,
      badgeBg: 'bg-amber-100 text-maroon border border-gold-300/60',
      barColor: 'from-maroon to-amber-600',
    },
    {
      title: 'Tiket Pesawat & Transportasi Lokal',
      subtitle: 'Tiket PP 2 orang + sewa mobil private driver',
      amount: estimatedFlightCost,
      icon: Plane,
      badgeBg: 'bg-blue-50 text-blue-700 border border-blue-200/70',
      barColor: 'from-blue-500 to-sky-400',
    },
    {
      title: 'Wisata Kuliner, Cafe & Romantic Dinner',
      subtitle: 'Candlelight dinner, beach club & brunch estetik',
      amount: estimatedDiningCost,
      icon: Utensils,
      badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200/70',
      barColor: 'from-amber-500 to-orange-400',
    },
    {
      title: 'Tiket Destinasi, Spot Foto & Couple Spa',
      subtitle: 'Ayunan Tegalalang, ritual spa bunga & tiket wisata',
      amount: totalSpotsCost,
      icon: Camera,
      badgeBg: 'bg-purple-50 text-purple-700 border border-purple-200/70',
      barColor: 'from-purple-500 to-fuchsia-400',
    },
    {
      title: 'Belanja Oleh-Oleh & Dana Darurat',
      subtitle: 'Souvenir khas untuk keluarga & cadangan tak terduga',
      amount: estimatedSouvenirEmergency,
      icon: Briefcase,
      badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
      barColor: 'from-emerald-500 to-teal-400',
    },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-7 pb-16 font-sans selection:bg-maroon selection:text-gold"
    >
      {/* 1. HEADER SECTION */}
      <motion.div
        variants={fadeUpVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold-200/70 pb-6"
      >
        <div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gold-50 border border-gold-300/80 text-maroon text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5 shadow-2xs cursor-default"
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex text-amber-700"
            >
              <Palmtree size={13} />
            </motion.span>
            <span>Romantic Honeymoon Concierge</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-serif font-bold text-maroon tracking-tight leading-tight">
            Agenda Honeymoon{' '}
            <span className="text-gold-600 italic font-semibold">Fikri &amp; Nadya</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Kurasi perjalanan cinta berdua: Destinasi impian, private villa mewah, spot foto estetik, kuliner romantis, dan checklist perlengkapan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            onClick={() => {
              if (activeTab === 'hotels') setIsAddHotelModalOpen(true);
              else if (activeTab === 'spots') setIsAddSpotModalOpen(true);
              else if (activeTab === 'packing') setIsAddPackingModalOpen(true);
              else setIsAddSpotModalOpen(true);
            }}
            className="relative overflow-hidden px-5 py-3 rounded-2xl bg-gradient-to-r from-[#800000] via-[#6d0505] to-[#800000] text-gold font-bold text-xs uppercase tracking-wider shadow-lg shadow-maroon/20 flex items-center space-x-2 border border-gold/40 cursor-pointer group"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            <Plus size={15} className="relative z-10" />
            <span className="relative z-10">Tambah Item Baru</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ rotate: -180, scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={handleResetToDefault}
            className="p-3 rounded-2xl bg-white hover:bg-gold-50 text-stone-500 hover:text-maroon border border-gold-200/90 transition-colors shadow-sm cursor-pointer"
            title="Reset ke Rekomendasi Kurasi Awal"
          >
            <RotateCcw size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* 2. CINEMATIC DESTINATION HERO SHOWCASE */}
      <motion.div
        variants={fadeUpVariants}
        className="relative rounded-[2.25rem] overflow-hidden shadow-[0_24px_60px_-15px_rgba(76,2,2,0.28)] border border-gold-300/80 min-h-[370px] sm:min-h-[410px] flex flex-col justify-between bg-[#1a0306]"
      >
        {/* Crossfading & Gently Zooming Hero Background Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDestination.id}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={currentDestination.hero_image}
              alt={currentDestination.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Editorial Multi-Stop Dark Velvet Gradient & Inner Gold Hairline */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0306]/95 via-[#1a0306]/45 to-black/35 pointer-events-none" />
        <div className="absolute inset-2.5 sm:inset-3.5 rounded-[1.75rem] border border-gold/20 pointer-events-none" />

        {/* Top Bar inside Hero: Badge + Destination Switcher */}
        <div className="relative z-10 p-5 sm:p-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-300 via-gold to-amber-400 text-[#4c0202] font-extrabold text-[10px] uppercase tracking-[0.18em] shadow-md flex items-center space-x-1.5">
              <Star size={11} className="fill-[#4c0202]" />
              <span>Destinasi Terpilih</span>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-amber-100 text-[11px] font-medium flex items-center space-x-1.5">
              <Compass size={12} className="text-gold" />
              <span>{currentDestination.country} • {currentDestination.duration_days} Hari Rekomendasi</span>
            </span>
          </div>

          {/* Frosted Glass Destination Switcher with Motion layoutId */}
          <div className="flex items-center gap-1 bg-black/45 backdrop-blur-xl p-1.5 rounded-2xl border border-white/20 shadow-lg">
            {destinations.map(d => {
              const isSelected = selectedDestId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDestId(d.id)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 ${
                    isSelected ? 'text-gold' : 'text-stone-200 hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="honeymoonDestPill"
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-maroon to-[#5a070f] border border-gold/60 shadow-md -z-10"
                    />
                  )}
                  <span>{d.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Editorial Content */}
        <div className="relative z-10 p-6 sm:p-9 text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDestination.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="space-y-3"
            >
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-md">
                  {currentDestination.name}
                </h2>
                <p className="text-xs sm:text-sm text-amber-200/95 font-serif italic mt-1">
                  {currentDestination.tagline}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-stone-200/90 max-w-3xl leading-relaxed">
                {currentDestination.description}
              </p>

              {/* Metadata & Curated Highlights Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-[11px] text-amber-200 font-medium">
                  <Sun size={13} className="text-amber-300" />
                  <span>Musim Terbaik: <strong className="text-white">{currentDestination.best_season}</strong></span>
                </span>
                <span className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-[11px] text-amber-200 font-medium">
                  <Heart size={13} className="text-rose-400 fill-rose-400" />
                  <span>Vibe: <strong className="text-white">Romantis &amp; Privat</strong></span>
                </span>
              </div>

              {currentDestination.highlights?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentDestination.highlights.slice(0, 4).map((hl, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-gold/25 text-[10px] text-amber-100/90 font-medium backdrop-blur-sm"
                    >
                      <Sparkles size={10} className="text-gold shrink-0" />
                      <span>{hl}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 3. INTERACTIVE 4-CARD CONCIERGE KPI STRIP */}
      <motion.div
        variants={fadeUpVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
      >
        {/* KPI 1: Villa */}
        <motion.button
          type="button"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          onClick={() => setActiveTab('hotels')}
          className={`text-left bg-white p-4 sm:p-5 rounded-2xl border shadow-sm hover:shadow-md transition-colors flex items-center space-x-3.5 cursor-pointer ${
            activeTab === 'hotels' ? 'border-maroon/40 ring-2 ring-gold/30 bg-gold-50/30' : 'border-gold-200/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-maroon flex items-center justify-center shrink-0 border border-gold-300/70">
            <BedDouble size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Penginapan Villa</span>
            <span className="font-serif text-lg font-bold text-maroon leading-tight block truncate">
              {hotels.length} Pilihan Mewah
            </span>
            <span className="text-[10px] text-stone-500 font-medium tabular-nums">
              Est. {formatRupiah(totalHotelCost)}
            </span>
          </div>
        </motion.button>

        {/* KPI 2: Spots */}
        <motion.button
          type="button"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          onClick={() => setActiveTab('spots')}
          className={`text-left bg-white p-4 sm:p-5 rounded-2xl border shadow-sm hover:shadow-md transition-colors flex items-center space-x-3.5 cursor-pointer ${
            activeTab === 'spots' ? 'border-maroon/40 ring-2 ring-gold/30 bg-gold-50/30' : 'border-gold-200/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/80">
            <Camera size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Destinasi &amp; Spot</span>
            <span className="font-serif text-lg font-bold text-purple-950 leading-tight block truncate">
              {spots.length} Tempat Romantis
            </span>
            <span className="text-[10px] text-purple-700 font-medium">
              {spots.filter(s => s.is_favorite).length} Disukai Berdua
            </span>
          </div>
        </motion.button>

        {/* KPI 3: Itinerary */}
        <motion.button
          type="button"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          onClick={() => setActiveTab('itinerary')}
          className={`text-left bg-white p-4 sm:p-5 rounded-2xl border shadow-sm hover:shadow-md transition-colors flex items-center space-x-3.5 cursor-pointer ${
            activeTab === 'itinerary' ? 'border-maroon/40 ring-2 ring-gold/30 bg-gold-50/30' : 'border-gold-200/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80">
            <Calendar size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Itinerary Harian</span>
            <span className="font-serif text-lg font-bold text-emerald-950 leading-tight block truncate">
              {itinerary.length} Hari Perjalanan
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              Rute Terjadwal Rapi
            </span>
          </div>
        </motion.button>

        {/* KPI 4: Packing */}
        <motion.button
          type="button"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          onClick={() => setActiveTab('packing')}
          className={`text-left bg-white p-4 sm:p-5 rounded-2xl border shadow-sm hover:shadow-md transition-colors flex items-center space-x-3.5 cursor-pointer ${
            activeTab === 'packing' ? 'border-maroon/40 ring-2 ring-gold/30 bg-gold-50/30' : 'border-gold-200/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/80">
            <Briefcase size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider truncate">Checklist Bawaan</span>
              <span className="text-[10px] font-mono font-bold text-rose-800 ml-1">{packedPercentage}%</span>
            </div>
            <span className="font-serif text-lg font-bold text-rose-950 leading-tight block truncate tabular-nums">
              {packedCount} / {packingList.length} Siap
            </span>
            <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1.5 overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${packedPercentage}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                className="h-full bg-gradient-to-r from-rose-500 to-maroon rounded-full"
              />
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* 4. FLOATING 5-TAB CONCIERGE NAVIGATION BAR */}
      <motion.div
        variants={fadeUpVariants}
        className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-gold-200/80 shadow-sm"
      >
        {navTabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer z-10 ${
                isActive ? 'text-gold' : 'text-stone-600 hover:text-maroon'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="honeymoonActiveTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-maroon via-[#7a0c17] to-maroon shadow-md ring-1 ring-gold/40 -z-10"
                />
              )}
              <Icon size={15} />
              <span>{idx + 1}. {tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/15 text-amber-200'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* 5. ANIMATED TAB VIEWPORT */}
      <AnimatePresence mode="wait">
        {/* ======================================================== */}
        {/* VIEW 1: HOTEL & PENGINAPAN MEWAH (LUXURY RESORT LOOKBOOK) */}
        {/* ======================================================== */}
        {activeTab === 'hotels' && (
          <motion.div
            key="tab-hotels"
            variants={tabPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl font-bold text-maroon">
                  Daftar Rekomendasi Hotel &amp; Villa Romantis
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Penginapan privat pilihan dengan fasilitas floating breakfast, kolam renang pribadi, dan kamar mandi bertabur kelopak bunga.
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsAddHotelModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gold-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Tambah Villa / Hotel Impian</span>
              </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hotels.map((hotel, idx) => {
                const isExpanded = !!expandedAmenities[hotel.id];
                const visibleAmenities = isExpanded ? hotel.amenities : hotel.amenities.slice(0, 4);
                const hiddenCount = Math.max(0, hotel.amenities.length - 4);

                return (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.06, 0.25), type: 'spring', stiffness: 280, damping: 24 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[2rem] overflow-hidden border border-gold-200/90 shadow-lg hover:shadow-2xl hover:shadow-maroon/10 flex flex-col justify-between transition-shadow duration-300 group"
                  >
                    {/* Tall Lookbook Photo */}
                    <div className="relative h-72 w-full overflow-hidden">
                      <img
                        src={hotel.image_url}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0306]/90 via-black/20 to-black/35" />

                      {/* Status & Rating Badges */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleToggleHotelStatus(hotel.id)}
                          className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center space-x-1 ${
                            hotel.status === 'booked'
                              ? 'bg-emerald-600 text-white border border-emerald-300'
                              : hotel.status === 'recommended'
                              ? 'bg-gradient-to-r from-amber-300 to-gold text-maroon border border-amber-500 font-black'
                              : 'bg-white/90 text-stone-700 backdrop-blur-sm border border-stone-200'
                          }`}
                          title="Klik untuk ubah status"
                        >
                          <span>
                            {hotel.status === 'booked'
                              ? '✓ Sudah Dibooking'
                              : hotel.status === 'recommended'
                              ? '★ Pilihan Utama'
                              : 'Wishlist'}
                          </span>
                        </motion.button>

                        <span className="px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-gold text-[10px] font-bold border border-gold/40 flex items-center space-x-1">
                          <Star size={11} className="text-gold fill-gold" />
                          <span>{hotel.rating}</span>
                        </span>
                      </div>

                      {/* Delete Button */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteHotel(hotel.id)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/45 hover:bg-rose-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                        title="Hapus Hotel"
                      >
                        <Trash2 size={14} />
                      </motion.button>

                      {/* Title & Room Type Overlay */}
                      <div className="absolute bottom-4 inset-x-5 text-white">
                        <h4 className="font-serif text-xl sm:text-2xl font-bold leading-tight drop-shadow-sm">
                          {hotel.name}
                        </h4>
                        <p className="text-xs text-amber-200/95 font-medium mt-1">
                          {hotel.room_type}
                        </p>
                      </div>
                    </div>

                    {/* Hotel Details Body */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Location & Maps Pill */}
                        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3.5">
                          <div className="flex items-start space-x-2 text-xs text-stone-600">
                            <MapPin size={15} className="text-maroon shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">{hotel.location}</span>
                          </div>

                          <a
                            href={hotel.gmaps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-gold-100 text-stone-800 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition-colors"
                          >
                            <span>Maps</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        {/* Split Ivory-Gold Rate Strip */}
                        <div className="bg-gradient-to-r from-[#faf5eb] to-amber-50/70 p-4 rounded-2xl border border-gold-200/90 grid grid-cols-2 divide-x divide-gold-200/80">
                          <div className="pr-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                              Harga / Malam
                            </span>
                            <span className="font-serif text-lg font-bold text-maroon tabular-nums">
                              {formatRupiah(hotel.price_per_night)}
                            </span>
                          </div>

                          <div className="pl-4 text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                              Total ({hotel.nights_count} Malam)
                            </span>
                            <span className="font-serif text-lg font-bold text-amber-950 tabular-nums">
                              {formatRupiah(hotel.total_price || hotel.price_per_night * hotel.nights_count)}
                            </span>
                          </div>
                        </div>

                        {/* Amenities with Clean Expandable Toggle */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center space-x-1">
                            <Sparkles size={12} className="text-amber-600" />
                            <span>Fasilitas &amp; Isi Hotel Spesial:</span>
                          </span>

                          <div className="flex flex-wrap gap-1.5">
                            {visibleAmenities.map((item, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-2.5 py-1 rounded-lg bg-stone-50 text-stone-700 border border-stone-200/90 text-[11px] font-medium flex items-center space-x-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-maroon/70 shrink-0" />
                                <span>{item}</span>
                              </span>
                            ))}
                          </div>

                          {hiddenCount > 0 && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() =>
                                setExpandedAmenities(prev => ({
                                  ...prev,
                                  [hotel.id]: !prev[hotel.id],
                                }))
                              }
                              className="inline-flex items-center space-x-1 text-[11px] font-bold text-maroon hover:text-gold-700 transition-colors pt-0.5 cursor-pointer"
                            >
                              <span>
                                {isExpanded ? 'Tampilkan ringkas' : `+${hiddenCount} fasilitas lainnya`}
                              </span>
                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="inline-flex"
                              >
                                <ChevronDown size={13} />
                              </motion.span>
                            </motion.button>
                          )}
                        </div>

                        {/* Editorial Romantic Note Blockquote */}
                        {hotel.romantic_notes && (
                          <div className="pl-3.5 pr-3 py-2.5 rounded-r-xl bg-[#faf7f2] border-l-2 border-gold text-xs text-stone-600 italic leading-relaxed">
                            &ldquo;{hotel.romantic_notes}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Footer Action Bar */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs text-stone-400">
                          Status:{' '}
                          <strong className="text-maroon uppercase font-bold tracking-wide">
                            {hotel.status}
                          </strong>
                        </span>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleToggleHotelStatus(hotel.id)}
                          className="px-4 py-2 rounded-xl bg-maroon hover:bg-maroon-700 text-gold text-xs font-bold transition-colors shadow-sm cursor-pointer"
                        >
                          {hotel.status === 'booked'
                            ? 'Tandai Selesai'
                            : hotel.status === 'recommended'
                            ? 'Ubah ke Booking'
                            : 'Pilih Ini'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: DESTINASI, SPOT FOTO, ALAM & CAFE */}
        {/* ======================================================== */}
        {activeTab === 'spots' && (
          <motion.div
            key="tab-spots"
            variants={tabPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            {/* Subheader */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-maroon">
                  Destinasi Wisata, Spot Foto &amp; Cafe Romantis
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Koleksi tempat terbaik untuk mengabadikan foto berdua, menikmati keajaiban alam, mencicipi kuliner estetik, dan petualangan berdua.
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsAddSpotModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gold-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Tambah Spot Baru</span>
              </motion.button>
            </div>

            {/* Category Filter Pills with Motion layoutId */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-gold-200/60 pb-3.5">
              {[
                { id: 'all', label: `🌟 Semua Destinasi (${spots.length})` },
                { id: 'photo_spot', label: `📸 Spot Foto Estetik (${spots.filter(s => s.category === 'photo_spot').length})` },
                { id: 'nature', label: `🌿 Wisata Alam (${spots.filter(s => s.category === 'nature').length})` },
                { id: 'cafe_culinary', label: `☕ Cafe & Kuliner (${spots.filter(s => s.category === 'cafe_culinary').length})` },
                { id: 'unique_place', label: `✨ Tempat Unik (${spots.filter(s => s.category === 'unique_place').length})` }
              ].map((f) => {
                const isSelected = spotCategoryFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSpotCategoryFilter(f.id as any)}
                    className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 ${
                      isSelected
                        ? 'text-gold'
                        : 'text-stone-600 hover:text-maroon bg-white border border-stone-200/80'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="honeymoonSpotFilterPill"
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="absolute inset-0 rounded-xl bg-maroon border border-gold/60 shadow-sm -z-10"
                      />
                    )}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Destination Spots Animated Grid */}
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredSpots.map((spot) => {
                  const categoryBadge = {
                    photo_spot: { label: 'Spot Foto Estetik', bg: 'bg-purple-600 text-white' },
                    nature: { label: 'Wisata Alam', bg: 'bg-emerald-600 text-white' },
                    cafe_culinary: { label: 'Cafe & Kuliner', bg: 'bg-amber-600 text-white' },
                    unique_place: { label: 'Tempat Unik', bg: 'bg-rose-600 text-white' }
                  }[spot.category];

                  return (
                    <motion.div
                      key={spot.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-[1.75rem] overflow-hidden border border-gold-200/85 shadow-md hover:shadow-xl hover:shadow-maroon/10 flex flex-col justify-between transition-shadow duration-300 group"
                    >
                      {/* Photo Container */}
                      <div className="relative h-56 w-full overflow-hidden">
                        <img
                          src={spot.image_url}
                          alt={spot.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0306]/90 via-transparent to-black/30" />

                        {/* Category & Visited Pills */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${categoryBadge.bg}`}>
                            {categoryBadge.label}
                          </span>
                          {spot.is_visited && (
                            <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm flex items-center space-x-1">
                              <Check size={10} className="stroke-[3]" />
                              <span>Dikunjungi</span>
                            </span>
                          )}
                        </div>

                        {/* Top Right Tactile Actions */}
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                            onClick={() => handleToggleFavoriteSpot(spot.id)}
                            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                              spot.is_favorite ? 'bg-rose-500 text-white shadow-md' : 'bg-black/45 text-stone-200 hover:bg-black/65'
                            }`}
                            title={spot.is_favorite ? 'Favorit berdua' : 'Tambah ke favorit'}
                          >
                            <Heart size={14} className={spot.is_favorite ? 'fill-white' : ''} />
                          </motion.button>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={() => handleDeleteSpot(spot.id)}
                            className="p-2 rounded-full bg-black/45 hover:bg-rose-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>

                        {/* Spot Name Overlay */}
                        <div className="absolute bottom-3.5 inset-x-4 text-white">
                          <h4 className="font-serif text-lg font-bold leading-tight drop-shadow-sm">
                            {spot.name}
                          </h4>
                          <p className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                            {spot.location}
                          </p>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {spot.description}
                          </p>

                          {spot.romantic_tips && (
                            <div className="p-3 rounded-2xl bg-[#faf5eb] border border-gold-200/90 text-xs space-y-1">
                              <span className="font-bold text-maroon flex items-center space-x-1.5 text-[11px]">
                                <Camera size={12} className="text-amber-700" />
                                <span>Tips Foto &amp; Romantisme:</span>
                              </span>
                              <p className="text-stone-700 text-[11px] leading-relaxed">
                                {spot.romantic_tips}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Cost & Action Bar */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 block uppercase font-bold">Estimasi Biaya</span>
                            <span className="font-mono font-bold text-maroon">
                              {spot.estimated_cost > 0 ? formatRupiah(spot.estimated_cost) : 'Gratis'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={spot.gmaps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-gold-100 text-stone-800 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                            >
                              <MapPin size={12} className="text-maroon" />
                              <span>Peta</span>
                            </a>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleToggleVisitedSpot(spot.id)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                spot.is_visited
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-stone-50 hover:bg-emerald-50 text-stone-600 border border-stone-200'
                              }`}
                            >
                              <Check size={12} className={spot.is_visited ? 'text-emerald-700' : 'text-stone-400'} />
                              <span>{spot.is_visited ? 'Sudah' : 'Kunjungi'}</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: RENCANA ITINERARY HARIAN (EDITORIAL JOURNAL) */}
        {/* ======================================================== */}
        {activeTab === 'itinerary' && (
          <motion.div
            key="tab-itinerary"
            variants={tabPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-maroon">
                  Rencana Perjalanan Harian (5 Hari 4 Malam)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Jadwal tersusun rapi mulai dari hari kedatangan, sesi foto ayunan di Ubud, air terjun tersembunyi, hingga menginap di villa tebing Uluwatu.
                </p>
              </div>
            </div>

            {/* Day Focus Filter Pills with Motion layoutId */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gold-200/80 shadow-xs w-fit">
              <button
                type="button"
                onClick={() => setSelectedItineraryDay('all')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 ${
                  selectedItineraryDay === 'all' ? 'text-gold' : 'text-stone-600 hover:text-maroon'
                }`}
              >
                {selectedItineraryDay === 'all' && (
                  <motion.span
                    layoutId="honeymoonItineraryDayPill"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute inset-0 rounded-xl bg-maroon -z-10 shadow-xs"
                  />
                )}
                <span>Semua Hari</span>
              </button>

              {itinerary.map((day) => {
                const isSelected = selectedItineraryDay === day.day_number;
                return (
                  <button
                    key={day.day_number}
                    type="button"
                    onClick={() => setSelectedItineraryDay(day.day_number)}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 ${
                      isSelected ? 'text-gold' : 'text-stone-600 hover:text-maroon'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="honeymoonItineraryDayPill"
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="absolute inset-0 rounded-xl bg-maroon -z-10 shadow-xs"
                      />
                    )}
                    <span>Hari {day.day_number}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-6">
              {filteredItinerary.map((day, dIdx) => (
                <motion.div
                  key={day.day_number}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(dIdx * 0.07, 0.3), type: 'spring', stiffness: 280, damping: 24 }}
                  className="bg-white rounded-[2rem] border border-gold-200/90 shadow-lg overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="bg-gradient-to-r from-[#800000] via-[#6b060d] to-[#430308] p-5 sm:p-6 text-white flex items-center justify-between relative overflow-hidden">
                    <motion.div
                      animate={{ opacity: [0.1, 0.24, 0.1], scale: [1, 1.15, 1] }}
                      transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-gold/25 blur-2xl pointer-events-none"
                    />
                    <div className="space-y-0.5 relative z-10">
                      <span className="text-[10px] uppercase font-bold text-amber-200 tracking-[0.22em] block">
                        {day.date_label || `Hari ke-${day.day_number}`}
                      </span>
                      <h4 className="font-serif text-lg sm:text-xl font-bold text-gold">
                        {day.title}
                      </h4>
                    </div>
                    <span className="relative z-10 px-3.5 py-2 rounded-2xl bg-white/10 text-gold flex items-center justify-center font-serif text-sm font-bold border border-gold/40 tracking-widest backdrop-blur-sm">
                      DAY {String(day.day_number).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Day Timeline Activities */}
                  <div className="p-6 sm:p-7 space-y-4">
                    {day.activities.map((act, actIdx) => (
                      <motion.div
                        key={actIdx}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                        className="flex items-start space-x-4 relative group"
                      >
                        {/* Timeline dot & line */}
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-[#faf5eb] text-maroon border border-gold-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                            {act.icon_type === 'hotel' && <BedDouble size={15} />}
                            {act.icon_type === 'photo' && <Camera size={15} />}
                            {act.icon_type === 'nature' && <Mountain size={15} />}
                            {act.icon_type === 'cafe' && <Coffee size={15} />}
                            {act.icon_type === 'unique' && <Sparkles size={15} />}
                            {act.icon_type === 'travel' && <Car size={15} />}
                          </div>
                          {actIdx !== day.activities.length - 1 && (
                            <div className="w-0.5 h-12 bg-gradient-to-b from-gold-300/80 to-stone-200 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h5 className="font-serif text-sm sm:text-base font-bold text-stone-900 group-hover:text-maroon transition-colors">
                              {act.title}
                            </h5>
                            <span className="font-mono text-[11px] font-bold text-maroon bg-gold-50 border border-gold-200 px-2.5 py-0.5 rounded-lg">
                              {act.time}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                            {act.description}
                          </p>
                          {act.location && (
                            <span className="inline-flex items-center space-x-1 text-[11px] text-amber-800 font-semibold mt-1.5">
                              <MapPin size={11} />
                              <span>{act.location}</span>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: ESTIMASI BIAYA (CONCIERGE BUDGET STUDIO) */}
        {/* ======================================================== */}
        {activeTab === 'budget' && (
          <motion.div
            key="tab-budget"
            variants={tabPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div>
              <h3 className="font-serif text-2xl font-bold text-maroon">
                Kalkulator &amp; Rincian Estimasi Biaya Honeymoon
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Simulasi total alokasi dana honeymoon berdua untuk memastikan liburan nyaman, tenang, dan sesuai rencana keuangan.
              </p>
            </div>

            {/* Grand Total Luxury Card */}
            <motion.div
              whileHover={{ scale: 1.008 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="bg-gradient-to-r from-[#6d0505] via-maroon to-[#3a0308] text-white p-6 sm:p-8 rounded-[2rem] shadow-2xl border-2 border-gold-300/80 relative overflow-hidden"
            >
              <motion.div
                animate={{ opacity: [0.14, 0.3, 0.14], scale: [1, 1.16, 1] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-gold/25 blur-3xl pointer-events-none"
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-200 tracking-[0.2em] block">
                    Total Estimasi Anggaran Honeymoon
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-black text-gold mt-1.5 tabular-nums">
                    {formatRupiah(grandTotalBudget)}
                  </h2>
                  <p className="text-xs text-amber-100/85 mt-1.5">
                    Estimasi untuk perjalanan 5 Hari 4 Malam (Termasuk Villa Mewah, Pesawat, Kuliner &amp; Aktivitas).
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center sm:text-right shrink-0">
                  <span className="text-[10px] text-amber-200/80 uppercase font-bold tracking-wider block">
                    Status Akomodasi
                  </span>
                  <span className="text-sm font-bold text-white block mt-1">
                    {hotels.filter(h => h.status === 'booked').length} Villa Dibooking
                  </span>
                  <span className="text-[11px] text-amber-200">
                    {hotels.filter(h => h.status === 'recommended').length} Pilihan Utama
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Structured Breakdown List with Visual Allocation Bars */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gold-200 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                <h4 className="font-serif text-lg font-bold text-maroon">
                  Rincian Alokasi Biaya per Kategori
                </h4>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Proporsi Anggaran
                </span>
              </div>

              <div className="space-y-3.5">
                {budgetRows.map((row, idx) => {
                  const pct = grandTotalBudget > 0 ? Math.round((row.amount / grandTotalBudget) * 100) : 0;
                  const RowIcon = row.icon;
                  return (
                    <motion.div
                      key={row.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                      whileHover={{ x: 3 }}
                      className="p-4 rounded-2xl bg-[#faf7f2]/70 border border-gold-200/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${row.badgeBg}`}>
                            <RowIcon size={19} />
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-stone-900">{row.title}</h5>
                            <p className="text-[11px] text-stone-500">{row.subtitle}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-serif font-bold text-base text-maroon block tabular-nums">
                            {formatRupiah(row.amount)}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-stone-400">
                            {pct}% dari total
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-stone-200/70 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.15 + idx * 0.05 }}
                          className={`h-full rounded-full bg-gradient-to-r ${row.barColor}`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: PACKING CHECKLIST (TACTILE PACKING STUDIO) */}
        {/* ======================================================== */}
        {activeTab === 'packing' && (
          <motion.div
            key="tab-packing"
            variants={tabPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl font-bold text-maroon">
                  Checklist Perlengkapan &amp; Bawaan Honeymoon
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Pastikan dokumen penting, outfit foto terbaik, kamera, dan skincare tidak ada yang tertinggal.
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsAddPackingModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gold-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Tambah Barang Bawaan</span>
              </motion.button>
            </div>

            {/* Progress Box */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gold-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-stone-700 flex items-center space-x-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  <span>
                    Kesiapan Bawaan Koper:{' '}
                    <strong className="text-maroon">
                      {packedCount} dari {packingList.length} Barang Siap
                    </strong>
                  </span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    {packedPercentage === 100
                      ? 'Siap Berangkat!'
                      : packedPercentage >= 60
                      ? 'Hampir Lengkap'
                      : 'Tahap Persiapan'}
                  </span>
                  <span className="font-mono font-bold text-maroon text-sm tabular-nums">
                    {packedPercentage}%
                  </span>
                </div>
              </div>

              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${packedPercentage}%` }}
                  transition={{ type: 'spring', stiffness: 85, damping: 18 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                />
              </div>
            </div>

            {/* Category & Person Filters with Motion layoutId */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-b border-gold-200/60 pb-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Semua Kategori' },
                  { id: 'dokumen', label: '📄 Dokumen' },
                  { id: 'outfit', label: '👗 Outfit & Fashion' },
                  { id: 'elektronik', label: '📷 Gadget & Kamera' },
                  { id: 'kesehatan', label: '🧴 Skincare & Obat' }
                ].map(f => {
                  const isSelected = packingCategoryFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPackingCategoryFilter(f.id as any)}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 ${
                        isSelected
                          ? 'text-gold'
                          : 'bg-white text-stone-600 border border-stone-200 hover:text-maroon'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="honeymoonPackingCatPill"
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="absolute inset-0 rounded-xl bg-maroon border border-gold/60 -z-10"
                        />
                      )}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Filter by Person */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70">
                {(['all', 'Fikri', 'Nadya', 'Bersama'] as const).map(p => {
                  const isSelected = packingPersonFilter === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPackingPersonFilter(p)}
                      className={`relative px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer z-10 ${
                        isSelected ? 'text-maroon' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="honeymoonPackingPersonPill"
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="absolute inset-0 rounded-lg bg-white shadow-2xs -z-10"
                        />
                      )}
                      <span>{p === 'all' ? 'Semua' : p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packing Items List */}
            <motion.div layout className="bg-white rounded-[2rem] p-4 sm:p-6 border border-gold-200 shadow-lg space-y-2.5">
              {filteredPacking.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400">
                  Tidak ada barang di kategori ini.
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredPacking.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleTogglePacking(item.id)}
                      className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between cursor-pointer select-none ${
                        item.is_packed
                          ? 'bg-emerald-50/75 border-emerald-300 text-stone-800'
                          : 'bg-[#faf7f2]/60 hover:bg-gold-50/50 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <motion.div
                          animate={item.is_packed ? { scale: [0.8, 1.15, 1] } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                            item.is_packed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border-2 border-stone-300 bg-white'
                          }`}
                        >
                          {item.is_packed && <Check size={14} className="stroke-[3]" />}
                        </motion.div>
                        <div>
                          <span
                            className={`text-xs font-bold block transition-colors ${
                              item.is_packed ? 'line-through text-stone-400' : 'text-stone-800'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                            Untuk: {item.for_person} • {item.category}
                          </span>
                        </div>
                      </div>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePackingItem(item.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH HOTEL / VILLA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddHotelModalOpen}
        onClose={() => setIsAddHotelModalOpen(false)}
        title="Tambah Penginapan / Villa Honeymoon"
      >
        <form onSubmit={handleCreateHotel} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Nama Villa / Hotel *</label>
            <input 
              type="text" 
              required
              placeholder="Contoh: The Kayon Jungle Resort Ubud"
              value={newHotelName}
              onChange={(e) => setNewHotelName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Tipe Kamar</label>
              <input 
                type="text" 
                placeholder="Contoh: Royal Pool Villa"
                value={newHotelRoomType}
                onChange={(e) => setNewHotelRoomType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Rating</label>
              <input 
                type="number" 
                step="0.1" 
                min="1" 
                max="5"
                value={newHotelRating}
                onChange={(e) => setNewHotelRating(parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Harga per Malam (Rp)</label>
              <input 
                type="number" 
                value={newHotelPricePerNight}
                onChange={(e) => setNewHotelPricePerNight(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Jumlah Malam</label>
              <input 
                type="number" 
                min="1"
                value={newHotelNights}
                onChange={(e) => setNewHotelNights(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Lokasi / Alamat</label>
            <input 
              type="text" 
              placeholder="Contoh: Payangan, Ubud, Gianyar, Bali"
              value={newHotelLocation}
              onChange={(e) => setNewHotelLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link Google Maps (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://maps.google.com/..."
              value={newHotelGmaps}
              onChange={(e) => setNewHotelGmaps(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">
              Fasilitas &amp; Isi Hotel Spesial (Pisahkan dengan Koma)
            </label>
            <textarea 
              rows={2}
              placeholder="Private Pool, Floating Breakfast, Bathtub Bunga, View Samudera, Butler 24 Jam"
              value={newHotelAmenitiesInput}
              onChange={(e) => setNewHotelAmenitiesInput(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link URL Foto Villa (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..."
              value={newHotelImageUrl}
              onChange={(e) => setNewHotelImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Catatan Romantis</label>
            <textarea 
              rows={2}
              placeholder="Contoh: Sangat cocok untuk hari ke-2 & 3 saat relaksasi berdua..."
              value={newHotelNotes}
              onChange={(e) => setNewHotelNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsAddHotelModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold cursor-pointer"
            >
              Batal
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
            >
              Simpan Penginapan
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: TAMBAH DESTINASI / SPOT BARU */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddSpotModalOpen}
        onClose={() => setIsAddSpotModalOpen(false)}
        title="Tambah Destinasi / Spot Wisata"
      >
        <form onSubmit={handleCreateSpot} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Nama Tempat / Destinasi *</label>
            <input 
              type="text" 
              required
              placeholder="Contoh: Rock Bar Ayana / Tegalalang Swing"
              value={newSpotName}
              onChange={(e) => setNewSpotName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Kategori</label>
              <select
                value={newSpotCategory}
                onChange={(e) => setNewSpotCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon bg-white"
              >
                <option value="photo_spot">📸 Spot Foto Estetik</option>
                <option value="nature">🌿 Wisata Alam</option>
                <option value="cafe_culinary">☕ Cafe &amp; Kuliner</option>
                <option value="unique_place">✨ Tempat Unik</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Estimasi Biaya (Rp)</label>
              <input 
                type="number" 
                value={newSpotCost}
                onChange={(e) => setNewSpotCost(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Lokasi / Area</label>
            <input 
              type="text" 
              placeholder="Contoh: Jimbaran, Kuta Selatan, Bali"
              value={newSpotLocation}
              onChange={(e) => setNewSpotLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link Google Maps (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://maps.google.com/..."
              value={newSpotGmaps}
              onChange={(e) => setNewSpotGmaps(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Deskripsi Singkat</label>
            <textarea 
              rows={2}
              placeholder="Daya tarik utama destinasi ini..."
              value={newSpotDesc}
              onChange={(e) => setNewSpotDesc(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Tips Foto &amp; Romantisme Berdua</label>
            <textarea 
              rows={2}
              placeholder="Contoh: Datang saat sore pukul 17.00 untuk golden sunset..."
              value={newSpotTips}
              onChange={(e) => setNewSpotTips(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link URL Foto (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..."
              value={newSpotImageUrl}
              onChange={(e) => setNewSpotImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsAddSpotModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold cursor-pointer"
            >
              Batal
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
            >
              Simpan Destinasi
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: TAMBAH PACKING ITEM */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddPackingModalOpen}
        onClose={() => setIsAddPackingModalOpen(false)}
        title="Tambah Barang ke Checklist"
      >
        <form onSubmit={handleCreatePacking} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Nama Barang Bawaan *</label>
            <input 
              type="text" 
              required
              placeholder="Contoh: Kacamata Hitam Couple"
              value={newPackingName}
              onChange={(e) => setNewPackingName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Kategori</label>
              <select
                value={newPackingCategory}
                onChange={(e) => setNewPackingCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon bg-white"
              >
                <option value="dokumen">📄 Dokumen</option>
                <option value="outfit">👗 Outfit &amp; Pakaian</option>
                <option value="elektronik">📷 Gadget &amp; Kamera</option>
                <option value="kesehatan">🧴 Skincare &amp; Obat</option>
                <option value="lainnya">📦 Lainnya</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Peruntukan</label>
              <select
                value={newPackingPerson}
                onChange={(e) => setNewPackingPerson(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon bg-white"
              >
                <option value="Bersama">Bersama</option>
                <option value="Fikri">Fikri</option>
                <option value="Nadya">Nadya</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsAddPackingModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold cursor-pointer"
            >
              Batal
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
            >
              Tambah ke Koper
            </motion.button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default Honeymoon;
