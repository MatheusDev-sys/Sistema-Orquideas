import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Orchid } from '../types';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Camera, Loader2, CheckCircle2, Trash2, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency, formatDate } from '../lib/utils';

export const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [orchid, setOrchid] = useState<Orchid | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id) fetchOrchid();
  }, [id]);

  const fetchOrchid = async () => {
    try {
      const { data, error } = await supabase
        .from('orchids')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrchid(data);
    } catch (error) {
      console.error('Error fetching orchid:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!orchid || !user) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('orchids')
        .update({ status: 'sold' })
        .eq('id', orchid.id);

      if (error) throw error;

      // Create log
      await supabase.from('logs').insert({
        event_id: orchid.event_id,
        user_id: user.id,
        action: 'SOLD',
        orchid_id: orchid.id,
        orchid_code: orchid.code,
        orchid_name: orchid.name,
        message: `Orquídea ${orchid.code} marcada como vendida`
      });

      setOrchid({ ...orchid, status: 'sold' });
    } catch (error) {
      console.error('Error marking as sold:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orchid || !user || !profile?.is_admin) return;
    
    setActionLoading(true);

    try {
      // 1. Delete photos from storage first
      if (orchid.photo_urls && orchid.photo_urls.length > 0) {
        const paths = orchid.photo_urls.map(url => {
          // Extract path from Supabase URL
          // URL format: .../storage/v1/object/public/orchid_photos/event/UUID/orchids/UUID/file.jpg
          const parts = url.split('/orchid_photos/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(p => p !== null) as string[];

        if (paths.length > 0) {
          await supabase.storage.from('orchid_photos').remove(paths);
        }
      }

      // 2. Delete from database
      const { error } = await supabase
        .from('orchids')
        .delete()
        .eq('id', orchid.id);

      if (error) throw error;

      // Create log
      await supabase.from('logs').insert({
        event_id: orchid.event_id,
        user_id: user.id,
        action: 'DELETE',
        orchid_id: orchid.id,
        orchid_code: orchid.code,
        orchid_name: orchid.name,
        message: `Orquídea ${orchid.code} excluída`
      });

      navigate('/');
    } catch (error) {
      console.error('Error deleting orchid:', error);
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
      <p className="text-stone-400 text-sm font-medium">Carregando detalhes...</p>
    </div>
  );

  if (!orchid) return null;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 pb-24">
      <header className="sticky top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-stone-100">
        <button
          onClick={handleBack}
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-stone-100 flex items-center justify-center text-stone-600 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Detalhes do Item</h2>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <main className="mt-4 px-6 space-y-8">
        {/* Photo Carousel */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-stone-100 shadow-xl shadow-stone-200/50 relative">
            {orchid.photo_urls[activePhoto] ? (
              <img src={orchid.photo_urls[activePhoto]} alt={orchid.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200">
                <Camera size={64} />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <span className={cn(
                "text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest shadow-lg",
                orchid.status === 'in_stock' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              )}>
                {orchid.status === 'in_stock' ? 'Em Estoque' : 'Vendida'}
              </span>
            </div>
          </div>
          
          {orchid.photo_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {orchid.photo_urls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setActivePhoto(index)}
                  className={cn(
                    "w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all",
                    activePhoto === index ? "border-emerald-500 scale-105" : "border-transparent opacity-50"
                  )}
                >
                  <img src={url} alt={`Photo ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-800 leading-tight">{orchid.name}</h1>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">{orchid.code}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-700 tracking-tight">
                {formatCurrency(orchid.price)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Cadastrado em</span>
              <span className="text-stone-700 font-medium text-sm">{formatDate(orchid.created_at)}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Status Atual</span>
              <span className={cn(
                "font-bold text-sm uppercase tracking-tighter",
                orchid.status === 'in_stock' ? "text-emerald-600" : "text-red-600"
              )}>
                {orchid.status === 'in_stock' ? 'Disponível' : 'Vendido'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          {orchid.status === 'in_stock' && !showDeleteConfirm && (
            <button
              onClick={handleMarkAsSold}
              disabled={actionLoading}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <ShoppingBag size={24} />
                  Marcar como Vendida
                </>
              )}
            </button>
          )}

          {(profile?.is_admin || orchid.created_by === user?.id) && (
            <div className="space-y-3">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={actionLoading}
                  className="w-full py-5 bg-white text-red-600 font-bold rounded-2xl border border-red-100 shadow-sm hover:bg-red-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Trash2 size={20} />
                  Excluir Registro
                </button>
              ) : (
                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-4">
                  <p className="text-red-800 text-sm font-bold text-center">Tem certeza que deseja excluir? Esta ação é irreversível.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-4 bg-white text-stone-600 font-bold rounded-xl border border-stone-200 shadow-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="flex-1 py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sim, Excluir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
