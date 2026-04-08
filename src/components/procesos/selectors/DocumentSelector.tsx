'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, FileText, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// Tipos mínimos necesarios si no podemos importar el SDK completo
interface Document {
  id: string;
  title: string;
  url?: string;
  type?: string;
}

interface DocumentSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
}

export function DocumentSelector({
  selectedIds,
  onChange,
  readOnly = false,
}: DocumentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Efecto para buscar documentos cuando cambia el query
  useEffect(() => {
    const searchDocuments = async () => {
      if (!open) return; // Solo buscar si está abierto

      try {
        setLoading(true);
        const response = await fetch('/api/sdk/documents/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, limit: 20 }),
        });

        if (response.ok) {
          const data = await response.json();
          setDocuments(data.data || []);
        }
      } catch (error) {
        console.error('Error searching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchDocuments, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  // Efecto para cargar los documentos seleccionados inicialmente (para mostrar nombres)
  useEffect(() => {
    const loadSelectedDocuments = async () => {
      if (selectedIds.length === 0) return;

      // Aquí idealmente llamaríamos a un endpoint que traiga documentos por IDs
      // Por simplicidad, buscaremos todos si son pocos, o asumimos que el usuario los buscará
      // TODO: Implementar getByIds en API
    };

    loadSelectedDocuments();
  }, [selectedIds]);

  const handleSelect = (doc: Document) => {
    const newSelected = selectedIds.includes(doc.id)
      ? selectedIds.filter(s => s !== doc.id)
      : [...selectedIds, doc.id];
    onChange(newSelected);

    // Actualizar lista local para que mantenga el nombre visible
    if (!documents.find(d => d.id === doc.id)) {
      setDocuments(prev => [...prev, doc]);
    }
  };

  const selectedDocs = documents.filter(d => selectedIds.includes(d.id));

  // Fallback para mostrar IDs si no tenemos el documento cargado
  const missingDocsIds = selectedIds.filter(
    id => !documents.find(d => d.id === id)
  );

  if (readOnly) {
    if (selectedIds.length === 0) {
      return (
        <span className="text-gray-400 italic">
          No hay documentos vinculados
        </span>
      );
    }
    return (
      <div className="space-y-2">
        {selectedDocs.map(doc => (
          <div
            key={doc.id}
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <FileText className="h-4 w-4" />
            <a href={doc.url || '#'} target="_blank" rel="noopener noreferrer">
              {doc.title}
            </a>
          </div>
        ))}
        {missingDocsIds.map(id => (
          <div
            key={id}
            className="flex items-center gap-2 text-sm text-gray-500"
          >
            <FileText className="h-4 w-4" />
            <span>Documento ID: {id}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} documentos seleccionados`
              : 'Buscar y vincular documento...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading && (
                <div className="p-2 text-sm text-gray-500 text-center">
                  Buscando...
                </div>
              )}
              {!loading && documents.length === 0 && (
                <CommandEmpty>No se encontraron documentos.</CommandEmpty>
              )}
              <CommandGroup>
                <ScrollArea className="h-[200px]">
                  {documents.map(doc => (
                    <CommandItem
                      key={doc.id}
                      value={doc.title}
                      onSelect={() => handleSelect(doc)}
                    >
                      <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                        <Check
                          className={
                            selectedIds.includes(doc.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          }
                        />
                      </div>
                      <span className="truncate">{doc.title}</span>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Lista de seleccionados */}
      <div className="flex flex-col gap-2">
        {selectedDocs.map(doc => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{doc.title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={() => handleSelect(doc)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {missingDocsIds.map(id => (
          <div
            key={id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">{id}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                const newSelected = selectedIds.filter(s => s !== id);
                onChange(newSelected);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Botón para subir nuevo (Placeholder) */}
      <Button
        variant="ghost"
        size="sm"
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 w-full justify-start"
        onClick={() => alert('Funcionalidad de carga rápida próximamente.')}
      >
        <Plus className="h-4 w-4 mr-2" />
        Subir Nuevo Documento (PDF)
      </Button>
    </div>
  );
}
