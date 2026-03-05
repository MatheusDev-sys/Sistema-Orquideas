import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Orchid } from '../types';
import { useAuth } from '../context/AuthContext';
import { Settings, Loader2, AlertTriangle, RefreshCw, BarChart3, Package, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

export const Admin: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    sold: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('orchids')
        .select('*');

      if (error) throw error;

      const total = data?.length || 0;
      const inStock = data?.filter(o => o.status === 'in_stock').length || 0;
      const sold = data?.filter(o => o.status === 'sold').length || 0;
      const totalValue = data?.reduce((acc, o) => acc + Number(o.price), 0) || 0;

      setStats({ total, inStock, sold, totalValue });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirmText !== 'ENCERRAR') return;
    setResetLoading(true);

    try {
      const { data, error } = await supabase.rpc('reset_event');

      if (error) throw error;

      // Refresh stats
      await fetchStats();
      setShowResetModal(false);
      setConfirmText('');
      alert('Evento encerrado com sucesso! O sistema está pronto para a próxima data.');
    } catch (error: any) {
      console.error('Error resetting event:', error);
      alert(error.message || 'Erro ao encerrar evento');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
      <p className="text-stone-400 text-sm font-medium">Carregando estatísticas...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 pb-24">
      <header className="bg-white px-6 py-8 border-b border-stone-100 space-y-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Settings className="text-emerald-600" size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-800 tracking-tight">Painel Admin</h1>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Cadastradas</p>
              <p className="text-2xl font-bold text-stone-800 tracking-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Em Estoque</p>
              <p className="text-2xl font-bold text-emerald-600 tracking-tight">{stats.inStock}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Vendidas</p>
              <p className="text-2xl font-bold text-blue-600 tracking-tight">{stats.sold}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Valor em Estoque</p>
              <p className="text-xl font-bold text-emerald-700 tracking-tight">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>

        {/* Critical Actions */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] ml-1">Ações Críticas</h3>
          <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h4 className="text-red-900 font-bold text-sm">Encerrar Data Comemorativa</h4>
                <p className="text-red-700/70 text-xs leading-relaxed mt-1">
                  Esta ação irá apagar permanentemente todas as orquídeas e logs do evento atual. Use apenas ao final de uma campanha.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Encerrar Evento
            </button>
          </div>
        </div>
      </main>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-red-600" size={32} />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-800">Confirmar Encerramento</h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  Para confirmar que deseja apagar todos os dados e iniciar um novo evento, digite <span className="font-black text-red-600">ENCERRAR</span> abaixo:
                </p>
              </div>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite ENCERRAR"
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-center font-black tracking-widest text-red-600"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setConfirmText('');
                  }}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={confirmText !== 'ENCERRAR' || resetLoading}
                  onClick={handleReset}
                  className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
