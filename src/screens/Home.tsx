import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Orchid, Log } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Camera, X, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';

// --- Register Form Component ---
const RegisterForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    suggestNextCode();
  }, []);

  const suggestNextCode = async () => {
    try {
      const { data, error } = await supabase
        .from('orchids')
        .select('code')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastCode = data[0].code;
        // Try to find numbers in the code
        const match = lastCode.match(/\d+/);
        if (match) {
          const number = parseInt(match[0]);
          const nextNumber = (number + 1).toString().padStart(match[0].length, '0');
          const nextCode = lastCode.replace(match[0], nextNumber);
          setCode(nextCode);
        } else {
          // If no numbers, just append -001 or something? 
          // But usually codes are like ORQ-001
          setCode(lastCode + '-001');
        }
      } else {
        setCode('ORQ-001');
      }
    } catch (err) {
      console.error('Error suggesting code:', err);
      setCode('ORQ-001');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file as Blob));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (images.length === 0) {
      setError('Adicione pelo menos uma foto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get current event_id
      const { data: appState, error: stateError } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', 'current_event_id')
        .single();

      if (stateError) throw stateError;
      const eventId = appState.value.id;

      // 2. Compress and Upload images
      const photoUrls: string[] = [];
      const orchidId = crypto.randomUUID();

      const compressionOptions = {
        maxSizeMB: 0.1, // 100KB
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };

      for (const image of images) {
        const compressedFile = await imageCompression(image, compressionOptions);
        
        const fileExt = 'jpg'; // We can force jpg after compression
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `event/${eventId}/orchids/${orchidId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('orchid_photos')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('orchid_photos')
          .getPublicUrl(filePath);

        photoUrls.push(publicUrl);
      }

      // 3. Create orchid record
      const { error: orchidError } = await supabase
        .from('orchids')
        .insert({
          id: orchidId,
          event_id: eventId,
          name,
          code,
          price: parseFloat(price.replace(',', '.')),
          photo_urls: photoUrls,
          created_by: user.id,
          status: 'in_stock'
        });

      if (orchidError) throw orchidError;

      // 4. Create log
      await supabase.from('logs').insert({
        event_id: eventId,
        user_id: user.id,
        action: 'CREATE',
        orchid_id: orchidId,
        orchid_code: code,
        orchid_name: name,
        message: `Orquídea ${code} cadastrada`
      });

      // Reset form
      setName('');
      setPrice('');
      setImages([]);
      setPreviews([]);
      suggestNextCode(); // Suggest next code after success
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar orquídea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 pb-12">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 ml-1">
            Nome da Orquídea
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-800 shadow-sm"
            placeholder="Ex: Phalaenopsis Branca"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 ml-1">
              Código
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-800 shadow-sm uppercase"
              placeholder="ORQ-001"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 ml-1">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-800 shadow-sm"
              placeholder="0,00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5 ml-1">
            Fotos
          </label>
          <div className="grid grid-cols-3 gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-sm"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-stone-50/50">
              <Camera size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Adicionar</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Salvando Orquídea...
          </>
        ) : (
          <>
            <Plus size={20} />
            Cadastrar Orquídea
          </>
        )}
      </button>
    </form>
  );
};

// --- Orchid List Component ---
const OrchidList: React.FC = () => {
  const [orchids, setOrchids] = useState<Orchid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'sold'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrchids();
  }, []);

  const fetchOrchids = async () => {
    try {
      const { data, error } = await supabase
        .from('orchids')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrchids(data || []);
    } catch (error) {
      console.error('Error fetching orchids:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrchids = orchids.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) || 
                          o.code.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || o.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
      <p className="text-stone-400 text-sm font-medium">Carregando estoque...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-12 pr-5 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-800 shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['all', 'in_stock', 'sold'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                filter === f 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" 
                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
              )}
            >
              {f === 'all' ? 'Todas' : f === 'in_stock' ? 'Em Estoque' : 'Vendidas'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrchids.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-100 shadow-sm">
            <p className="text-stone-400 text-sm italic">Nenhuma orquídea encontrada.</p>
          </div>
        ) : (
          filteredOrchids.map((orchid) => (
            <motion.div
              layout
              key={orchid.id}
              onClick={() => navigate(`/item/${orchid.id}`)}
              className="bg-white rounded-3xl p-4 flex gap-4 border border-stone-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-50">
                {orchid.photo_urls[0] ? (
                  <img src={orchid.photo_urls[0]} alt={orchid.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Camera size={24} />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between py-1 flex-grow">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif font-bold text-stone-800 leading-tight line-clamp-1">{orchid.name}</h3>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter",
                      orchid.status === 'in_stock' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {orchid.status === 'in_stock' ? 'Estoque' : 'Vendida'}
                    </span>
                  </div>
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{orchid.code}</p>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-emerald-700 font-bold text-lg tracking-tight">
                    {formatCurrency(orchid.price)}
                  </span>
                  <span className="text-stone-300 text-[9px] font-medium">
                    {formatDate(orchid.created_at).split(' ')[0]}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Main Home Screen ---
export const Home: React.FC = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('list');
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="bg-white px-6 py-6 border-b border-stone-100 flex flex-col gap-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-stone-800 tracking-tight">MathFlower</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => signOut()}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className={cn("text-emerald-600 transition-all", showSuccess ? "scale-100 opacity-100" : "scale-0 opacity-0")} size={24} />
            </div>
          </div>
        </div>
        
        <div className="flex p-1 bg-stone-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400"
            )}
          >
            Estoque
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'register' ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400"
            )}
          >
            Novo Cadastro
          </button>
        </div>
      </header>

      <main className="flex-1 bg-stone-50">
        <AnimatePresence mode="wait">
          {activeTab === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <OrchidList />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <RegisterForm onSuccess={handleSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-6 right-6 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-600/40 flex items-center justify-center gap-3 z-[100]"
        >
          <CheckCircle2 size={24} />
          <span className="font-bold uppercase tracking-widest text-xs">Orquídea Salva com Sucesso!</span>
        </motion.div>
      )}
    </div>
  );
};
