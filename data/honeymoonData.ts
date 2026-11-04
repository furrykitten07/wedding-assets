import { 
  HoneymoonDestination, 
  HoneymoonHotel, 
  HoneymoonSpot, 
  HoneymoonItineraryDay, 
  PackingItem 
} from '../types';

export const INITIAL_DESTINATIONS: HoneymoonDestination[] = [
  {
    id: 'bali',
    name: 'Bali (Ubud & Uluwatu)',
    tagline: 'Perpaduan Romantis Keasrian Lembah Ubud & Kemewahan Sunset Tebing Samudera',
    country: 'Indonesia',
    duration_days: 5,
    best_season: 'April – Oktober (Cerah & Sejuk)',
    hero_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    description: 'Destinasi bulan madu impian nomor satu di dunia. Menawarkan ketenangan villa pribadi di tengah hutan tropis Ubud dengan floating breakfast, dilanjutkan pengalaman mewah menikmati sunset di atas tebing karang megah Uluwatu.',
    highlights: [
      'Private Pool Villa dengan pemandangan lembah hutan tropis',
      'Floating Breakfast & Flower Bath Petal berdua',
      'Sunset Candlelight Dinner di atas tebing samudera Hindia',
      'Spot foto terasering sawah & ayunan jungle swing berdua'
    ]
  },
  {
    id: 'labuan_bajo',
    name: 'Labuan Bajo & Pulau Komodo',
    tagline: 'Petualangan Eksotis di Kepulauan Surga & Pelayaran Phinisi Romantis',
    country: 'Indonesia',
    duration_days: 4,
    best_season: 'Mei – November (Laut Tenang & Langit Biru)',
    hero_image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80',
    description: 'Bagi pasangan yang menyukai keindahan alam spektakuler. Menikmati matahari terbit di puncak Pulau Padar, berenang di Pink Beach, berlayar dengan kapal Phinisi mewah, dan menginap di resort tepi pantai privat.',
    highlights: [
      'Liveaboard berlayar dengan kapal phinisi semi-luxury',
      'Sunrise ikonik berdua di puncak 3 teluk Pulau Padar',
      'Pasir merah muda romantis di Pink Beach',
      'Snorkeling bersama Manta Ray di Manta Point'
    ]
  },
  {
    id: 'lombok',
    name: 'Lombok & Gili Trawangan',
    tagline: 'Ketenangan Pantai Pasir Putih Bersih & Sunset Romantis Tanpa Polusi',
    country: 'Indonesia',
    duration_days: 4,
    best_season: 'Mei – Oktober',
    hero_image: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=1200&q=80',
    description: 'Suasana bulan madu yang tenang dan privat. Bersepeda berdua menyusuri pantai Gili Trawangan tanpa kendaraan bermotor, menjelajahi Bukit Merese yang hijau, dan menginap di villa tepi pantai Senggigi.',
    highlights: [
      'Bersepeda santai berdua mengelilingi pulau tropis tanpa polusi',
      'Sunset spektakuler dari atas bukit Merese',
      'Berenang bersama penyu laut di Gili Meno',
      'Candlelight dinner di pinggir pantai pasir putih'
    ]
  }
];

export const INITIAL_HOTELS: HoneymoonHotel[] = [
  {
    id: 'hotel-1',
    name: 'The Kayon Jungle Resort by Pramana',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Banjar Bresela, Desa Payangan, Ubud, Gianyar, Bali 80572',
    gmaps_link: 'https://maps.google.com/?q=The+Kayon+Jungle+Resort+Ubud',
    price_per_night: 4250000,
    nights_count: 2,
    total_price: 8500000,
    room_type: 'Kayon Royal Pool Villa (Private Valley View)',
    amenities: [
      'Private Heated Infinity Pool menghadap lembah hutan tropis Ubud',
      'Floating Breakfast romantis bertabur bunga segar di kolam renang pribadi',
      'Deep Soaking Stone Bathtub dengan taburan kelopak mawar (Flower Bath)',
      'King-Size Canopy Bed dengan kelambu romantis & honeymoon swan towel decoration',
      'Seraphic Spa berdua dengan pemandangan aliran sungai & hutan bambu',
      'Free Daily Afternoon Tea & Balinese Sunset Cocktails',
      '24-Hour dedicated personal butler service',
      'Akses ke Kolam Renang Tiga Tingkat (Wanna Jungle Pool Bar)'
    ],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    status: 'recommended',
    romantic_notes: 'Pilihan utama untuk 2 malam pertama! Sangat tenang, udara sejuk pegunungan, 100% privat untuk pasangan baru. Sangat direkomendasikan pesan floating breakfast di hari ke-2.'
  },
  {
    id: 'hotel-2',
    name: 'Alila Villas Uluwatu',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Belimbing Sari, Tambiyak, Pecatu, Kuta Selatan, Badung, Bali 80364',
    gmaps_link: 'https://maps.google.com/?q=Alila+Villas+Uluwatu',
    price_per_night: 8750000,
    nights_count: 2,
    total_price: 17500000,
    room_type: 'One-Bedroom Cliff-Edge Ocean Pool Villa',
    amenities: [
      'Kolam renang pribadi luas menghadap panorama laut lepas Samudera Hindia',
      'Private Sunset Cabana gantung di atas tebing karang dramatis',
      'Kamar mandi terbuka mewah dengan double rain shower & oversized bathtub',
      'Sunset bar ikonik & fine dining cabana romantis kelas dunia',
      'Layanan Villa Host pribadi 24 jam untuk reservasi & kejutan romantis',
      'Akses pantai privat di bawah tebing kapur',
      'Kasur super king bed berbahan katun organik premium 400 thread count',
      'Pemandangan matahari terbenam emas (golden sunset) langsung dari ranjang'
    ],
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    rating: 5.0,
    status: 'recommended',
    romantic_notes: 'Villa tebing paling prestisius di Bali! Pemandangan sunset 180 derajat yang luar biasa. Sangat pas untuk merayakan momen puncak honeymoon berdua.'
  },
  {
    id: 'hotel-3',
    name: 'Padma Resort Ubud',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Banjar Carik, Desa Puhu, Payangan, Gianyar, Bali 80572',
    gmaps_link: 'https://maps.google.com/?q=Padma+Resort+Ubud',
    price_per_night: 3100000,
    nights_count: 2,
    total_price: 6200000,
    room_type: 'Premier Club Room with Misty Valley Balcony',
    amenities: [
      'Heated 89-meter Infinity Pool yang membelah kabut lembah Payangan',
      'Akses gratis ke Club Lounge (wine, cocktails & canapés setiap sore)',
      'Balkon luas dengan daybed empuk menghadap hutan alami',
      'Romantic Candlelight Forest Dinner di paviliun bambu',
      'Jalur jogging & trekking hutan bambu privat sepanjang 3.4 km',
      'Bathtub marmer dengan aroma terapi relaksasi'
    ],
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    status: 'wishlist',
    romantic_notes: 'Alternatif villa yang sangat bagus jika ingin kolam renang air hangat di tengah udara dingin Ubud serta fasilitas resort bintang lima yang luas.'
  },
  {
    id: 'hotel-4',
    name: 'Sudamala Resort, Seraya (Labuan Bajo)',
    destination: 'Labuan Bajo & Pulau Komodo',
    location: 'Pulau Seraya Kecil, Labuan Bajo, Nusa Tenggara Timur 86554',
    gmaps_link: 'https://maps.google.com/?q=Sudamala+Resort+Seraya+Labuan+Bajo',
    price_per_night: 3450000,
    nights_count: 2,
    total_price: 6900000,
    room_type: 'Beachfront Private Sunset Villa',
    amenities: [
      'Pintu kamar langsung membuka ke hamparan pasir putih bersih pulau privat',
      'Terumbu karang alami persis di depan teras kamar untuk snorkeling berdua',
      'Speedboat antar-jemput privat dari pelabuhan Labuan Bajo',
      'Makan malam romantis BBQ seafood di tepi pantai dengan api unggun',
      'Kamar mandi terbuka tropis dengan bahan kayu jati & batu alam'
    ],
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    status: 'wishlist',
    romantic_notes: 'Pulau resort terpencil yang sangat tenang di Labuan Bajo. Pasir pantai putih kristal dan air laut sebening kaca.'
  }
];

export const INITIAL_SPOTS: HoneymoonSpot[] = [
  // 1. SPOT FOTO ESTETIK
  {
    id: 'spot-1',
    name: 'Tegalalang Rice Terrace & Aloha Jungle Swing',
    category: 'photo_spot',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Raya Tegallalang, Gianyar, Ubud, Bali',
    gmaps_link: 'https://maps.google.com/?q=Aloha+Ubud+Swing',
    estimated_cost: 350000,
    cost_note: 'Tiket masuk & sewa gaun ayunan melambai',
    description: 'Hamparan sawah terasering berundak paling ikonik di dunia. Tersedia ayunan tandem berdua di atas jurang hijau serta spot sarang burung raksasa yang sangat instagramable.',
    image_url: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Datang pukul 07.30 - 08.30 pagi untuk mendapatkan cahaya matahari terbit keemasan tanpa keramaian turis. Nadya bisa menyewa flowing flying dress warna terracotta/putih untuk hasil foto spektakuler!',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-2',
    name: 'Wanagiri Hidden Hills & Danau Tamblingan',
    category: 'photo_spot',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Munduk - Wanagiri, Sukasada, Buleleng, Bali',
    gmaps_link: 'https://maps.google.com/?q=Wanagiri+Hidden+Hills',
    estimated_cost: 150000,
    cost_note: 'Tiket masuk & semua spot foto',
    description: 'Spot foto romantis di ketinggian dataran tinggi Bedugul dengan latar belakang dua danau kembar berkabut misterius. Tersedia spot perahu kayu Titanic dan ayunan di atas jurang danau.',
    image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Udara di sini cukup dingin berkabut, kenakan cardigan atau outfit couple kasual yang hangat. Jangan lewatkan foto berdua di haluan perahu kayu!',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-3',
    name: 'Diamond Beach & Kelingking Cliff (Nusa Penida)',
    category: 'photo_spot',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Nusa Penida, Klungkung, Bali',
    gmaps_link: 'https://maps.google.com/?q=Diamond+Beach+Nusa+Penida',
    estimated_cost: 550000,
    cost_note: 'Fastboat PP Sanur-Penida + Driver lokal',
    description: 'Tangga batu putih yang dipahat di tebing curam menghadap batu karang berbentuk berlian di laut toska cerah, serta tebing T-Rex Kelingking yang megah.',
    image_url: 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Bawa kacamata hitam dan gunakan alas kaki yang tidak licin. Foto terbaik diambil dari atas tangga batu Diamond Beach tanpa perlu turun sampai ke bibir pantai terjal.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-4',
    name: 'Pantai Melasti & Tebing Karang Putih Ungasan',
    category: 'photo_spot',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Ungasan, Kuta Selatan, Badung, Bali',
    gmaps_link: 'https://maps.google.com/?q=Pantai+Melasti+Ungasan',
    estimated_cost: 50000,
    cost_note: 'Tiket masuk & parkir mobil',
    description: 'Jalanan berkelok yang membelah tebing kapur putih menjulang tinggi dengan ujung pantai berpasir putih dan air laut biru toska bergradasi.',
    image_url: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Ambil foto mobil / jalanan tebing kapur saat sore hari menjelang sunset (pukul 16.30). Sangat cantik untuk video sinematik berdua!',
    is_favorite: false,
    is_visited: false
  },

  // 2. WISATA ALAM
  {
    id: 'spot-5',
    name: 'Banyumala Twin Waterfalls',
    category: 'nature',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Wanagiri, Sukasada, Buleleng, Bali',
    gmaps_link: 'https://maps.google.com/?q=Banyumala+Twin+Waterfalls',
    estimated_cost: 80000,
    cost_note: 'Tiket masuk berdua',
    description: 'Air terjun kembar tersembunyi yang mengalir lembut di sela-sela dinding tebing berselimut tanaman lumut dan pakis hijau. Memiliki kolam air alami yang sangat jernih dan segar.',
    image_url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Jauh lebih tenang dan privat dibanding air terjun lainnya di Bali. Airnya sangat menyegarkan untuk cuci muka atau berendam santai berdua di tepi kolam.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-6',
    name: 'Gunung Batur Sunrise Private 4WD Jeep Tour',
    category: 'nature',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Kintamani, Bangli, Bali',
    gmaps_link: 'https://maps.google.com/?q=Black+Lava+Kintamani+Jeep',
    estimated_cost: 850000,
    cost_note: '1 Mobil Jeep Privat + Driver + Kopi & Sarapan di Puncak',
    description: 'Petualangan romantis subuh menaiki mobil jeep 4WD terbuka menuju spot kaldera Batur untuk menikmati matahari terbit di atas awan, dilanjutkan menjelajahi padang pasir hitam Black Lava.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Berangkat dari villa pukul 03.30 pagi. Nikmati secangkir hot chocolate hangat berdua sambil duduk di atas kap jeep melihat fajar ungu merekah perlahan di ufuk timur.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-7',
    name: 'Bukit Campuhan (Campuhan Ridge Walk)',
    category: 'nature',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Raya Campuhan, Sayan, Ubud, Gianyar, Bali',
    gmaps_link: 'https://maps.google.com/?q=Campuhan+Ridge+Walk',
    estimated_cost: 0,
    cost_note: 'Gratis / Free Entry',
    description: 'Jalur setapak paving di punggung bukit hijau yang membelah dua lembah sungai di Ubud. Suasana sangat asri dan tenang dengan ilalang yang melambai tertiup angin.',
    image_url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Waktu terbaik adalah pukul 06.30 pagi untuk jalan pagi santai berpegangan tangan menghirup udara segar Ubud sebelum matahari terik.',
    is_favorite: false,
    is_visited: false
  },

  // 3. CAFE & KULINER ROMANTIS
  {
    id: 'spot-8',
    name: 'Cretya Sunset Lounge & Day Club Ubud',
    category: 'cafe_culinary',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Raya Tegallalang, Gianyar, Ubud, Bali',
    gmaps_link: 'https://maps.google.com/?q=Cretya+Ubud',
    estimated_cost: 450000,
    cost_note: 'Minimum spend daybed & kuliner berdua',
    description: 'Lounge mewah bertingkat tiga di tengah sawah terasering dengan kolam renang infinity berundak, sajian kuliner internasional lezat, dan musik chillout romantis.',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Pesan daybed tepi kolam untuk bersantai siang menjelang sore sambil menikmati pizza kayu bakar dan mocktail buah tropis segar.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-9',
    name: 'Rock Bar at AYANA Resort Bali',
    category: 'cafe_culinary',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Karang Mas Sejahtera, Jimbaran, Kuta Selatan, Badung, Bali',
    gmaps_link: 'https://maps.google.com/?q=Rock+Bar+AYANA',
    estimated_cost: 650000,
    cost_note: 'Sunset drinks & tapas dinner berdua',
    description: 'Bar tebing laut nomor satu di dunia yang berdiri kokoh di atas formasi batu karang alami 14 meter di atas deburan ombak Samudera Hindia. Diakses menggunakan lift miring tebing (inclinator).',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Reservasi meja di area bulat tengah karang untuk pukul 17.00 WIB. Pemandangan matahari tenggelam ke dasar samudera dengan diiringi deburan ombak akan jadi kenangan terindah.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-10',
    name: 'La Brisa Bali (Echo Beach Canggu)',
    category: 'cafe_culinary',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Pantai Batu Mejan, Canggu, Kuta Utara, Badung, Bali',
    gmaps_link: 'https://maps.google.com/?q=La+Brisa+Bali',
    estimated_cost: 400000,
    cost_note: 'Kopi, kelapa muda & makan sore',
    description: 'Beach club bernuansa rustic bohemian pantai yang dibangun sepenuhnya dari kayu lebih dari 500 perahu nelayan tua. Dikelilingi pohon kelapa rimbun persis di bibir pantai berpasir hitam berkilau.',
    image_url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Pilih bean bag di bawah lampu-lampu gantung temaram di tepi kolam. Sangat estetik saat senja tiba!',
    is_favorite: false,
    is_visited: false
  },
  {
    id: 'spot-11',
    name: 'Tis Cafe Ubud (Terasering Sawah View)',
    category: 'cafe_culinary',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Raya Tegallalang, Gianyar, Bali',
    gmaps_link: 'https://maps.google.com/?q=Tis+Cafe+Ubud',
    estimated_cost: 250000,
    cost_note: 'Artisan coffee, brunch & dessert',
    description: 'Cafe estetik berkonsep semi-outdoor dengan kolam renang infinity mini dan ayunan kayu yang menghadap tepat ke barisan sawah terasering Ubud.',
    image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Wajib coba menu Avocado Toast dan Coconut Iced Latte mereka sambil menikmati ketenangan semilir angin persawahan.',
    is_favorite: false,
    is_visited: false
  },

  // 4. TEMPAT UNIK & HIDDEN GEMS
  {
    id: 'spot-12',
    name: 'Couples Balinese Flower Bath & Spa at Karsa Spa',
    category: 'unique_place',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Markandya, Banyar Bangkiang Sidem, Keliki, Tegallalang, Gianyar, Bali',
    gmaps_link: 'https://maps.google.com/?q=Karsa+Spa+Ubud',
    estimated_cost: 950000,
    cost_note: 'Paket Spa 2 Jam Berdua + Mandi Bunga Mawar',
    description: 'Pusat relaksasi tubuh tradisional di tengah hamparan sawah dan kolam teratai. Menghadirkan ritual pijat aromaterapi berdua yang diakhiri dengan berendam di bathtub batu bertabur ribuan kelopak mawar warna-warni.',
    image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Harus dipesan (booking) minimal 2-3 minggu sebelum keberangkatan karena paviliun privat mereka selalu penuh peminat.',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-13',
    name: 'Kelas Keramik Berdua (Couple Pottery Workshop) Kevala',
    category: 'unique_place',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Jl. Danau Poso No.20, Sanur, Denpasar Selatan, Bali',
    gmaps_link: 'https://maps.google.com/?q=Kevala+Ceramics+Studio',
    estimated_cost: 600000,
    cost_note: 'Workshop 2 Jam + Tanah Liat + Pembakaran & Pewarnaan Hasil Karya',
    description: 'Aktivitas unik membuat cangkir kopi, mangkok, atau vas bunga berdua dari tanah liat menggunakan mesin putar tradisional seperti di film legendaris Ghost. Hasil karya akan dibakar dan dikirim ke rumah sebagai souvenir abadi pernikahan.',
    image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Momen sangat manis untuk saling mengukir inisial nama F & N serta tanggal pernikahan di dasar keramik buatan kalian berdua!',
    is_favorite: true,
    is_visited: false
  },
  {
    id: 'spot-14',
    name: 'Private Sunset Catamaran Cruise ke Teluk Jimbaran',
    category: 'unique_place',
    destination: 'Bali (Ubud & Uluwatu)',
    location: 'Benoa Marina, Benoa, Denpasar Selatan, Bali',
    gmaps_link: 'https://maps.google.com/?q=Benoa+Marina+Bali',
    estimated_cost: 1800000,
    cost_note: 'Private boat 3 jam + Canapés & Drinks',
    description: 'Berlayar santai di atas kapal layar katamaran privat berdua menyusuri pesisir selatan Bali menjelang matahari terbenam dengan angin laut yang tenang.',
    image_url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80',
    romantic_tips: 'Duduk di jaring dek depan kapal sambil melihat lumba-lumba berenang dan langit senja yang berubah warna menjadi jingga keunguan.',
    is_favorite: false,
    is_visited: false
  }
];

export const INITIAL_ITINERARY: HoneymoonItineraryDay[] = [
  {
    day_number: 1,
    title: 'Arrival in Paradise & Romantic Candlelight Welcome',
    date_label: 'Hari 1 • Keberangkatan & Check-in Villa',
    activities: [
      {
        time: '11.30 WITA',
        title: 'Tiba di Bandara Internasional I Gusti Ngurah Rai',
        description: 'Penjemputan privat dengan kalungan bunga kamboja wangi, transfer nyaman menuju Ubud (sekitar 1.5 jam perjalanan).',
        icon_type: 'travel',
        location: 'Bandara Ngurah Rai'
      },
      {
        time: '14.00 WITA',
        title: 'Check-in di The Kayon Jungle Resort Ubud',
        description: 'Welcome drink kelapa muda, room tour Kayon Royal Pool Villa, istirahat dan menikmati honeymoon swan decoration di ranjang.',
        icon_type: 'hotel',
        location: 'Payangan, Ubud'
      },
      {
        time: '16.30 WITA',
        title: 'Afternoon Tea & Berenang Santai di Private Infinity Pool',
        description: 'Menikmati teh sore dan kue tradisional Bali di tepi kolam pribadi menghadap hutan lembah yang tenang.',
        icon_type: 'nature',
        location: 'Villa Pribadi'
      },
      {
        time: '19.00 WITA',
        title: 'Romantic Candlelight Dinner di Kepitu Restaurant',
        description: 'Makan malam romantis 4-course menu dengan taburan lilin dan alunan musik rindik bambu tradisional.',
        icon_type: 'cafe',
        location: 'The Kayon Jungle'
      }
    ]
  },
  {
    day_number: 2,
    title: 'Ubud Romance & Aesthetic Photoshoot Journey',
    date_label: 'Hari 2 • Sawah Terasering & Jungle Swing',
    activities: [
      {
        time: '07.00 WITA',
        title: 'Floating Breakfast di Kolam Renang Villa Pribadi',
        description: 'Sarapan mewah di atas nampan terapung berbentuk hati: croissant hangat, fresh juices, pancake, dan buah tropis.',
        icon_type: 'hotel',
        location: 'Private Pool Villa'
      },
      {
        time: '09.00 WITA',
        title: 'Sesi Foto Romantis di Tegalalang & Aloha Jungle Swing',
        description: 'Foto berdua di ayunan raksasa dengan gaun melambai berlatar belakang terasering sawah bertingkat.',
        icon_type: 'photo',
        location: 'Tegalalang, Ubud'
      },
      {
        time: '12.30 WITA',
        title: 'Lunch & Chillout di Cretya Ubud',
        description: 'Makan siang santai di lounge mewah dengan pemandangan undakan kolam infinity.',
        icon_type: 'cafe',
        location: 'Cretya Day Club'
      },
      {
        time: '16.00 WITA',
        title: 'Couples Balinese Flower Bath Spa at Karsa Spa',
        description: 'Ritual pemijatan tubuh relaksasi 2 jam berdua diakhiri berendam di bathtub bunga mawar.',
        icon_type: 'unique',
        location: 'Karsa Spa Ubud'
      }
    ]
  },
  {
    day_number: 3,
    title: 'Nature Magic & Moving to Cliff-Edge Luxury',
    date_label: 'Hari 3 • Air Terjun & Pindah ke Uluwatu',
    activities: [
      {
        time: '08.00 WITA',
        title: 'Sarapan Pagi & Checkout dari Ubud',
        description: 'Menikmati sarapan terakhir di Ubud dan bersiap untuk perjalanan menuju pesisir selatan Bali.',
        icon_type: 'hotel',
        location: 'The Kayon'
      },
      {
        time: '10.30 WITA',
        title: 'Eksplorasi Banyumala Twin Waterfalls & Wanagiri Hills',
        description: 'Menikmati udara sejuk pegunungan dan berfoto di spot sarang burung Danau Tamblingan.',
        icon_type: 'nature',
        location: 'Buleleng / Bedugul'
      },
      {
        time: '15.00 WITA',
        title: 'Check-in di Alila Villas Uluwatu',
        description: 'Masuk ke villa tebing spektakuler dengan pemandangan Samudera Hindia 180 derajat yang luar biasa.',
        icon_type: 'hotel',
        location: 'Pecatu, Uluwatu'
      },
      {
        time: '17.30 WITA',
        title: 'Golden Sunset Cocktails di Sunset Cabana Alila',
        description: 'Menikmati momen matahari terbenam emas berdua dari paviliun kayu gantung di atas tebing samudera.',
        icon_type: 'cafe',
        location: 'Alila Cabana'
      }
    ]
  },
  {
    day_number: 4,
    title: 'Ocean Breeze & Secret Island Adventure',
    date_label: 'Hari 4 • Pantai Karang & Sunset Rock Bar',
    activities: [
      {
        time: '08.30 WITA',
        title: 'Santai Pagi & Private Ocean Dip',
        description: 'Berenang di private saltwater pool villa sambil memandang deburan ombak laut biru di bawah tebing.',
        icon_type: 'hotel',
        location: 'Alila Villas'
      },
      {
        time: '11.00 WITA',
        title: 'Kelas Keramik Berdua (Couple Pottery Workshop)',
        description: 'Membuat souvenir keramik cinta buatan tangan sendiri untuk kenang-kenangan rumah baru.',
        icon_type: 'unique',
        location: 'Sanur Studio'
      },
      {
        time: '14.00 WITA',
        title: 'Jelajah Tebing Kapur Pantai Melasti & Pantai Pandawa',
        description: 'Foto di jalanan tebing kapur putih yang megah dan bermain pasir putih lembut berdua.',
        icon_type: 'photo',
        location: 'Ungasan'
      },
      {
        time: '17.00 WITA',
        title: 'Sunset Experience di Rock Bar at AYANA Resort',
        description: 'Momen epik menikmati minuman dingin dan makan malam di atas batu karang laut lepas.',
        icon_type: 'cafe',
        location: 'Jimbaran'
      }
    ]
  },
  {
    day_number: 5,
    title: 'Sweet Memories Return & Souvenir Hunt',
    date_label: 'Hari 5 • Belanja Oleh-Oleh & Penerbangan Pulang',
    activities: [
      {
        time: '09.00 WITA',
        title: 'Santai Pagi & Late Breakfast di Villa',
        description: 'Menikmati waktu tenang berdua, berfoto di sudut-sudut arsitektur villa yang memukau.',
        icon_type: 'hotel',
        location: 'Alila Villas'
      },
      {
        time: '12.00 WITA',
        title: 'Checkout & Berburu Oleh-Oleh Khas Bali',
        description: 'Belanja pie susu, kacang disco, kain pantai, dan pernak-pernik estetik khas Pulau Dewata untuk keluarga.',
        icon_type: 'travel',
        location: 'Seminyak & Kuta'
      },
      {
        time: '15.30 WITA',
        title: 'Transfer ke Bandara & Penerbangan Pulang',
        description: 'Tiba di Bandara Ngurah Rai dengan hati bahagia penuh kenangan manis tak terlupakan mengawali bahtera rumah tangga.',
        icon_type: 'travel',
        location: 'Bandara Ngurah Rai'
      }
    ]
  }
];

export const INITIAL_PACKING_LIST: PackingItem[] = [
  // Dokumen
  { id: 'pack-1', name: 'KTP Asli Fikri & Nadya (Wajib untuk check-in penerbangan)', category: 'dokumen', for_person: 'Bersama', is_packed: true },
  { id: 'pack-2', name: 'E-Ticket Pesawat & Boarding Pass di HP', category: 'dokumen', for_person: 'Bersama', is_packed: true },
  { id: 'pack-3', name: 'Voucher Konfirmasi Booking Villa & Hotel', category: 'dokumen', for_person: 'Bersama', is_packed: true },
  { id: 'pack-4', name: 'Kartu ATM / Debit & Kartu Kredit untuk deposit hotel', category: 'dokumen', for_person: 'Fikri', is_packed: true },
  { id: 'pack-5', name: 'SIM A & e-Toll untuk sewa mobil lepas kunci', category: 'dokumen', for_person: 'Fikri', is_packed: false },

  // Outfit
  { id: 'pack-6', name: 'White / Terracotta Flowing Dress untuk foto di ayunan & tebing', category: 'outfit', for_person: 'Nadya', is_packed: true },
  { id: 'pack-7', name: 'Kemeja Linen Putih & Celana Chino Pendek', category: 'outfit', for_person: 'Fikri', is_packed: true },
  { id: 'pack-8', name: 'Baju Couple Santai Warna Senada (Earth tone / Sage green)', category: 'outfit', for_person: 'Bersama', is_packed: false },
  { id: 'pack-9', name: 'Baju Renang / Swimwear untuk private pool & beach club', category: 'outfit', for_person: 'Bersama', is_packed: false },
  { id: 'pack-10', name: 'Kacamata Hitam (Sunglasses) & Topi Pantai Lebar', category: 'outfit', for_person: 'Bersama', is_packed: true },
  { id: 'pack-11', name: 'Sandal Pantai & Sepatu Kets Nyaman untuk jalan', category: 'outfit', for_person: 'Bersama', is_packed: false },
  { id: 'pack-12', name: 'Jaket / Cardigan Hangat untuk sunrise Kintamani', category: 'outfit', for_person: 'Bersama', is_packed: false },

  // Elektronik
  { id: 'pack-13', name: 'Kamera Mirrorless / DSLR & Lensa Potret', category: 'elektronik', for_person: 'Fikri', is_packed: false },
  { id: 'pack-14', name: 'Drone & Baterai Cadangan untuk video aerial', category: 'elektronik', for_person: 'Fikri', is_packed: false },
  { id: 'pack-15', name: 'Tripod Bluetooth / Tongsis untuk foto berdua', category: 'elektronik', for_person: 'Nadya', is_packed: true },
  { id: 'pack-16', name: 'Powerbank 20.000 mAh (masuk bagasi kabin)', category: 'elektronik', for_person: 'Bersama', is_packed: true },
  { id: 'pack-17', name: 'Waterproof Pouch HP untuk foto di kolam & air terjun', category: 'elektronik', for_person: 'Nadya', is_packed: false },

  // Kesehatan & Skincare
  { id: 'pack-18', name: 'Sunscreen Wajah & Badan SPF 50+ PA++++ (Wajib!)', category: 'kesehatan', for_person: 'Nadya', is_packed: true },
  { id: 'pack-19', name: 'Soothing Aloe Vera Gel setelah terpapar sinar matahari', category: 'kesehatan', for_person: 'Nadya', is_packed: false },
  { id: 'pack-20', name: 'Obat Masuk Angin (Tolak Angin) & Minyak Kayu Putih', category: 'kesehatan', for_person: 'Bersama', is_packed: true },
  { id: 'pack-21', name: 'Paracetamol, Obat Maag / Lambung, & Anti Alergi', category: 'kesehatan', for_person: 'Bersama', is_packed: true },
  { id: 'pack-22', name: 'Parfum Signature Romantis untuk makan malam', category: 'kesehatan', for_person: 'Bersama', is_packed: false }
];

