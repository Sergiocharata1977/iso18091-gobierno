'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PROCESS_MAP_CONFIG } from '@/lib/processMap/defaultConfig';
import type { ProcessMapConfig } from '@/types/process-map';
import { Network, Save, RotateCcw } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  emerald: 'text-emerald-400 border-emerald-700/40',
  blue: 'text-blue-400 border-blue-700/40',
  violet: 'text-violet-400 border-violet-700/40',
  amber: 'text-amber-400 border-amber-700/40',
};

export default function ConfigurarMapaProcesosPage() {
  const { user } = useAuth();
  const orgId = (user as any)?.organization_id;

  const [config, setConfig] = useState<ProcessMapConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cargar config actual o default
  useEffect(() => {
    if (!orgId) {
      setConfig(structuredClone(DEFAULT_PROCESS_MAP_CONFIG));
      return;
    }
    const ref = doc(db, 'organizations', orgId, 'ui_config', 'process_map');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data() as ProcessMapConfig;
        setConfig(data?.levels?.length ? data : structuredClone(DEFAULT_PROCESS_MAP_CONFIG));
      } else {
        setConfig(structuredClone(DEFAULT_PROCESS_MAP_CONFIG));
      }
    });
    return () => unsub();
  }, [orgId]);

  function toggleItem(levelNum: number, processKey: string, field: 'applies' | 'visible') {
    setConfig(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const level = next.levels.find(l => l.level === levelNum);
      const item = level?.items.find(i => i.processKey === processKey);
      if (item) item[field] = !item[field];
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!orgId || !config) return;
    setSaving(true);
    try {
      const ref = doc(db, 'organizations', orgId, 'ui_config', 'process_map');
      await setDoc(ref, config);
      setSaved(true);
    } catch (e) {
      console.error('[ConfigurarMapa] save error:', e);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(structuredClone(DEFAULT_PROCESS_MAP_CONFIG));
    setSaved(false);
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...config.levels].sort((a, b) => a.level - b.level);

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 md:px-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/30 rounded-lg">
            <Network className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Configurar Mapa de Procesos</h1>
            <p className="text-xs text-slate-500">
              Define qué procesos aplican a esta organización — ISO 9001:2015 cláusula 4.4
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 mb-6 text-xs text-slate-500">
        <span>
          <span className="font-semibold text-slate-400">Visible</span> — se muestra en el mapa aunque no aplique
        </span>
        <span>
          <span className="font-semibold text-emerald-400">Aplica</span> — activo y clickeable para esta organización
        </span>
      </div>

      {/* Niveles */}
      <div className="space-y-5 max-w-3xl">
        {sorted.map(level => {
          const colorClass = LEVEL_COLORS[level.color] ?? LEVEL_COLORS.emerald;
          return (
            <div
              key={level.level}
              className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Level header */}
              <div className={`px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-3`}>
                <span className={`text-[11px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${colorClass}`}>
                  Nivel {level.level}
                </span>
                <span className="text-sm font-semibold text-slate-300">{level.title}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-800/40">
                {[...level.items].sort((a, b) => a.order - b.order).map(item => (
                  <div key={item.processKey} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.applies ? 'text-slate-200' : 'text-slate-500'}`}>
                        {item.label}
                      </p>
                      {item.route && (
                        <p className="text-xs text-slate-600 truncate">{item.route}</p>
                      )}
                    </div>

                    {/* Visible toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 hidden sm:inline">Visible</span>
                      <button
                        onClick={() => toggleItem(level.level, item.processKey, 'visible')}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                          item.visible ? 'bg-slate-600' : 'bg-slate-800 border border-slate-700'
                        }`}
                        title={item.visible ? 'Ocultar del mapa' : 'Mostrar en el mapa'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            item.visible ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Applies toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 hidden sm:inline">Aplica</span>
                      <button
                        onClick={() => toggleItem(level.level, item.processKey, 'applies')}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                          item.applies ? 'bg-emerald-600' : 'bg-slate-800 border border-slate-700'
                        }`}
                        title={item.applies ? 'Marcar como no aplica' : 'Marcar como aplica'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            item.applies ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-[11px] text-slate-600 max-w-3xl">
        Los cambios se guardan en Firestore y se reflejan inmediatamente en el Mapa de Procesos para toda la organización.
      </p>
    </div>
  );
}
