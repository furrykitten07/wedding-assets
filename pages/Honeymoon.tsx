import React, { useState, useEffect } from 'react';
import { 
  Palmtree, 
  MapPin, 
  ExternalLink, 
  Star, 
  Heart, 
  Camera, 
  Coffee, 
  Mountain, 
  Compass, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Bookmark, 
  BedDouble, 
  Bath, 
  Utensils, 
  Briefcase, 
  Check, 
  Eye, 
  Waves,
  Sun,
  Award,
  ChevronRight,
  Info,
  Car,
  Plane
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
    // Reset Form
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
    // Reset Form
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

  const estimatedFlightCost = 4800000; // Estimasi 2 Tiket Pesawat PP
  const estimatedDiningCost = 3500000; // Wisata Kuliner 5 Hari
  const estimatedSouvenirEmergency = 2000000; // Oleh-oleh & Dana Darurat

  const grandTotalBudget = totalHotelCost + totalSpotsCost + estimatedFlightCost + estimatedDiningCost + estimatedSouvenirEmergency;

  const packedCount = packingList.filter(p => p.is_packed).length;
  const packedPercentage = packingList.length > 0 ? Math.round((packedCount / packingList.length) * 100) : 0;

  // Filtered Spots
  const filteredSpots = spots.filter(s => {
    if (spotCategoryFilter === 'all') return true;
    return s.category === spotCategoryFilter;
  });

  // Filtered Packing List
  const filteredPacking = packingList.filter(p => {
    if (packingCategoryFilter !== 'all' && p.category !== packingCategoryFilter) return false;
    if (packingPersonFilter !== 'all' && p.for_person !== packingPersonFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-16 animate-fade-in font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gold-200/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-100/80 border border-gold-300 text-maroon text-xs font-bold tracking-wider uppercase mb-2 shadow-2xs">
            <Palmtree size={14} className="text-amber-700" />
            <span>Romantic Honeymoon Planner</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-maroon tracking-tight">
            Agenda Honeymoon Fikri &amp; Nadya
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Rencana perjalanan cinta berdua: Destinasi kota impian, villa mewah privat, spot foto estetik, keindahan alam, cafe romantis, dan hidden gems berdua.
          </p>
        </div>

        {/* Action Button & Destination Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (activeTab === 'hotels') setIsAddHotelModalOpen(true);
              else if (activeTab === 'spots') setIsAddSpotModalOpen(true);
              else if (activeTab === 'packing') setIsAddPackingModalOpen(true);
              else setIsAddSpotModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-maroon via-maroon-700 to-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 flex items-center space-x-2 border border-gold/40 cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Tambah Item Baru</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-500 hover:text-maroon border border-stone-200 transition-colors shadow-2xs"
            title="Reset ke Rekomendasi Kurasi Awal"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* DESTINATION SELECTION & HERO CARD */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-300/80 group">
        <div className="h-64 sm:h-80 w-full overflow-hidden relative">
          <img 
            src={currentDestination.hero_image} 
            alt={currentDestination.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        </div>

        {/* Destination Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-gold/90 text-stone-900 font-bold text-[10px] uppercase tracking-widest shadow-sm">
                  ★ Destinasi Terpilih
                </span>
                <span className="text-xs text-amber-200/90 font-medium">
                  {currentDestination.country} • Durasi Rekomendasi {currentDestination.duration_days} Hari
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-md">
                {currentDestination.name}
              </h2>
            </div>

            {/* Destination Switcher Pills */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
              {destinations.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDestId(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDestId === d.id
                      ? 'bg-maroon text-gold border border-gold-400 shadow-md'
                      : 'text-stone-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {d.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-stone-200 max-w-3xl leading-relaxed">
            {currentDestination.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-amber-200 font-medium">
            <span className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
              <Sun size={13} className="text-amber-300" />
              <span>Musim Terbaik: <strong>{currentDestination.best_season}</strong></span>
            </span>
            <span className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
              <Heart size={13} className="text-rose-400 fill-rose-400" />
              <span>Vibe: Romantis, Eksotis &amp; Mewah</span>
            </span>
          </div>
        </div>
      </div>

      {/* QUICK STATS BENTO BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gold-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-gold-300">
            <BedDouble size={22} className="text-maroon" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Penginapan Villa</span>
            <span className="font-serif text-lg font-bold text-maroon leading-tight block">
              {hotels.length} Pilihan Mewah
            </span>
            <span className="text-[10px] text-stone-500 font-medium">
              Est. {formatRupiah(totalHotelCost)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gold-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center shrink-0 border border-purple-200">
            <Camera size={22} className="text-purple-700" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Destinasi &amp; Spot</span>
            <span className="font-serif text-lg font-bold text-purple-900 leading-tight block">
              {spots.length} Tempat Romantis
            </span>
            <span className="text-[10px] text-purple-700 font-medium">
              {spots.filter(s => s.is_favorite).length} Disukai Berdua
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gold-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <Calendar size={22} className="text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Itinerary Harian</span>
            <span className="font-serif text-lg font-bold text-emerald-900 leading-tight block">
              {itinerary.length} Hari Perjalanan
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              Rute Terjadwal Rapi
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gold-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center shrink-0 border border-rose-200">
            <Briefcase size={22} className="text-rose-700" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Checklist Bawaan</span>
              <span className="text-[10px] font-mono font-bold text-rose-800">{packedPercentage}%</span>
            </div>
            <span className="font-serif text-lg font-bold text-rose-950 leading-tight block">
              {packedCount} / {packingList.length} Siap
            </span>
            <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-rose-600 rounded-full transition-all duration-500"
                style={{ width: `${packedPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS MENU (5 MAIN SECTIONS) */}
      <div className="bg-stone-200/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-stone-300/80 shadow-inner">
        <button
          onClick={() => setActiveTab('hotels')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'hotels'
              ? 'bg-maroon text-gold shadow-md ring-1 ring-gold/40'
              : 'text-stone-600 hover:text-maroon hover:bg-white/60'
          }`}
        >
          <BedDouble size={16} />
          <span>1. Penginapan &amp; Villa</span>
        </button>

        <button
          onClick={() => setActiveTab('spots')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'spots'
              ? 'bg-maroon text-gold shadow-md ring-1 ring-gold/40'
              : 'text-stone-600 hover:text-maroon hover:bg-white/60'
          }`}
        >
          <Camera size={16} />
          <span>2. Destinasi &amp; Cafe</span>
        </button>

        <button
          onClick={() => setActiveTab('itinerary')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'itinerary'
              ? 'bg-maroon text-gold shadow-md ring-1 ring-gold/40'
              : 'text-stone-600 hover:text-maroon hover:bg-white/60'
          }`}
        >
          <Calendar size={16} />
          <span>3. Rencana Itinerary</span>
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'budget'
              ? 'bg-maroon text-gold shadow-md ring-1 ring-gold/40'
              : 'text-stone-600 hover:text-maroon hover:bg-white/60'
          }`}
        >
          <DollarSign size={16} />
          <span>4. Estimasi Biaya</span>
        </button>

        <button
          onClick={() => setActiveTab('packing')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'packing'
              ? 'bg-maroon text-gold shadow-md ring-1 ring-gold/40'
              : 'text-stone-600 hover:text-maroon hover:bg-white/60'
          }`}
        >
          <Briefcase size={16} />
          <span>5. Checklist Bawaan</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: HOTEL & PENGINAPAN MEWAH */}
      {/* ======================================================== */}
      {activeTab === 'hotels' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Daftar Rekomendasi Hotel &amp; Villa Romantis
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Penginapan privat pilihan dengan fasilitas floating breakfast, kolam renang pribadi, dan kamar mandi bertabur kelopak bunga.
              </p>
            </div>

            <button
              onClick={() => setIsAddHotelModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Tambah Villa / Hotel Impian</span>
            </button>
          </div>

          {/* Hotel Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hotels.map((hotel) => (
              <div 
                key={hotel.id}
                className="bg-white rounded-3xl overflow-hidden border border-gold-200/90 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all duration-300 group"
              >
                {/* Photo & Badges */}
                <div className="relative h-64 w-full overflow-hidden">
                  <img 
                    src={hotel.image_url} 
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleHotelStatus(hotel.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md cursor-pointer transition-all flex items-center space-x-1 ${
                        hotel.status === 'booked'
                          ? 'bg-emerald-600 text-white border border-emerald-300'
                          : hotel.status === 'recommended'
                            ? 'bg-amber-400 text-maroon border border-amber-500 font-black'
                            : 'bg-white/90 text-stone-700 backdrop-blur-sm'
                      }`}
                      title="Klik untuk ubah status"
                    >
                      <span>
                        {hotel.status === 'booked' ? '✓ Sudah Dibooking' : hotel.status === 'recommended' ? '★ Pilihan Utama' : 'Wishlist'}
                      </span>
                    </button>
                    
                    <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-gold text-[10px] font-bold border border-gold/40 flex items-center space-x-1">
                      <Star size={12} className="text-gold fill-gold" />
                      <span>{hotel.rating}</span>
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteHotel(hotel.id)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                    title="Hapus Hotel"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Title & Room Type on Photo */}
                  <div className="absolute bottom-4 inset-x-4 text-white">
                    <h4 className="font-serif text-xl font-bold leading-tight drop-shadow-sm">
                      {hotel.name}
                    </h4>
                    <p className="text-xs text-amber-200 font-medium mt-0.5">
                      {hotel.room_type}
                    </p>
                  </div>
                </div>

                {/* Hotel Details Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Location & Maps Button */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-start space-x-2 text-xs text-stone-600">
                      <MapPin size={16} className="text-maroon shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{hotel.location}</span>
                    </div>

                    <a
                      href={hotel.gmaps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-gold-100 text-stone-800 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      <span>Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Price Block */}
                  <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-gold-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Harga per Malam</span>
                      <span className="font-serif text-lg font-bold text-maroon">
                        {formatRupiah(hotel.price_per_night)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        Durasi ({hotel.nights_count} Malam)
                      </span>
                      <span className="font-serif text-lg font-bold text-amber-950">
                        {formatRupiah(hotel.total_price || hotel.price_per_night * hotel.nights_count)}
                      </span>
                    </div>
                  </div>

                  {/* Isi Hotel / Fasilitas Romantis */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center space-x-1">
                      <Sparkles size={12} className="text-amber-600" />
                      <span>Fasilitas &amp; Isi Hotel Spesial:</span>
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {hotel.amenities.map((item, idx) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-stone-50 text-stone-700 border border-stone-200 text-[11px] font-medium flex items-center space-x-1"
                        >
                          <span className="text-maroon font-bold">•</span>
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Romantic Notes */}
                  {hotel.romantic_notes && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 italic leading-relaxed">
                      "{hotel.romantic_notes}"
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      Status: <strong className="text-stone-800 uppercase font-bold">{hotel.status}</strong>
                    </span>

                    <button
                      onClick={() => handleToggleHotelStatus(hotel.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-maroon hover:bg-maroon-700 text-gold text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      {hotel.status === 'booked' ? 'Tandai Selesai' : hotel.status === 'recommended' ? 'Ubah ke Booking' : 'Pilih Ini'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: DESTINASI, SPOT FOTO, ALAM & CAFE */}
      {/* ======================================================== */}
      {activeTab === 'spots' && (
        <div className="space-y-6 animate-fade-in">
          {/* Subheader & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Destinasi Wisata, Spot Foto &amp; Cafe Romantis
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Koleksi tempat terbaik untuk mengabadikan foto berdua, menikmati keajaiban alam, mencicipi kuliner estetik, dan petualangan berdua.
              </p>
            </div>

            <button
              onClick={() => setIsAddSpotModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Tambah Spot Baru</span>
            </button>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-stone-200/80 pb-3">
            {[
              { id: 'all', label: `🌟 Semua Destinasi (${spots.length})` },
              { id: 'photo_spot', label: `📸 Spot Foto Estetik (${spots.filter(s => s.category === 'photo_spot').length})` },
              { id: 'nature', label: `🌿 Wisata Alam (${spots.filter(s => s.category === 'nature').length})` },
              { id: 'cafe_culinary', label: `☕ Cafe & Kuliner (${spots.filter(s => s.category === 'cafe_culinary').length})` },
              { id: 'unique_place', label: `✨ Tempat Unik (${spots.filter(s => s.category === 'unique_place').length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSpotCategoryFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  spotCategoryFilter === f.id
                    ? 'bg-maroon text-gold border border-gold shadow-sm ring-1 ring-gold'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Destination Spots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpots.map((spot) => {
              const categoryBadge = {
                photo_spot: { label: 'Spot Foto Estetik', bg: 'bg-purple-600 text-white' },
                nature: { label: 'Wisata Alam', bg: 'bg-emerald-600 text-white' },
                cafe_culinary: { label: 'Cafe & Kuliner', bg: 'bg-amber-600 text-white' },
                unique_place: { label: 'Tempat Unik', bg: 'bg-rose-600 text-white' }
              }[spot.category];

              return (
                <div 
                  key={spot.id}
                  className="bg-white rounded-3xl overflow-hidden border border-gold-200/80 shadow-lg flex flex-col justify-between hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Photo Container */}
                  <div className="relative h-52 w-full overflow-hidden">
                    <img 
                      src={spot.image_url} 
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Category Pill */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${categoryBadge.bg}`}>
                        {categoryBadge.label}
                      </span>
                    </div>

                    {/* Action icons on top right */}
                    <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggleFavoriteSpot(spot.id)}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          spot.is_favorite ? 'bg-rose-500 text-white' : 'bg-black/40 text-stone-200 hover:bg-black/60'
                        }`}
                        title={spot.is_favorite ? 'Favorit berdua' : 'Tambah ke favorit'}
                      >
                        <Heart size={14} className={spot.is_favorite ? 'fill-white' : ''} />
                      </button>

                      <button
                        onClick={() => handleDeleteSpot(spot.id)}
                        className="p-2 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Spot Name on Bottom of Photo */}
                    <div className="absolute bottom-3 inset-x-3 text-white">
                      <h4 className="font-serif text-lg font-bold leading-tight drop-shadow-sm">
                        {spot.name}
                      </h4>
                      <p className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                        {spot.location}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    {/* Description */}
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {spot.description}
                    </p>

                    {/* Romantic Tips Box */}
                    {spot.romantic_tips && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-gold-200 text-xs space-y-1">
                        <span className="font-bold text-maroon flex items-center space-x-1 text-[11px]">
                          <Camera size={12} className="text-amber-700" />
                          <span>Tips Foto &amp; Romantisme:</span>
                        </span>
                        <p className="text-stone-700 text-[11px] leading-relaxed">
                          {spot.romantic_tips}
                        </p>
                      </div>
                    )}

                    {/* Cost & Maps Bar */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
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
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-gold-100 text-stone-800 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                        >
                          <MapPin size={12} className="text-maroon" />
                          <span>Peta</span>
                        </a>

                        <button
                          onClick={() => handleToggleVisitedSpot(spot.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                            spot.is_visited
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-stone-50 hover:bg-emerald-50 text-stone-600 border border-stone-200'
                          }`}
                        >
                          <Check size={12} className={spot.is_visited ? 'text-emerald-700' : 'text-stone-400'} />
                          <span>{spot.is_visited ? 'Sudah' : 'Kunjungi'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: RENCANA ITINERARY HARIAN (TIMELINE PLANNER) */}
      {/* ======================================================== */}
      {activeTab === 'itinerary' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Rencana Perjalanan Harian (5 Hari 4 Malam)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Jadwal tersusun rapi mulai dari hari kedatangan, sesi foto ayunan di Ubud, air terjun tersembunyi, hingga menginap di villa tebing Uluwatu.
            </p>
          </div>

          <div className="space-y-6">
            {itinerary.map((day) => (
              <div 
                key={day.day_number}
                className="bg-white rounded-3xl border border-gold-200/90 shadow-xl overflow-hidden"
              >
                {/* Day Header */}
                <div className="bg-gradient-to-r from-maroon via-maroon-700 to-[#5a0e17] p-5 text-white flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-amber-200 tracking-widest block">
                      {day.date_label || `Hari ke-${day.day_number}`}
                    </span>
                    <h4 className="font-serif text-lg font-bold text-gold">
                      {day.title}
                    </h4>
                  </div>
                  <span className="w-10 h-10 rounded-2xl bg-white/15 text-gold flex items-center justify-center font-serif text-lg font-bold border border-white/20">
                    H{day.day_number}
                  </span>
                </div>

                {/* Day Timeline Activities */}
                <div className="p-6 space-y-4">
                  {day.activities.map((act, actIdx) => (
                    <div key={actIdx} className="flex items-start space-x-4 relative group">
                      {/* Timeline dot & line */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-maroon border border-gold-300 flex items-center justify-center shrink-0 shadow-2xs">
                          {act.icon_type === 'hotel' && <BedDouble size={14} />}
                          {act.icon_type === 'photo' && <Camera size={14} />}
                          {act.icon_type === 'nature' && <Mountain size={14} />}
                          {act.icon_type === 'cafe' && <Coffee size={14} />}
                          {act.icon_type === 'unique' && <Sparkles size={14} />}
                          {act.icon_type === 'travel' && <Car size={14} />}
                        </div>
                        {actIdx !== day.activities.length - 1 && (
                          <div className="w-0.5 h-12 bg-stone-200 my-1 group-hover:bg-gold-300 transition-colors" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h5 className="font-serif text-sm font-bold text-stone-900">
                            {act.title}
                          </h5>
                          <span className="font-mono text-[11px] font-bold text-maroon bg-stone-100 px-2 py-0.5 rounded">
                            {act.time}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          {act.description}
                        </p>
                        {act.location && (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-amber-800 font-semibold mt-1">
                            <MapPin size={11} />
                            <span>{act.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: ESTIMASI BIAYA & BUDGETING CALCULATOR */}
      {/* ======================================================== */}
      {activeTab === 'budget' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Kalkulator &amp; Rincian Estimasi Biaya Honeymoon
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Simulasi total alokasi dana honeymoon berdua untuk memastikan liburan nyaman, tenang, dan sesuai rencana keuangan.
            </p>
          </div>

          {/* Grand Total Bento Card */}
          <div className="bg-gradient-to-r from-maroon via-maroon-700 to-[#5a0e17] text-white p-6 sm:p-8 rounded-3xl shadow-2xl border-2 border-gold-300 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-amber-200 tracking-widest block">
                  Total Estimasi Anggaran Honeymoon
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-black text-gold mt-1">
                  {formatRupiah(grandTotalBudget)}
                </h2>
                <p className="text-xs text-amber-100/90 mt-1">
                  Estimasi untuk perjalanan 5 Hari 4 Malam (Termasuk Villa Mewah, Pesawat, Kuliner &amp; Aktivitas).
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center sm:text-right shrink-0">
                <span className="text-[10px] text-stone-300 uppercase font-bold block">Status Akomodasi</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {hotels.filter(h => h.status === 'booked').length} Villa Dibooking
                </span>
                <span className="text-[11px] text-amber-200">
                  {hotels.filter(h => h.status === 'recommended').length} Pilihan Utama
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Items List */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold-200 shadow-xl space-y-4">
            <h4 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              Rincian Alokasi Biaya per Kategori
            </h4>

            <div className="space-y-3">
              {/* Hotel */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-maroon flex items-center justify-center">
                    <BedDouble size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">Akomodasi &amp; Villa Mewah</h5>
                    <p className="text-[11px] text-stone-500">Koleksi villa privat dengan private pool &amp; sarapan</p>
                  </div>
                </div>
                <span className="font-serif font-bold text-base text-maroon">
                  {formatRupiah(totalHotelCost)}
                </span>
              </div>

              {/* Flights */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Plane size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">Tiket Pesawat &amp; Transportasi Lokal</h5>
                    <p className="text-[11px] text-stone-500">Tiket PP 2 orang + sewa mobil private driver</p>
                  </div>
                </div>
                <span className="font-serif font-bold text-base text-stone-900">
                  {formatRupiah(estimatedFlightCost)}
                </span>
              </div>

              {/* Dining */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Utensils size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">Wisata Kuliner, Cafe &amp; Romantic Dinner</h5>
                    <p className="text-[11px] text-stone-500">Candlelight dinner, beach club &amp; brunch estetik</p>
                  </div>
                </div>
                <span className="font-serif font-bold text-base text-stone-900">
                  {formatRupiah(estimatedDiningCost)}
                </span>
              </div>

              {/* Spots & Activities */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">Tiket Destinasi, Spot Foto &amp; Couple Spa</h5>
                    <p className="text-[11px] text-stone-500">Ayunan Tegalalang, ritual spa bunga, &amp; tiket wisata</p>
                  </div>
                </div>
                <span className="font-serif font-bold text-base text-stone-900">
                  {formatRupiah(totalSpotsCost)}
                </span>
              </div>

              {/* Souvenirs & Emergency */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">Belanja Oleh-Oleh &amp; Dana Darurat</h5>
                    <p className="text-[11px] text-stone-500">Souvenir khas untuk keluarga &amp; cadangan tidak terduga</p>
                  </div>
                </div>
                <span className="font-serif font-bold text-base text-stone-900">
                  {formatRupiah(estimatedSouvenirEmergency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 5: PACKING CHECKLIST (DAFTAR BAWAAN BERDUA) */}
      {/* ======================================================== */}
      {activeTab === 'packing' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Checklist Perlengkapan &amp; Bawaan Honeymoon
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Pastikan dokumen penting, outfit foto terbaik, kamera, dan skincare tidak ada yang tertinggal.
              </p>
            </div>

            <button
              onClick={() => setIsAddPackingModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-maroon border border-gold-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Tambah Barang Bawaan</span>
            </button>
          </div>

          {/* Progress Box */}
          <div className="bg-white p-5 rounded-3xl border border-gold-200 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700 flex items-center space-x-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Kesiapan Bawaan Koper: <strong>{packedCount} dari {packingList.length} Barang Siap</strong></span>
              </span>
              <span className="font-mono font-bold text-maroon text-sm">{packedPercentage}%</span>
            </div>

            <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${packedPercentage}%` }}
              />
            </div>
          </div>

          {/* Category Filter for Packing */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-stone-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua Kategori' },
                { id: 'dokumen', label: '📄 Dokumen' },
                { id: 'outfit', label: '👗 Outfit & Fashion' },
                { id: 'elektronik', label: '📷 Gadget & Kamera' },
                { id: 'kesehatan', label: '🧴 Skincare & Obat' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPackingCategoryFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    packingCategoryFilter === f.id
                      ? 'bg-maroon text-gold border border-gold'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filter by Person */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              {(['all', 'Fikri', 'Nadya', 'Bersama'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPackingPersonFilter(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    packingPersonFilter === p ? 'bg-white text-maroon shadow-2xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {p === 'all' ? 'Semua' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Packing Items List */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gold-200 shadow-xl space-y-2">
            {filteredPacking.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Tidak ada barang di kategori ini.
              </div>
            ) : (
              filteredPacking.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleTogglePacking(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                    item.is_packed
                      ? 'bg-emerald-50/70 border-emerald-300 text-stone-800'
                      : 'bg-stone-50/50 hover:bg-stone-100/70 border-stone-200 text-stone-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        item.is_packed ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300 bg-white'
                      }`}
                    >
                      {item.is_packed && <Check size={14} className="stroke-[3]" />}
                    </button>
                    <div>
                      <span className={`text-xs font-bold block ${item.is_packed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                        Untuk: {item.for_person} • {item.category}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePackingItem(item.id);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Jumlah Malam</label>
              <input 
                type="number" 
                min="1"
                value={newHotelNights}
                onChange={(e) => setNewHotelNights(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon font-mono"
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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link Google Maps (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://maps.google.com/..."
              value={newHotelGmaps}
              onChange={(e) => setNewHotelGmaps(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link URL Foto Villa (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..."
              value={newHotelImageUrl}
              onChange={(e) => setNewHotelImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Catatan Romantis</label>
            <textarea 
              rows={2}
              placeholder="Contoh: Sangat cocok untuk hari ke-2 & 3 saat relaksasi berdua..."
              value={newHotelNotes}
              onChange={(e) => setNewHotelNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddHotelModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110"
            >
              Simpan Penginapan
            </button>
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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon font-mono"
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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link Google Maps (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://maps.google.com/..."
              value={newSpotGmaps}
              onChange={(e) => setNewSpotGmaps(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Deskripsi Singkat</label>
            <textarea 
              rows={2}
              placeholder="Daya tarik utama destinasi ini..."
              value={newSpotDesc}
              onChange={(e) => setNewSpotDesc(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Tips Foto &amp; Romantisme Berdua</label>
            <textarea 
              rows={2}
              placeholder="Contoh: Datang saat sore pukul 17.00 untuk golden sunset..."
              value={newSpotTips}
              onChange={(e) => setNewSpotTips(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-stone-700 block mb-1">Link URL Foto (Opsional)</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..."
              value={newSpotImageUrl}
              onChange={(e) => setNewSpotImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddSpotModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110"
            >
              Simpan Destinasi
            </button>
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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-maroon"
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
            <button
              type="button"
              onClick={() => setIsAddPackingModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110"
            >
              Tambah ke Koper
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Honeymoon;

