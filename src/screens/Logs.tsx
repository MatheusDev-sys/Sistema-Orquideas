import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Log } from '../types';
import { Loader2, ClipboardList, Search, Calendar } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.orchid_code?.toLowerCase().includes(search.toLowerCase()) ||
    l.orchid_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.message?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'SOLD': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'DELETE': return 'bg-red-50 text-red-600 border-red-100';
      case 'RESET_EVENT': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-stone-50 text-stone-600 border-stone-100';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 pb-24">
      <header className="bg-white px-6 py-8 border-b border-stone-100 space-y-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <ClipboardList className="text-emerald-600" size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-800 tracking-tight">Auditoria</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por ação, código ou nome..."
            className="w-full pl-12 pr-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-800 shadow-sm"
          />
        </div>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-stone-400 text-sm font-medium">Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-100 shadow-sm">
            <p className="text-stone-400 text-sm italic">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={log.id}
                className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-300">
                    <Calendar size={12} />
                    <span className="text-[10px] font-medium">{formatDate(log.created_at)}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-stone-700 text-sm font-medium leading-relaxed">{log.message}</p>
                  {(log.orchid_name || log.orchid_code) && (
                    <div className="mt-2 flex gap-2">
                      {log.orchid_code && (
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                          {log.orchid_code}
                        </span>
                      )}
                      {log.orchid_name && (
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md uppercase tracking-widest truncate max-w-[150px]">
                          {log.orchid_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
