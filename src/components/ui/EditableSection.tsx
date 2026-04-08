'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Edit, X } from 'lucide-react';
import { ReactNode } from 'react';

interface EditableSectionProps {
  title: string;
  icon?: ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children: ReactNode;
  editContent: ReactNode;
  className?: string;
}

export function EditableSection({
  title,
  icon,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving = false,
  children,
  editContent,
  className = '',
}: EditableSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {editContent}
            <div className="flex gap-2">
              <Button
                onClick={onSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <Check className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={saving}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
