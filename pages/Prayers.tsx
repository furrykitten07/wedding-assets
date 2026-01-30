
import React from 'react';
import { BookOpen, Sparkles, Heart, Sun, Moon } from 'lucide-react';

const Prayers: React.FC = () => {
  const prayers = [
    {
      title: "Doa Nabi Yusuf (Wajah Bercahaya)",
      arabic: "الَّلهُمَّ جَعَلْنِي نُوْرًا فِي عَيْنِي وَنُوْرًا فِي قَلْبِي وَنُوْرًا فِي سَمْعِي وَنُوْرًا فِي بَصَرِي وَنُوْرًا فِي شَعْرِي وَنُوْرًا فِي بَشَرِي",
      latin: "Allahummaj'alni nuran fi 'ayni wa nuran fi qalbi wa nuran fi sam'i wa nuran fi bashari wa nuran fi sya'ri wa nuran fi basyari.",
      translation: "Ya Allah, jadikanlah cahaya pada mataku, cahaya pada hatiku, cahaya pada pendengaranku, cahaya pada penglihatanku, cahaya pada rambutku, dan cahaya pada kulitku.",
      benefit: "Mengamalkan doa ini untuk memancarkan aura kasih sayang dan ketenangan di wajah."
    },
    {
      title: "Doa Seribu Dinar (Rezeki)",
      arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
      latin: "Wa may yattaqillaha yaj'al lahu makhraja. Wa yarzuq-hu min haitsu la yahtasib. Wa may yatawakkal 'alallahi fahuwa hasbuh.",
      translation: "Barangsiapa bertakwa kepada Allah niscaya Dia akan mengadakan baginya jalan keluar, dan memberinya rezeki dari arah yang tiada disangka-sangkanya. Dan barangsiapa yang bertawakkal kepada Allah niscaya Allah akan mencukupkan (keperluan)nya.",
      benefit: "Amalan untuk melancarkan dana pernikahan dan kemudahan rezeki rumah tangga."
    },
    {
      title: "Doa Mohon Pasangan & Keturunan Baik",
      arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
      latin: "Rabbana hab lana min azwajina wa dzurriyyatina qurrata a'yunin waj'alna lil muttaqina imama.",
      translation: "Ya Tuhan kami, anugerahkanlah kepada kami pasangan kami dan keturunan kami sebagai penyenang hati (kami), dan jadikanlah kami imam bagi orang-orang yang bertakwa.",
      benefit: "QS. Al-Furqan: 74, doa utama setiap pasangan menuju keluarga Sakinah Mawaddah Warahmah."
    },
    {
      title: "Doa Memudahkan Urusan (Ashabul Kahfi)",
      arabic: "رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
      latin: "Rabbana atina mil ladunka rahmatan wa hayyi' lana min amrina rasyada.",
      translation: "Wahai Tuhan kami, berikanlah rahmat kepada kami dari sisi-Mu dan sempurnakanlah bagi kami petunjuk yang lurus dalam urusan kami (ini).",
      benefit: "Dibaca saat menghadapi hambatan dalam persiapan acara pernikahan."
    }
  ];

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-maroon rounded-[2rem] shadow-xl border border-gold-300">
            <BookOpen size={32} className="text-gold" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-maroon">Doa & Amalan Kita</h1>
        <p className="text-gray-500 italic max-w-xl mx-auto">"Hati yang tenang adalah pondasi rumah tangga yang kokoh. Mari hiasi persiapan kita dengan langit-langit doa."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {prayers.map((p, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm hover:shadow-2xl hover:border-gold-300 transition-all group">
            <div className="flex items-center justify-between mb-6">
                <span className="px-4 py-1 bg-gold-50 text-gold-800 text-[10px] font-bold uppercase tracking-widest rounded-full border border-gold-200">{i + 1}. MUSTAJAB</span>
                <Sparkles size={16} className="text-gold group-hover:rotate-12 transition-transform" />
            </div>
            <h3 className="text-xl font-serif font-bold text-maroon mb-6">{p.title}</h3>
            <div className="bg-stone-50 p-6 rounded-3xl mb-4 relative overflow-hidden">
                <div className="absolute top-2 right-4 opacity-5"><Moon size={40} /></div>
                <p className="text-right text-2xl font-serif leading-loose text-maroon-900 font-bold tracking-wide" dir="rtl">{p.arabic}</p>
            </div>
            <div className="space-y-4">
                <p className="text-xs font-bold text-gold-700 italic border-l-4 border-gold-300 pl-3 leading-relaxed">
                    {p.latin}
                </p>
                <p className="text-sm text-gray-600 italic leading-relaxed">"{p.translation}"</p>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mb-1 flex items-center space-x-1">
                        <Heart size={10} />
                        <span>Fadhilah Amalan</span>
                    </p>
                    <p className="text-xs text-emerald-800 font-medium">{p.benefit}</p>
                </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-maroon p-10 rounded-[3rem] text-center shadow-2xl border border-gold-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%"><pattern id="pattern_doa" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="white" strokeWidth="1" fill="none"/></pattern><rect width="100%" height="100%" fill="url(#pattern_doa)"/></svg>
        </div>
        <Sun className="text-gold mx-auto mb-4" size={32} />
        <h2 className="text-2xl font-serif font-bold text-gold mb-2">Semoga Allah Memudahkan</h2>
        <p className="text-gold-200 text-sm italic">"Rencana kita hanyalah ikhtiar, ketetapan Allah-lah yang paling indah."</p>
      </div>
    </div>
  );
};

export default Prayers;
