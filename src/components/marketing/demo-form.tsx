'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Bot, CheckCircle2, Send } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export function DemoForm() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formTs] = useState(() => Date.now());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      company: formData.get('company'),
      whatsapp: formData.get('whatsapp'),
      employees: formData.get('employees'),
      hasISO: formData.get('hasISO') === 'on',
      message: formData.get('message'),
      website: formData.get('website') || '',
      _ts: formTs,
    };

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        'Hubo un error al enviar el formulario. Por favor intenta nuevamente.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="demo"
      className="relative py-24 bg-slate-50/50 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/10">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.demo.title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t.demo.subtitle}
            </p>
          </div>

          <Card className="bg-white border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]">
            <CardContent className="p-8 md:p-10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <CheckCircle2 className="w-10 h-10 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {t.demo.form.success}
                  </h3>
                  <p className="text-slate-500">
                    Nos pondremos en contacto contigo lo antes posible.
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-6 text-center py-4 px-6 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-red-600 font-medium">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Honeypot — invisible to real users, bots fill it */}
                    <div
                      aria-hidden="true"
                      style={
                        {
                          position: 'absolute',
                          left: '-9999px',
                          top: '-9999px',
                          opacity: 0,
                          height: 0,
                          overflow: 'hidden',
                          tabIndex: -1,
                        } as React.CSSProperties
                      }
                    >
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        autoComplete="off"
                        tabIndex={-1}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-slate-700 font-semibold mb-1 block"
                        >
                          {t.demo.form.name}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          required
                          placeholder="Tu nombre completo"
                          className="h-12 border-slate-200 focus:border-slate-400 bg-slate-50/50 transition-all text-slate-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-slate-700 font-semibold mb-1 block"
                        >
                          {t.demo.form.email}
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="email@empresa.com"
                          className="h-12 border-slate-200 focus:border-slate-400 bg-slate-50/50 transition-all text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="company"
                          className="text-slate-700 font-semibold mb-1 block"
                        >
                          {t.demo.form.company}
                        </Label>
                        <Input
                          id="company"
                          name="company"
                          required
                          placeholder="Nombre de tu empresa"
                          className="h-12 border-slate-200 focus:border-slate-400 bg-slate-50/50 transition-all text-slate-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="whatsapp"
                          className="text-slate-700 font-semibold mb-1 block"
                        >
                          WhatsApp
                        </Label>
                        <Input
                          id="whatsapp"
                          name="whatsapp"
                          type="tel"
                          required
                          placeholder="+54 9 11 ..."
                          className="h-12 border-slate-200 focus:border-slate-400 bg-slate-50/50 transition-all text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="employees"
                          className="text-slate-700 font-semibold mb-1 block"
                        >
                          {t.demo.form.employees}
                        </Label>
                        <Select name="employees">
                          <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 text-slate-600">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-700">
                            <SelectItem value="1-10">1-10</SelectItem>
                            <SelectItem value="11-50">11-50</SelectItem>
                            <SelectItem value="51-200">51-200</SelectItem>
                            <SelectItem value="201-500">201-500</SelectItem>
                            <SelectItem value="500+">500+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer bg-slate-50/50 px-4 h-12 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all w-full">
                          <input
                            type="checkbox"
                            name="hasISO"
                            className="w-5 h-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500 focus:ring-offset-white bg-white"
                          />
                          <span className="text-slate-600 text-sm font-medium">
                            ¿Tiene ISO 9001 implementado?
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="message"
                        className="text-slate-700 font-semibold mb-1 block"
                      >
                        {t.demo.form.message}
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="Contanos brevemente sobre tu empresa..."
                        className="border-slate-200 focus:border-slate-400 bg-slate-50/50 transition-all text-slate-900 resize-none min-h-[120px]"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-8 text-lg font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {t.demo.form.submit}
                          <Send className="w-5 h-5" />
                        </span>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
