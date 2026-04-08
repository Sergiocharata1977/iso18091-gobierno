'use client';

import { useAuth } from '@/contexts/AuthContext';
import { sendConverseRequest } from '@/lib/ai/converseClient';
import { AnalisisFODA } from '@/types/analisis-foda';
import { Bot, Filter, Loader2, Plus, Target, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function buildFodaPrompt(item: AnalisisFODA): string {
  const f = item.fortalezas.slice(0, 8).map(x => `- ${x.descripcion}`).join('\n');
  const o = item.oportunidades.slice(0, 8).map(x => `- ${x.descripcion}`).join('\n');
  const d = item.debilidades.slice(0, 8).map(x => `- ${x.descripcion}`).join('\n');
  const a = item.amenazas.slice(0, 8).map(x => `- ${x.descripcion}`).join('\n');

  return `Analiza este FODA estratégico (${item.tipo_analisis}) titulado "${item.titulo}".

FORTALEZAS:
${f || '(no registradas)'}

OPORTUNIDADES:
${o || '(no registradas)'}

DEBILIDADES:
${d || '(no registradas)'}

AMENAZAS:
${a || '(no registradas)'}

Necesito:
1. Resumen ejecutivo en 2-3 líneas.
2. Los 3 cruces estratégicos más importantes (FO, FA, DO o DA).
3. Las 2-3 prioridades de acción más urgentes.
4. Riesgos críticos que no se pueden ignorar.
Sé concreto y accionable. No repitas los datos, interprétalos.`;
}

export default function AnalisisFODAPage() {
  const { user } = useAuth();
  const organizationId = user?.organization_id ?? '';

  const [analisis, setAnalisis] = useState<AnalisisFODA[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingAnalisis, setEditingAnalisis] = useState<AnalisisFODA | null>(null);
  const [formData, setFormData] = useState<{
    titulo: string;
    tipo_analisis: 'organizacional' | 'proceso' | 'departamento' | 'proyecto';
    descripcion: string;
    fortalezas: string;
    oportunidades: string;
    debilidades: string;
    amenazas: string;
    fecha_analisis: string;
    estado: 'en_proceso' | 'completado' | 'archivado';
  }>({
    titulo: '',
    tipo_analisis: 'organizacional',
    descripcion: '',
    fortalezas: '',
    oportunidades: '',
    debilidades: '',
    amenazas: '',
    fecha_analisis: new Date().toISOString().split('T')[0],
    estado: 'en_proceso',
  });

  // IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Matriz
  const [matrixItem, setMatrixItem] = useState<AnalisisFODA | null>(null);

  useEffect(() => {
    if (organizationId) loadAnalisis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, organizationId]);

  const loadAnalisis = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('estado', filter);
      const response = await fetch(`/api/analisis-foda?${params}`);
      const data = await response.json();
      setAnalisis(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error loading analisis:', error);
      setAnalisis([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWithAI = async (item: AnalisisFODA) => {
    if (!user?.id || !organizationId) return;
    setAiAnalyzingId(item.id);
    setAiLoading(true);
    setAiResult(null);
    setShowAiPanel(true);

    try {
      const sessionResponse = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type: 'assistant', module: 'analisis-foda' }),
      });
      const sessionJson = await sessionResponse.json();
      const sessionId = sessionJson?.session?.id as string | undefined;
      if (!sessionId) throw new Error('No se pudo crear sesión de análisis');

      const aiResponse = await sendConverseRequest({
        channel: 'chat',
        message: buildFodaPrompt(item),
        organizationId,
        sessionId,
        pathname: '/analisis-foda',
      });

      const lastMessage = Array.isArray(aiResponse.messages)
        ? [...aiResponse.messages].reverse().find(m => m.role === 'assistant')
        : null;

      setAiResult(lastMessage?.content ?? 'No se obtuvo respuesta del análisis.');
    } catch (err) {
      console.error('Error analizando con IA:', err);
      setAiResult('Error al conectar con Don Cándido. Intente nuevamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      en_proceso: 'bg-yellow-100 text-yellow-800',
      completado: 'bg-green-100 text-green-800',
      archivado: 'bg-gray-100 text-gray-800',
    };
    return colors[estado as keyof typeof colors] || colors.en_proceso;
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      organizacional: 'Organizacional',
      proceso: 'Proceso',
      departamento: 'Departamento',
      proyecto: 'Proyecto',
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const handleCreate = () => {
    setEditingAnalisis(null);
    setFormData({
      titulo: '',
      tipo_analisis: 'organizacional',
      descripcion: '',
      fortalezas: '',
      oportunidades: '',
      debilidades: '',
      amenazas: '',
      fecha_analisis: new Date().toISOString().split('T')[0],
      estado: 'en_proceso',
    });
    setShowDialog(true);
  };

  const handleEdit = (item: AnalisisFODA) => {
    setEditingAnalisis(item);
    setFormData({
      titulo: item.titulo,
      tipo_analisis: item.tipo_analisis,
      descripcion: item.descripcion || '',
      fortalezas: item.fortalezas.map(x => x.descripcion).join('\n'),
      oportunidades: item.oportunidades.map(x => x.descripcion).join('\n'),
      debilidades: item.debilidades.map(x => x.descripcion).join('\n'),
      amenazas: item.amenazas.map(x => x.descripcion).join('\n'),
      fecha_analisis: item.fecha_analisis.split('T')[0],
      estado: item.estado,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAnalisis
        ? `/api/analisis-foda/${editingAnalisis.id}`
        : '/api/analisis-foda';
      const method = editingAnalisis ? 'PUT' : 'POST';

      const toItems = (raw: string) =>
        raw.split('\n').filter(l => l.trim()).map(l => ({ descripcion: l.trim(), impacto: 'medio' as const }));
      const toItemsConProb = (raw: string) =>
        raw.split('\n').filter(l => l.trim()).map(l => ({ descripcion: l.trim(), impacto: 'medio' as const, probabilidad: 'media' as const }));

      const payload = {
        ...formData,
        fortalezas: toItems(formData.fortalezas),
        oportunidades: toItemsConProb(formData.oportunidades),
        debilidades: toItems(formData.debilidades),
        amenazas: toItemsConProb(formData.amenazas),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(editingAnalisis ? 'Análisis actualizado correctamente' : 'Análisis creado correctamente');
        setShowDialog(false);
        loadAnalisis();
      } else {
        const result = await response.json();
        alert(`Error: ${result.error || 'No se pudo guardar el análisis'}`);
      }
    } catch (error) {
      console.error('Error saving analisis:', error);
      alert('Error al guardar el análisis');
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el análisis "${titulo}"?`)) return;
    try {
      const response = await fetch(`/api/analisis-foda/${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Análisis eliminado correctamente');
        loadAnalisis();
      } else {
        const result = await response.json();
        alert(`Error: ${result.error || 'No se pudo eliminar el análisis'}`);
      }
    } catch (error) {
      console.error('Error deleting analisis:', error);
      alert('Error al eliminar el análisis');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Análisis FODA</h1>
          <p className="text-gray-600 mt-1">Fortalezas, Oportunidades, Debilidades y Amenazas</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nuevo Análisis
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-500" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">Todos</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completado">Completados</option>
            <option value="archivado">Archivados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando análisis...</p>
        </div>
      ) : analisis.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay análisis FODA</h3>
          <p className="text-gray-500">Comienza creando tu primer análisis estratégico</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {analisis.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">{item.codigo}</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {getTipoLabel(item.tipo_analisis)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(item.estado)}`}>
                      {item.estado.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.titulo}</h3>
                  {item.descripcion && <p className="text-gray-600 mb-3">{item.descripcion}</p>}
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">{item.fortalezas.length}</div>
                      <div className="text-xs text-green-600">Fortalezas</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">{item.oportunidades.length}</div>
                      <div className="text-xs text-blue-600">Oportunidades</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700">{item.debilidades.length}</div>
                      <div className="text-xs text-yellow-600">Debilidades</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-700">{item.amenazas.length}</div>
                      <div className="text-xs text-red-600">Amenazas</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Fecha: {new Date(item.fecha_analisis).toLocaleDateString()}</span>
                    {item.responsable_nombre && <span>Responsable: {item.responsable_nombre}</span>}
                    {item.participantes.length > 0 && <span>{item.participantes.length} participantes</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-3">
                  <button
                    onClick={() => setMatrixItem(item)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ver Matriz
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleAnalyzeWithAI(item)}
                    disabled={aiLoading && aiAnalyzingId === item.id}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium disabled:opacity-50"
                  >
                    {aiLoading && aiAnalyzingId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Bot size={14} />
                    )}
                    Analizar con IA
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(item.id, item.titulo)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel IA */}
      {showAiPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[70vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center p-5 border-b">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-purple-600" />
                <h2 className="font-semibold text-gray-900">Análisis Don Cándido</h2>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={32} className="animate-spin text-purple-600" />
                  <p className="text-gray-500 text-sm">Don Cándido está analizando el FODA...</p>
                </div>
              ) : aiResult ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{aiResult}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal Matriz FODA 2x2 */}
      {matrixItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{matrixItem.titulo}</h2>
                <p className="text-sm text-gray-500">{getTipoLabel(matrixItem.tipo_analisis)} · {matrixItem.codigo}</p>
              </div>
              <button onClick={() => setMatrixItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Fortalezas */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">F</span>
                    Fortalezas
                    <span className="ml-auto text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">{matrixItem.fortalezas.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {matrixItem.fortalezas.length > 0
                      ? matrixItem.fortalezas.map((f, i) => (
                          <li key={i} className="text-sm text-green-900 flex gap-2">
                            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                            <span>{f.descripcion}</span>
                          </li>
                        ))
                      : <li className="text-sm text-green-500 italic">Sin fortalezas registradas</li>
                    }
                  </ul>
                </div>

                {/* Oportunidades */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">O</span>
                    Oportunidades
                    <span className="ml-auto text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">{matrixItem.oportunidades.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {matrixItem.oportunidades.length > 0
                      ? matrixItem.oportunidades.map((o, i) => (
                          <li key={i} className="text-sm text-blue-900 flex gap-2">
                            <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                            <span>{o.descripcion}</span>
                          </li>
                        ))
                      : <li className="text-sm text-blue-500 italic">Sin oportunidades registradas</li>
                    }
                  </ul>
                </div>

                {/* Debilidades */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold">D</span>
                    Debilidades
                    <span className="ml-auto text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full">{matrixItem.debilidades.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {matrixItem.debilidades.length > 0
                      ? matrixItem.debilidades.map((d, i) => (
                          <li key={i} className="text-sm text-yellow-900 flex gap-2">
                            <span className="text-yellow-500 mt-0.5 shrink-0">!</span>
                            <span>{d.descripcion}</span>
                          </li>
                        ))
                      : <li className="text-sm text-yellow-500 italic">Sin debilidades registradas</li>
                    }
                  </ul>
                </div>

                {/* Amenazas */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">A</span>
                    Amenazas
                    <span className="ml-auto text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full">{matrixItem.amenazas.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {matrixItem.amenazas.length > 0
                      ? matrixItem.amenazas.map((a, i) => (
                          <li key={i} className="text-sm text-red-900 flex gap-2">
                            <span className="text-red-500 mt-0.5 shrink-0">▲</span>
                            <span>{a.descripcion}</span>
                          </li>
                        ))
                      : <li className="text-sm text-red-500 italic">Sin amenazas registradas</li>
                    }
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => { setMatrixItem(null); handleAnalyzeWithAI(matrixItem); }}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
              >
                <Bot size={16} />
                Analizar con IA
              </button>
              <button onClick={() => setMatrixItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Crear/Editar */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-2xl font-bold">
                {editingAnalisis ? 'Editar Análisis FODA' : 'Nuevo Análisis FODA'}
              </h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Análisis FODA Organizacional 2025"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Análisis *</label>
                    <select
                      value={formData.tipo_analisis}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tipo_analisis: e.target.value as 'organizacional' | 'proceso' | 'departamento' | 'proyecto',
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="organizacional">Organizacional</option>
                      <option value="proceso">Proceso</option>
                      <option value="departamento">Departamento</option>
                      <option value="proyecto">Proyecto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Descripción breve del análisis"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <span className="text-xl">💪</span> Fortalezas
                      </h3>
                      <textarea
                        value={formData.fortalezas}
                        onChange={e => setFormData({ ...formData, fortalezas: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={5}
                        placeholder="Ingrese las fortalezas (una por línea)"
                      />
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                        <span className="text-xl">⚠️</span> Debilidades
                      </h3>
                      <textarea
                        value={formData.debilidades}
                        onChange={e => setFormData({ ...formData, debilidades: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={5}
                        placeholder="Ingrese las debilidades (una por línea)"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <span className="text-xl">🎯</span> Oportunidades
                      </h3>
                      <textarea
                        value={formData.oportunidades}
                        onChange={e => setFormData({ ...formData, oportunidades: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={5}
                        placeholder="Ingrese las oportunidades (una por línea)"
                      />
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <span className="text-xl">⚡</span> Amenazas
                      </h3>
                      <textarea
                        value={formData.amenazas}
                        onChange={e => setFormData({ ...formData, amenazas: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={5}
                        placeholder="Ingrese las amenazas (una por línea)"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Análisis *</label>
                    <input
                      type="date"
                      value={formData.fecha_analisis}
                      onChange={e => setFormData({ ...formData, fecha_analisis: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={e =>
                        setFormData({ ...formData, estado: e.target.value as 'en_proceso' | 'completado' | 'archivado' })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="en_proceso">En Proceso</option>
                      <option value="completado">Completado</option>
                      <option value="archivado">Archivado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  {editingAnalisis ? 'Guardar Cambios' : 'Crear Análisis'}
                </button>
                <button type="button" onClick={() => setShowDialog(false)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
