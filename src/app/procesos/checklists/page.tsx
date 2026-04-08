'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CHECKLIST_CATEGORIES, ChecklistTemplate } from '@/types/checklists';
import { ClipboardList, Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'otro' as keyof typeof CHECKLIST_CATEGORIES,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checklists/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/checklists/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          campos: [],
          activo: true,
        }),
      });

      if (res.ok) {
        await loadTemplates();
        setShowCreateDialog(false);
        setFormData({ nombre: '', descripcion: '', categoria: 'otro' });
      }
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Estas seguro de eliminar esta plantilla?')) return;

    try {
      await fetch(`/api/checklists/templates/${id}?permanent=true`, {
        method: 'DELETE',
      });
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <ModulePageShell contentClassName="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell contentClassName="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Checklists de Calidad"
          description="Gestion de plantillas para inspecciones, controles y verificaciones."
          breadcrumbs={[
            { label: 'Procesos', href: '/procesos' },
            { label: 'Checklists' },
          ]}
          className="p-0"
        />
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Plantillas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {templates.length}
                </p>
              </div>
              <ClipboardList className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        {Object.entries(CHECKLIST_CATEGORIES)
          .slice(0, 3)
          .map(([key, cat]) => (
            <Card key={key} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{cat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.categoria === key).length}
                    </p>
                  </div>
                  <span className="text-2xl">{cat.icon}</span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {templates.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No hay plantillas
            </h3>
            <p className="mb-4 text-gray-600">
              Crea tu primera plantilla de checklist para comenzar.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => {
            const category =
              CHECKLIST_CATEGORIES[
                template.categoria as keyof typeof CHECKLIST_CATEGORIES
              ] || CHECKLIST_CATEGORIES.otro;

            return (
              <Card
                key={template.id}
                className="border-0 shadow-md transition-all hover:shadow-lg"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.nombre}</CardTitle>
                      <Badge className={`${category.color} mt-1`}>
                        {category.icon} {category.label}
                      </Badge>
                    </div>
                    {template.codigo && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {template.codigo}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                    {template.descripcion || 'Sin descripcion'}
                  </p>
                  <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                    <span>{template.campos.length} campos</span>
                    <span>v{template.version}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/procesos/checklists/${template.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="mr-1 h-3 w-3" />
                        Ver/Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Plantilla de Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={e =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej. Inspeccion de Recepcion"
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={e =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe el proposito de este checklist..."
                rows={2}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    categoria: value as keyof typeof CHECKLIST_CATEGORIES,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHECKLIST_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={creating || !formData.nombre.trim()}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Plantilla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
