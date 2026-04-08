'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  getAllTemplates,
  getCategories,
  MCPTaskTemplate,
  searchTemplates,
} from '@/services/mcp/templates';
import {
  BarChart,
  ClipboardList,
  Database,
  FileDown,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Plug,
  Search,
  Sheet,
  Sparkles,
  Table,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

interface TaskTemplateSelectorProps {
  onSelect?: (template: MCPTaskTemplate) => void;
  trigger?: React.ReactNode;
}

// Icon mapping
const ICONS: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-5 h-5" />,
  FileSpreadsheet: <FileSpreadsheet className="w-5 h-5" />,
  Sheet: <Sheet className="w-5 h-5" />,
  FileDown: <FileDown className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  Table: <Table className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  BarChart: <BarChart className="w-5 h-5" />,
  Plug: <Plug className="w-5 h-5" />,
  MoreHorizontal: <MoreHorizontal className="w-5 h-5" />,
};

// Color mapping
const COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  emerald: 'from-emerald-500 to-emerald-600',
  green: 'from-green-500 to-green-600',
  rose: 'from-rose-500 to-rose-600',
  amber: 'from-amber-500 to-amber-600',
  indigo: 'from-indigo-500 to-indigo-600',
};

const SHADOW_COLORS: Record<string, string> = {
  blue: 'shadow-blue-200/50',
  emerald: 'shadow-emerald-200/50',
  green: 'shadow-green-200/50',
  rose: 'shadow-rose-200/50',
  amber: 'shadow-amber-200/50',
  indigo: 'shadow-indigo-200/50',
};

export function TaskTemplateSelector({
  onSelect,
  trigger,
}: TaskTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = getCategories();
  const allTemplates = getAllTemplates();

  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : selectedCategory
      ? allTemplates.filter(t => t.categoria === selectedCategory)
      : allTemplates;

  const handleSelect = (template: MCPTaskTemplate) => {
    onSelect?.(template);
    setOpen(false);
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-amber-500" />
              Plantillas de Tareas
            </DialogTitle>
            <DialogDescription>
              Selecciona una plantilla para automatizar tareas comunes
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-xs"
            >
              Todas
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="text-xs gap-1"
              >
                {ICONS[cat.icon] || <MoreHorizontal className="w-3 h-3" />}
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={`
                    group relative p-4 rounded-xl bg-white border border-slate-100 
                    cursor-pointer transition-all duration-300
                    hover:shadow-lg hover:-translate-y-0.5
                    ${SHADOW_COLORS[template.color] || 'shadow-slate-200/50'}
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                    w-10 h-10 rounded-xl bg-gradient-to-br ${COLORS[template.color] || COLORS.blue}
                    flex items-center justify-center text-white mb-3
                    shadow-md ${SHADOW_COLORS[template.color] || 'shadow-slate-200/50'}
                  `}
                  >
                    {ICONS[template.icono] || <Zap className="w-5 h-5" />}
                  </div>

                  {/* Content */}
                  <h4 className="font-semibold text-slate-800 group-hover:text-slate-900">
                    {template.nombre}
                  </h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {template.descripcion}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {template.sistema_destino}
                    </Badge>
                    {template.requiere_auth && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-200"
                      >
                        Auth
                      </Badge>
                    )}
                  </div>

                  {/* Tags */}
                  {template.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No se encontraron plantillas</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
