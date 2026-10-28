
import React, { useState, useEffect, useRef } from 'react';
import { supabase, logActivity } from '../supabase';
import { Message } from '../types';
import { Send, Link, MessageCircle, Heart, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const MessageCenter: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const safeEmail = userEmail || '';
  const partnerEmail = safeEmail.toLowerCase().includes('fikri') ? 'nadya@wedding.com' : 'fikri@wedding.com';
  const partnerName = (partnerEmail.split('@')[0] || 'Pasangan').toUpperCase();

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    // Filter locally to simulate conversation between pair
    const filtered = (data || []).filter(m => 
      (m.sender_email === userEmail && m.receiver_email === partnerEmail) ||
      (m.sender_email === partnerEmail && m.receiver_email === userEmail)
    );
    setMessages(filtered);
    setLoading(false);
    
    // Mark messages as read
    const unreadIds = filtered.filter(m => m.receiver_email === userEmail && !m.is_read).map(m => m.id);
    if (unreadIds.length > 0) {
      for (const id of unreadIds) {
        await supabase.from('messages').update({ is_read: true }).eq('id', id);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [userEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    
    const { error } = await supabase.from('messages').insert([{
      sender_email: userEmail,
      receiver_email: partnerEmail,
      content: newMsg,
      is_read: false
    }]);
    
    if (error) {
      toast.error("Gagal kirim pesan!");
    } else {
      setNewMsg('');
      fetchMessages();
      logActivity(userEmail, 'create', 'Message', `Kirim pesan ke ${partnerName}`);
    }
  };

  const renderContent = (content: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return content.split(urlPattern).map((part, i) => {
      if (part.match(urlPattern)) {
        return <a key={i} href={part} target="_blank" className="underline font-bold text-gold hover:text-white transition-colors flex items-center space-x-1"><Link size={12} /><span>Link Klik Disini</span></a>;
      }
      return part;
    });
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white rounded-[2.5rem] border border-gold-100 shadow-2xl overflow-hidden animate-slide-up">
      <div className="bg-maroon p-6 border-b border-gold-200 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-maroon font-bold text-xl shadow-lg border-2 border-gold ring-4 ring-maroon-800">
            {partnerName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-gold">Pesan untuk {partnerName}</h2>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest flex items-center space-x-1">
              <Sparkles size={10} className="text-gold" />
              <span>Private Connection</span>
            </p>
          </div>
        </div>
        <Heart className="text-gold fill-gold animate-pulse" size={24} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fdfaf7] custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-full text-gray-400 italic">Memuat percakapan cinta...</div>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_email === userEmail ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-4 rounded-3xl shadow-md ${
              m.sender_email === userEmail 
                ? 'bg-maroon text-gold-50 rounded-tr-none border border-gold-200' 
                : 'bg-white text-maroon-900 rounded-tl-none border border-gold-100'
            }`}>
              <div className="text-sm font-medium leading-relaxed break-words">{renderContent(m.content)}</div>
              <p className={`text-[9px] mt-2 font-bold uppercase tracking-tighter ${m.sender_email === userEmail ? 'text-gold-200' : 'text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-20">
            <MessageCircle size={48} className="mx-auto text-gold-100 mb-4" />
            <p className="text-gray-400 italic">Belum ada pesan. Yuk, kirim link dekor atau kado buat {partnerName}!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white border-t border-gold-100">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Tulis pesan atau link disini sayang..." 
            className="w-full pl-6 pr-20 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-maroon/5 focus:border-maroon text-maroon-900 font-medium placeholder:italic shadow-inner"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-maroon text-gold p-3 rounded-2xl hover:bg-maroon-800 transition-all shadow-lg group-active:scale-95 border border-gold-200">
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageCenter;
