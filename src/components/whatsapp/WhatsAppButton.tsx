/**
 * Botón para enviar WhatsApp desde el CRM
 * Se usa en la ficha de cliente
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useState } from 'react';

interface WhatsAppButtonProps {
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  vendedorId?: string;
  vendedorNombre?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function WhatsAppButton({
  clienteId,
  clienteNombre,
  telefono,
  vendedorId,
  vendedorNombre,
  className = '',
  variant = 'outline',
  size = 'default',
}: WhatsAppButtonProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Limpiar número de teléfono
  const cleanPhone = telefono?.replace(/\D/g, '') || '';

  const handleSend = async () => {
    if (!message.trim() || !cleanPhone || !organizationId) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          to: cleanPhone,
          body: message.trim(),
          sender_user_id: user?.id || vendedorId || 'unknown',
          sender_name:
            user?.email?.split('@')[0] || vendedorNombre || 'Usuario',
          cliente_id: clienteId,
          cliente_nombre: clienteNombre,
          vendedor_id: vendedorId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Mensaje enviado correctamente',
        });
        setMessage('');
        // Cerrar después de 2 segundos
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || 'Error al enviar el mensaje',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Error de conexión',
      });
    } finally {
      setSending(false);
    }
  };

  // Si no hay teléfono, mostrar botón deshabilitado
  if (!cleanPhone) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        title="Cliente sin número de teléfono"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} text-green-600 hover:text-green-700 hover:bg-green-50`}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Enviar mensaje a <strong>{clienteNombre}</strong>
            <br />
            <span className="text-green-600">+{cleanPhone}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={sending}
            />
            <p className="text-xs text-gray-500 text-right">
              {message.length} caracteres
            </p>
          </div>

          {/* Resultado */}
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending || !organizationId}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WhatsAppButton;
