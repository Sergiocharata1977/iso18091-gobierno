'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ZodIssue } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import type { CreateProveedorDTO, ProveedorRubro } from '@/types/proveedor';

const RUBRO_OPTIONS: Array<{ value: ProveedorRubro; label: string }> = [
  { value: 'materias_primas', label: 'Materias primas' },
  { value: 'servicios_profesionales', label: 'Servicios profesionales' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'logistica', label: 'Logistica' },
  { value: 'otros', label: 'Otros' },
];

type FormState = {
  razon_social: string;
  cuit: string;
  rubro: ProveedorRubro | '';
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  productos_servicios: string;
  certificaciones: string;
  sitio_web: string;
};

type SubmissionState =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; title: string; message: string };

type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  details?: ZodIssue[];
};

const INITIAL_STATE: FormState = {
  razon_social: '',
  cuit: '',
  rubro: '',
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
  productos_servicios: '',
  certificaciones: '',
  sitio_web: '',
};

function getFieldLabel(field: string) {
  switch (field) {
    case 'razon_social':
      return 'Razon social';
    case 'cuit':
      return 'CUIT';
    case 'rubro':
      return 'Rubro';
    case 'contacto_nombre':
      return 'Nombre de contacto';
    case 'contacto_email':
      return 'Email de contacto';
    case 'contacto_telefono':
      return 'Telefono de contacto';
    case 'productos_servicios':
      return 'Productos o servicios';
    case 'certificaciones':
      return 'Certificaciones';
    case 'sitio_web':
      return 'Sitio web';
    default:
      return field;
  }
}

function buildValidationMessage(details?: ZodIssue[]) {
  if (!details || details.length === 0) {
    return 'Revise los datos ingresados e intente nuevamente.';
  }

  return details
    .map(issue => {
      const path = issue.path[0];
      const label = typeof path === 'string' ? getFieldLabel(path) : 'Campo';
      return `${label}: ${issue.message}`;
    })
    .join(' ');
}

export function ProveedorForm({
  primaryColor,
  publicApiKey,
}: {
  primaryColor: string;
  publicApiKey: string;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ type: 'idle' });

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(current => ({ ...current, [field]: value }));
    if (submission.type !== 'idle') {
      setSubmission({ type: 'idle' });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmission({ type: 'idle' });

    try {
      if (!form.rubro) {
        setSubmission({
          type: 'error',
          title: 'Datos invalidos',
          message: 'Seleccione un rubro antes de enviar el formulario.',
        });
        return;
      }

      const payload: CreateProveedorDTO = {
        razon_social: form.razon_social.trim(),
        cuit: form.cuit.trim(),
        rubro: form.rubro,
        contacto_nombre: form.contacto_nombre.trim(),
        contacto_email: form.contacto_email.trim(),
        contacto_telefono: form.contacto_telefono.trim() || undefined,
        productos_servicios: form.productos_servicios.trim(),
        certificaciones: form.certificaciones.trim() || undefined,
        sitio_web: form.sitio_web.trim() || '',
      };

      const response = await fetch('/api/public/proveedor-registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-key': publicApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmission({
          type: 'success',
          message: '¡Registro recibido! Nos contactaremos con usted en los proximos dias.',
        });
        setForm(INITIAL_STATE);
        return;
      }

      const errorPayload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | null;

      if (response.status === 409) {
        setSubmission({
          type: 'error',
          title: 'CUIT ya registrado',
          message: 'Este CUIT ya esta registrado en nuestro sistema.',
        });
        return;
      }

      if (response.status === 400) {
        setSubmission({
          type: 'error',
          title: 'Datos invalidos',
          message: buildValidationMessage(errorPayload?.details),
        });
        return;
      }

      setSubmission({
        type: 'error',
        title: 'No se pudo enviar el registro',
        message:
          errorPayload?.error ||
          'Ocurrio un problema inesperado. Intente nuevamente en unos minutos.',
      });
    } catch {
      setSubmission({
        type: 'error',
        title: 'Error de conexion',
        message: 'No se pudo enviar el formulario. Revise su conexion e intente nuevamente.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {submission.type === 'success' ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Registro recibido</AlertTitle>
          <AlertDescription>{submission.message}</AlertDescription>
        </Alert>
      ) : null}

      {submission.type === 'error' ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>{submission.title}</AlertTitle>
          <AlertDescription>{submission.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="razon_social">Razon social</Label>
          <Input
            id="razon_social"
            value={form.razon_social}
            onChange={event => updateField('razon_social', event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cuit">CUIT</Label>
          <Input
            id="cuit"
            value={form.cuit}
            onChange={event => updateField('cuit', event.target.value)}
            placeholder="XX-XXXXXXXX-X"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rubro">Rubro</Label>
          <Select
            value={form.rubro}
            onValueChange={value => updateField('rubro', value as ProveedorRubro)}
          >
            <SelectTrigger id="rubro">
              <SelectValue placeholder="Seleccionar rubro" />
            </SelectTrigger>
            <SelectContent>
              {RUBRO_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto_nombre">Nombre de contacto</Label>
          <Input
            id="contacto_nombre"
            value={form.contacto_nombre}
            onChange={event => updateField('contacto_nombre', event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto_email">Email de contacto</Label>
          <Input
            id="contacto_email"
            type="email"
            value={form.contacto_email}
            onChange={event => updateField('contacto_email', event.target.value)}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contacto_telefono">Telefono de contacto</Label>
          <Input
            id="contacto_telefono"
            value={form.contacto_telefono}
            onChange={event => updateField('contacto_telefono', event.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="productos_servicios">Productos o servicios</Label>
          <Textarea
            id="productos_servicios"
            value={form.productos_servicios}
            onChange={event => updateField('productos_servicios', event.target.value)}
            minLength={10}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="certificaciones">Certificaciones</Label>
          <Input
            id="certificaciones"
            value={form.certificaciones}
            onChange={event => updateField('certificaciones', event.target.value)}
            placeholder="ISO 9001, IRAM, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sitio_web">Sitio web</Label>
          <Input
            id="sitio_web"
            type="url"
            value={form.sitio_web}
            onChange={event => updateField('sitio_web', event.target.value)}
            placeholder="https://www.ejemplo.com"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full text-white hover:opacity-90"
        style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
        disabled={submitting || form.rubro === ''}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando registro...
          </>
        ) : (
          'Registrarme como proveedor'
        )}
      </Button>
    </form>
  );
}
