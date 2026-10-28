
import React, { useState, useEffect } from 'react';
import { supabase, logActivity, uploadFile } from '../supabase';
import { Idea, IdeaComment } from '../types';
import { 
  Plus, Search, Trash2, Edit2, Lightbulb, Save, X, 
  Hash, User, Calendar, Eye, ChevronLeft, ChevronRight,
  ThumbsUp, CheckCircle2, Ban, ImageIcon, FileText, Loader2,
  MessageCircle, Reply, Send, CornerDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const Ideas: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'unapproved'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [previewingIdea, setPreviewingIdea] = useState<Idea | null>(null);
  const [ideaToApprove, setIdeaToApprove] = useState<Idea | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Comment States
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<IdeaComment | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categories: [] as string[],
    image_urls: [] as string[],
    pdf_url: ''
  });
  const [tagInput, setTagInput] = useState('');

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('ideas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      let filteredData = (data || []).map((item: any) => {
        let cats = item.categories;
        if (typeof cats === 'string') {
          try { cats = JSON.parse(cats); } catch { cats = []; }
        }
        let imgs = item.image_urls;
        if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch { imgs = []; }
        }
        return {
          ...item,
          categories: Array.isArray(cats) ? cats : [],
          image_urls: Array.isArray(imgs) ? imgs : []
        };
      });
      
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item => 
          (item.title || '').toLowerCase().includes(s) || 
          (item.content || '').toLowerCase().includes(s) || 
          (item.categories || []).some((cat: any) => typeof cat === 'string' && cat.toLowerCase().includes(s))
        );
      }

      if (filterStatus === 'approved') {
        filteredData = filteredData.filter(item => item.is_approved);
      } else if (filterStatus === 'unapproved') {
        filteredData = filteredData.filter(item => !item.is_approved);
      }

      setTotalCount(filteredData.length);
      
      const from = page * pageSize;
      const to = from + pageSize;
      const paginatedData = filteredData.slice(from, to);

      setIdeas(paginatedData);
    } finally { setLoading(false); }
  };

  const fetchComments = async (ideaId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Map to include parent content if it's a reply
      const enriched = (data || []).map(c => {
        if (c.parent_id) {
          const parent = data?.find(p => p.id === c.parent_id);
          return { ...c, parent_content: parent?.content };
        }
        return c;
      });

      setComments(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => { fetchIdeas(); }, [searchTerm, page, pageSize, filterStatus]);

  const handleOpenModal = (idea?: Idea) => {
    if (idea) {
      setEditingIdea(idea);
      setFormData({ 
        title: idea.title, 
        content: idea.content, 
        categories: idea.categories || [],
        image_urls: idea.image_urls || [],
        pdf_url: idea.pdf_url || ''
      });
    } else {
      setEditingIdea(null);
      setFormData({ title: '', content: '', categories: [], image_urls: [], pdf_url: '' });
    }
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'img' | 'pdf') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    toast.loading(`Mengupload ${type.toUpperCase()}...`, { id: 'upload-idea' });
    try {
      if (type === 'pdf') {
        const url = await uploadFile(files[0], 'idea-docs');
        setFormData(prev => ({ ...prev, pdf_url: url }));
        toast.success("PDF Berhasil diupload!", { id: 'upload-idea' });
      } else {
        const urls = await Promise.all(
          files.slice(0, 5 - formData.image_urls.length).map(f => uploadFile(f, 'idea-photos'))
        );
        setFormData(prev => ({ ...prev, image_urls: [...prev.image_urls, ...urls] }));
        toast.success("Foto Berhasil diupload!", { id: 'upload-idea' });
      }
    } catch (err) {
      toast.error("Gagal upload. Pastikan bucket 'wedding-assets' sudah Public.", { id: 'upload-idea' });
    }
  };

  const handlePreview = (idea: Idea) => {
    setPreviewingIdea(idea);
    setComments([]);
    setCommentInput('');
    setReplyingTo(null);
    setIsPreviewOpen(true);
    fetchComments(idea.id);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !previewingIdea) return;

    const toastId = toast.loading('Mengirim komentar...');
    try {
      const payload: any = {
        idea_id: previewingIdea.id,
        user_email: userEmail,
        content: commentInput.trim(),
        parent_id: replyingTo?.id || null
      };

      const { error } = await supabase.from('idea_comments').insert([payload]);
      if (error) throw error;

      await logActivity(userEmail, 'comment', 'Ideas', `Mengomentari ide: ${previewingIdea.title}`);
      
      setCommentInput('');
      setReplyingTo(null);
      fetchComments(previewingIdea.id);
      toast.success('Komentar terkirim!', { id: toastId });
    } catch (err) {
      toast.error('Gagal mengirim komentar', { id: toastId });
    }
  };

  const openApproveConfirm = (idea: Idea) => {
    setIdeaToApprove(idea);
    setIsApproveConfirmOpen(true);
  };

  const handleToggleApprove = async () => {
    if (!ideaToApprove) return;
    
    const newStatus = !ideaToApprove.is_approved;
    try {
      const { error } = await supabase.from('ideas').update({ 
        is_approved: newStatus,
        approved_by: newStatus ? userEmail : null 
      }).eq('id', ideaToApprove.id);

      if (error) throw error;

      logActivity(
        userEmail, 
        'approve', 
        'Ideas', 
        `${newStatus ? 'Menyetujui' : 'Membatalkan persetujuan'} ide: ${ideaToApprove.title}`
      );

      toast.success(newStatus ? 'Ide telah disetujui! ❤️' : 'Persetujuan dibatalkan.');
      setIsApproveConfirmOpen(false);
      fetchIdeas();
    } catch (err) {
      toast.error('Gagal memproses persetujuan');
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.categories.includes(tagInput.trim())) {
        setFormData({ ...formData, categories: [...formData.categories, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, categories: formData.categories.filter(t => t !== tag) });
  };

  const removeImage = (index: number) => {
    setFormData({ ...formData, image_urls: formData.image_urls.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingIdea) {
        const { error } = await supabase.from('ideas').update(formData).eq('id', editingIdea.id);
        if (error) throw error;
        logActivity(userEmail, 'update', 'Ideas', `Update ide: ${formData.title}`);
      } else {
        const { error } = await supabase.from('ideas').insert([{ ...formData, created_by: userEmail, is_approved: false }]);
        if (error) throw error;
        logActivity(userEmail, 'create', 'Ideas', `Tambah ide baru: ${formData.title}`);
      }
      setIsModalOpen(false);
      await fetchIdeas();
      toast.success('Ide tersimpan di papan inspirasi!');
    } catch (err: any) {
      toast.error('Gagal menyimpan ide: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus ide: ${title}?`)) return;
    try {
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) throw error;
      logActivity(userEmail, 'delete', 'Ideas', `Hapus ide: ${title}`);
      await fetchIdeas();
      toast.success('Ide berhasil dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Hapus komentar ini?")) return;
    try {
      const { error } = await supabase.from('idea_comments').delete().eq('id', id);
      if (error) throw error;
      fetchComments(previewingIdea!.id);
      toast.success('Komentar dihapus');
    } catch (err) {
      toast.error('Gagal menghapus komentar');
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-maroon text-gold rounded-[1.5rem] shadow-xl border-2 border-gold-300">
            <Lightbulb size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-maroon">Papan Ide & Inspirasi</h1>
            <p className="text-gray-500 uppercase text-[10px] tracking-[0.4em] font-black">Dream it. Plan it. Do it.</p>
          </div>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-maroon hover:bg-maroon-800 text-gold px-10 py-5 rounded-[2rem] font-black shadow-2xl border-4 border-gold-400 flex items-center space-x-3 transition-all active:scale-95 group">
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          <span className="uppercase tracking-[0.2em] text-sm">Tulis Ide Baru</span>
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gold-200 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
              type="text" 
              placeholder="Cari judul, isi, atau tag..." 
              className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-maroon outline-none focus:border-maroon shadow-inner"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
          />
        </div>
        <div className="md:col-span-3">
          <select className="w-full px-4 py-4 border-2 border-gold-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm uppercase text-[11px] tracking-widest" value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setPage(0); }}>
              <option value="all">SEMUA STATUS</option>
              <option value="approved">SUDAH DISETUJUI</option>
              <option value="unapproved">BELUM DISETUJUI</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <select className="w-full px-4 py-4 border-2 border-gold-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm uppercase text-[11px] tracking-widest" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
              <option value={20}>20 DATA</option>
              <option value={30}>30 DATA</option>
              <option value={50}>50 DATA</option>
          </select>
        </div>
      </div>

      {/* IDEAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center font-bold text-maroon animate-pulse font-serif text-xl">Menyiapkan inspirasi cinta...</div>
        ) : ideas.length === 0 ? (
          <div className="col-span-full py-20 text-center italic text-gray-400 bg-white rounded-[3rem] border-2 border-dashed border-gold-200 font-serif">
            Belum ada ide tercatat atau tidak ditemukan. Yuk, tulis inspirasi kita!
          </div>
        ) : ideas.map(idea => {
          const isOwner = (idea.created_by || '').toLowerCase() === (userEmail || '').toLowerCase();
          const authorInitial = (idea.created_by || 'U').charAt(0).toUpperCase();
          const authorName = (idea.created_by || 'User').split('@')[0];
          
          return (
            <div key={idea.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-gold-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full transition-all ${isOwner ? 'bg-maroon' : 'bg-gold'}`}></div>
              
              {idea.is_approved && (
                <div className="absolute top-4 right-4 animate-fade-in">
                    <div className="bg-gold text-maroon px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-maroon shadow-sm flex items-center space-x-1">
                        <CheckCircle2 size={10} />
                        <span>Approved</span>
                    </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-wrap gap-2 pr-12">
                      {idea.categories?.map(cat => (
                          <span key={cat} className="px-3 py-1 bg-gold-50 text-gold-800 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gold-200 flex items-center space-x-1">
                              <Hash size={10} />
                              <span>{cat}</span>
                          </span>
                      ))}
                  </div>
              </div>

              <h3 className="text-xl font-serif font-black text-maroon-900 mb-4 leading-tight group-hover:text-maroon transition-colors">{idea.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6 italic line-clamp-3">"{idea.content}"</p>

              {/* MEDIA INDICATORS */}
              <div className="flex space-x-4 mb-6">
                {idea.image_urls?.length > 0 && (
                  <div className="flex items-center space-x-1 text-gold-700 text-[10px] font-black uppercase tracking-widest bg-gold-50 px-3 py-1 rounded-lg border border-gold-200">
                    <ImageIcon size={12} />
                    <span>{idea.image_urls.length} Foto</span>
                  </div>
                )}
                {idea.pdf_url && (
                  <div className="flex items-center space-x-1 text-gold-700 text-[10px] font-black uppercase tracking-widest bg-gold-50 px-3 py-1 rounded-lg border border-gold-200">
                    <FileText size={12} />
                    <span>PDF</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center space-x-2 mb-6">
                    <button onClick={() => handlePreview(idea)} className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gold-50 hover:text-gold-700 transition-all flex items-center justify-center space-x-2 border border-transparent hover:border-gold-200">
                        <Eye size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Detail</span>
                    </button>
                    
                    {!isOwner && (
                        <button 
                            onClick={() => openApproveConfirm(idea)} 
                            className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center space-x-2 border shadow-sm
                                ${idea.is_approved 
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                        >
                            {idea.is_approved ? <Ban size={16} /> : <ThumbsUp size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {idea.is_approved ? 'Revoke' : 'Approve'}
                            </span>
                        </button>
                    )}

                    {isOwner && (
                        <div className="flex space-x-2">
                          <button onClick={() => handleOpenModal(idea)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 border border-blue-100"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(idea.id, idea.title)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100"><Trash2 size={16} /></button>
                        </div>
                    )}
              </div>

              {/* AUTHOR INFO */}
              <div className="pt-6 border-t border-gold-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border shadow-sm ${isOwner ? 'bg-maroon text-gold border-gold' : 'bg-gold text-maroon border-maroon'}`}>
                          {authorInitial}
                      </div>
                      <div>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">From By</p>
                          <p className="text-xs font-black text-maroon uppercase">{authorName}</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <Calendar size={14} className="text-gold ml-auto mb-1" />
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{new Date(idea.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION FOOTER */}
      <div className="bg-maroon-900 px-8 py-5 rounded-[2rem] flex items-center justify-between border-t border-gold-400 shadow-2xl">
        <div className="text-xs font-black text-gold uppercase tracking-[0.2em]">Menampilkan {ideas.length} dari {totalCount} ide inspirasi</div>
        <div className="flex items-center space-x-4">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronLeft size={20} /></button>
          <span className="text-sm font-black text-gold uppercase tracking-widest px-4 border-x border-gold/30">Halaman {page + 1}</span>
          <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* FORM MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingIdea ? 'Edit' : 'Tulis'} Ide Inspirasi`}>
        <form onSubmit={handleSubmit} className="space-y-6 pb-10">
            <div className="space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Judul Ide / Nama Konsep</label>
                <input required type="text" className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Kategori (Enter untuk pisah)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {formData.categories.map(cat => (
                        <span key={cat} className="px-4 py-2 bg-maroon text-gold rounded-xl flex items-center space-x-2 font-bold text-xs shadow-md border border-gold-400">
                            <span>{cat}</span>
                            <button type="button" onClick={() => removeTag(cat)} className="hover:text-white"><X size={14} /></button>
                        </span>
                    ))}
                </div>
                <input 
                    type="text" 
                    placeholder="Ketik lalu Enter..."
                    className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Isi Ide / Detail Ceritanya</label>
                <textarea 
                    required 
                    className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-3xl h-32 font-bold text-maroon shadow-sm outline-none focus:border-maroon transition-all resize-none" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Upload Foto (Max 5)</label>
                <input type="file" multiple accept="image/*" onChange={e => handleFileUpload(e, 'img')} className="text-xs text-maroon p-2 border-2 border-dashed border-maroon-100 rounded-lg w-full" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.image_urls.map((url, i) => (
                    <div key={i} className="relative w-12 h-12">
                      <img src={url} className="w-full h-full object-cover rounded-lg border border-gold-300" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Upload PDF Konsep</label>
                <input type="file" accept="application/pdf" onChange={e => handleFileUpload(e, 'pdf')} className="text-xs text-maroon p-2 border-2 border-dashed border-maroon-100 rounded-lg w-full" />
                {formData.pdf_url && <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ PDF Terupload</div>}
              </div>
            </div>

            <button disabled={submitting} type="submit" className="w-full bg-maroon text-gold py-5 rounded-[2rem] font-black shadow-2xl border-4 border-gold-400 uppercase tracking-[0.3em] hover:bg-maroon-900 transition-all flex items-center justify-center space-x-3 active:scale-95">
                {submitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                <span>Simpan ke Papan Ide</span>
            </button>
        </form>
      </Modal>

      {/* PREVIEW MODAL WITH COMMENTS */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Detail Inspirasi">
        {previewingIdea && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                    {previewingIdea.categories?.map(cat => (
                        <span key={cat} className="px-3 py-1 bg-gold-50 text-gold-800 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gold-200">#{cat}</span>
                    ))}
                </div>
                {previewingIdea.is_approved && (
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 size={12} />
                        <span>Disetujui Pasangan</span>
                    </div>
                )}
            </div>
            
            <h2 className="text-3xl font-serif font-black text-maroon leading-tight">{previewingIdea.title}</h2>
            
            <div className="p-8 bg-stone-50 rounded-[2.5rem] border-2 border-gold-100 shadow-inner">
                <p className="text-gray-700 leading-relaxed italic text-lg whitespace-pre-wrap font-medium">"{previewingIdea.content}"</p>
            </div>

            {/* MEDIA SECTION */}
            {(previewingIdea.image_urls?.length > 0 || previewingIdea.pdf_url) && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-maroon uppercase tracking-[0.2em] border-b border-gold-200 pb-2">Lampiran Media</h4>
                
                <div className="flex space-x-4">
                  {previewingIdea.image_urls?.length > 0 && (
                    <button onClick={() => { setGalleryPhotos(previewingIdea.image_urls); setIsGalleryOpen(true); }} className="flex-1 p-4 bg-gold-50 border-2 border-gold-200 rounded-2xl flex items-center justify-center space-x-3 hover:bg-gold-100 transition-all">
                      <ImageIcon className="text-gold-700" />
                      <span className="text-xs font-black text-gold-800 uppercase tracking-widest">Lihat Galeri ({previewingIdea.image_urls.length})</span>
                    </button>
                  )}
                  {previewingIdea.pdf_url && (
                    <button onClick={() => { setPreviewPdfUrl(previewingIdea.pdf_url!); setIsPreviewOpen(false); setTimeout(() => setIsGalleryOpen(true), 100); }} className="flex-1 p-4 bg-gold-50 border-2 border-gold-200 rounded-2xl flex items-center justify-center space-x-3 hover:bg-gold-100 transition-all">
                      <FileText className="text-gold-700" />
                      <span className="text-xs font-black text-gold-800 uppercase tracking-widest">Lihat Dokumen PDF</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* COMMENT SECTION */}
            <div className="space-y-6 pt-6 border-t-2 border-gold-100">
                <div className="flex items-center space-x-2">
                    <MessageCircle className="text-maroon" size={20} />
                    <h4 className="text-lg font-serif font-bold text-maroon">Diskusi Kita</h4>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingComments ? (
                        <div className="text-center py-10 italic text-gray-400">Memuat diskusi...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10 italic text-gray-400 bg-gray-50 rounded-2xl">Belum ada komentar. Yuk mulai diskusi!</div>
                    ) : comments.map((c) => {
                        const isMe = (c.user_email || '').toLowerCase() === (userEmail || '').toLowerCase();
                        const userName = (c.user_email || 'User').split('@')[0].toUpperCase();
                        
                        return (
                            <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] p-4 rounded-3xl shadow-sm border ${
                                    isMe 
                                        ? 'bg-maroon text-gold-50 rounded-tr-none border-maroon-800' 
                                        : 'bg-white text-maroon-900 rounded-tl-none border-gold-100'
                                }`}>
                                    {/* Quote Box */}
                                    {c.parent_content && (
                                        <div className={`mb-2 p-2 rounded-xl text-[10px] italic border-l-4 ${
                                            isMe ? 'bg-maroon-800 border-gold/40 text-gold-200' : 'bg-gray-50 border-maroon/20 text-gray-400'
                                        }`}>
                                            <p className="line-clamp-2">"{c.parent_content}"</p>
                                        </div>
                                    )}

                                    <div className="text-sm font-medium leading-relaxed mb-2">{c.content}</div>
                                    
                                    <div className={`flex items-center space-x-3 border-t pt-2 ${isMe ? 'border-maroon-800' : 'border-gold-50'}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-gold' : 'text-maroon-400'}`}>By {userName}</p>
                                        <p className="text-[8px] opacity-40 uppercase tracking-widest font-bold">
                                            {new Date(c.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <button 
                                          onClick={() => {
                                            setReplyingTo(c);
                                            const input = document.getElementById('comment-input');
                                            input?.focus();
                                          }}
                                          className={`p-1 rounded-lg transition-colors ${isMe ? 'hover:bg-maroon-800 text-gold' : 'hover:bg-gray-100 text-maroon'}`}
                                          title="Balas"
                                        >
                                          <Reply size={12} />
                                        </button>
                                        {isMe && (
                                            <button onClick={() => handleDeleteComment(c.id)} className="p-1 hover:bg-maroon-800 text-red-300 rounded-lg transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Comment Input */}
                <form onSubmit={handlePostComment} className="space-y-3">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-gold-50 p-3 rounded-2xl border border-gold-200 animate-slide-up">
                            <div className="flex items-center space-x-2">
                                <CornerDownRight size={14} className="text-gold-700" />
                                <p className="text-[10px] font-bold text-gold-800 uppercase tracking-widest">
                                    Membalas comment: <span className="italic font-medium text-gold-600 line-clamp-1">"{replyingTo.content}"</span>
                                </p>
                            </div>
                            <button type="button" onClick={() => setReplyingTo(null)} className="text-maroon hover:bg-gold-100 p-1 rounded-full"><X size={14} /></button>
                        </div>
                    )}
                    <div className="relative group">
                        <textarea 
                            id="comment-input"
                            required
                            placeholder="Tulis pendapatmu sayang..." 
                            className="w-full pl-6 pr-16 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-maroon text-maroon-900 font-medium placeholder:italic shadow-inner resize-none h-20"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                        />
                        <button type="submit" className="absolute right-3 bottom-3 bg-maroon text-gold p-3 rounded-xl hover:bg-maroon-800 transition-all shadow-lg active:scale-95 border border-gold-400">
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-gold-100">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-maroon text-gold rounded-full flex items-center justify-center font-black border border-gold shadow-md">
                        {(previewingIdea.created_by || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-xs font-black text-maroon uppercase">{(previewingIdea.created_by || 'User').split('@')[0]}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Penulis Ide</p>
                    </div>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="px-10 py-4 bg-maroon text-gold rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl border-2 border-gold-400 hover:bg-maroon-900 transition-all">Tutup Pratinjau</button>
            </div>
          </div>
        )}
      </Modal>

      {/* GALLERY/PDF MODAL */}
      <Modal 
        isOpen={isGalleryOpen} 
        onClose={() => { setIsGalleryOpen(false); setPreviewPdfUrl(null); }} 
        title={previewPdfUrl ? "Pratinjau Dokumen" : "Galeri Inspirasi"}
        maxWidth="max-w-5xl"
      >
        {previewPdfUrl ? (
          <div className="w-full h-[75vh]">
            <iframe src={previewPdfUrl} className="w-full h-full rounded-2xl border-4 border-maroon-50 shadow-inner" />
          </div>
        ) : (
          <div className="flex flex-col space-y-8 pb-10">
            {galleryPhotos.map((url, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <div className="bg-stone-50 p-2 rounded-3xl border-2 border-gold-100 shadow-sm overflow-hidden flex items-center justify-center">
                  <img 
                    src={url} 
                    className="w-full max-h-[85vh] object-contain rounded-2xl" 
                    alt={`Inspirasi ${i+1}`}
                  />
                </div>
                <p className="text-[10px] font-black text-maroon-400 uppercase tracking-[0.5em] text-center italic">Foto Inspirasi {i + 1} / {galleryPhotos.length}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* APPROVAL CONFIRM MODAL */}
      <Modal 
        isOpen={isApproveConfirmOpen} 
        onClose={() => setIsApproveConfirmOpen(false)} 
        title={ideaToApprove?.is_approved ? "Batalkan Persetujuan?" : "Setujui Ide Pasangan?"}
      >
        <div className="text-center space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-xl ${ideaToApprove?.is_approved ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {ideaToApprove?.is_approved ? <Ban size={40} /> : <ThumbsUp size={40} />}
            </div>
            
            <div>
                <h3 className="text-xl font-serif font-bold text-maroon mb-2">
                    {ideaToApprove?.is_approved 
                        ? 'Apakah ide ini perlu didiskusikan kembali?' 
                        : 'Apakah kamu setuju dengan ide ini?'}
                </h3>
                <p className="text-sm text-gray-500 italic max-w-sm mx-auto">
                    "{ideaToApprove?.title}"
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setIsApproveConfirmOpen(false)} 
                    className="py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                    Kembali
                </button>
                <button 
                    onClick={handleToggleApprove} 
                    className={`py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 
                        ${ideaToApprove?.is_approved ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                    {ideaToApprove?.is_approved ? 'Ya, Batalkan' : 'Ya, Setuju!'}
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Ideas;
