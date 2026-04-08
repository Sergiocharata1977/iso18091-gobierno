'use client';

import { Politica } from '@/types/politicas';
import { FileText, Filter, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PoliticasPage() {
  const router = useRouter();
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolitica, setEditingPolitica] = useState<Politica | null>(null);
  const [formData, setFormData] = useState<{
    codigo: string;
    titulo: string;
    descripcion: string;
    contenido: string;
    estado: 'borrador' | 'en_revision' | 'vigente' | 'obsoleta';
    version: string;
  }>({
    codigo: '',
    titulo: '',
    descripcion: '',
    contenido: '',
    estado: 'borrador',
    version: '1.0',
  });

  useEffect(() => {
    loadPoliticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadPoliticas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ organization_id: 'default-org' });
      if (filter !== 'all') params.append('estado', filter);

      const response = await fetch(`/api/politicas?${params}`);
      const data = await response.json();
      setPoliticas(data);
    } catch (error) {
      console.error('Error loading politicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      vigente: 'bg-green-100 text-green-800',
      borrador: 'bg-gray-100 text-gray-800',
      en_revision: 'bg-yellow-100 text-yellow-800',
      obsoleta: 'bg-red-100 text-red-800',
    };
    return colors[estado as keyof typeof colors] || colors.borrador;
  };

  const handleCreate = () => {
    setEditingPolitica(null);
    setFormData({
      codigo: '',
      titulo: '',
      descripcion: '',
      contenido: '',
      estado: 'borrador',
      version: '1.0',
    });
    setShowDialog(true);
  };

  const handleEdit = (politica: Politica) => {
    setEditingPolitica(politica);
    setFormData({
      codigo: politica.codigo,
      titulo: politica.titulo,
      descripcion: politica.descripcion,
      contenido: politica.contenido || '',
      estado: politica.estado,
      version: politica.version,
    });
    setShowDialog(true);
  };

  const handleView = (id: string) => {
    router.push(`/politicas/${id}`);
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (
      !confirm(`¿Estás seguro de que deseas eliminar la política "${titulo}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/politicas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Política eliminada correctamente');
        loadPoliticas();
      } else {
        const result = await response.json();
        alert(`Error: ${result.error || 'No se pudo eliminar la política'}`);
      }
    } catch (error) {
      console.error('Error deleting politica:', error);
      alert('Error al eliminar la política');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPolitica
        ? `/api/politicas/${editingPolitica.id}`
        : '/api/politicas';
      const method = editingPolitica ? 'PUT' : 'POST';

      console.log('Submitting form:', { url, method, data: formData });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: 'default-org',
        }),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (response.ok) {
        alert(
          editingPolitica
            ? 'Política actualizada correctamente'
            : 'Política creada correctamente'
        );
        setShowDialog(false);
        loadPoliticas();
      } else {
        alert(
          `Error: ${result.error || 'No se pudo guardar la política'}\n${result.details || ''}`
        );
      }
    } catch (error) {
      console.error('Error saving politica:', error);
      alert(
        'Error al guardar la política. Revisa la consola para más detalles.'
      );
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Políticas de Calidad</h1>
          <p className="text-gray-600 mt-1">
            Gestión de políticas del sistema de calidad
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nueva Política
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
            <option value="all">Todas</option>
            <option value="vigente">Vigentes</option>
            <option value="borrador">Borradores</option>
            <option value="en_revision">En Revisión</option>
            <option value="obsoleta">Obsoletas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando políticas...</p>
        </div>
      ) : politicas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay políticas
          </h3>
          <p className="text-gray-500">
            Comienza creando tu primera política de calidad
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {politicas.map(politica => (
            <div
              key={politica.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">
                      {politica.codigo}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(politica.estado)}`}
                    >
                      {politica.estado.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {politica.titulo}
                  </h3>
                  <p className="text-gray-600 mb-3">{politica.descripcion}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Versión {politica.version}</span>
                    {politica.fecha_aprobacion && (
                      <span>
                        Aprobada:{' '}
                        {new Date(
                          politica.fecha_aprobacion
                        ).toLocaleDateString()}
                      </span>
                    )}
                    {politica.aprobador_nombre && (
                      <span>Por: {politica.aprobador_nombre}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(politica.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ver Detalles
                  </button>
                  <button
                    onClick={() => handleEdit(politica)}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(politica.id, politica.titulo)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                  title="Eliminar política"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingPolitica ? 'Editar Política' : 'Nueva Política'}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={e =>
                    setFormData({ ...formData, codigo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="POL-QMS-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Política de Calidad"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={e =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Descripción breve de la política"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido
                </label>
                <textarea
                  value={formData.contenido}
                  onChange={e =>
                    setFormData({ ...formData, contenido: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  rows={8}
                  placeholder="Contenido completo de la política"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        estado: e.target.value as
                          | 'borrador'
                          | 'en_revision'
                          | 'vigente'
                          | 'obsoleta',
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="borrador">Borrador</option>
                    <option value="en_revision">En Revisión</option>
                    <option value="vigente">Vigente</option>
                    <option value="obsoleta">Obsoleta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versión
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={e =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="1.0"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingPolitica ? 'Guardar Cambios' : 'Crear Política'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
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
