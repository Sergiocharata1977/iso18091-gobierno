'use client';

import { SkillCard } from '@/app/(dashboard)/admin/openclaw/_components/SkillCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/firebase/config';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { OpenClawSkillManifest } from '@/types/openclaw';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, Copy, KeyRound, Link2, Loader2, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type OpenClawSettingsDoc = {
  tenant_key: string;
  enabled_skills: string[];
  write_skills_require_otp: boolean;
};

const WEBHOOK_URL = 'https://doncandidoia.com/api/public/openclaw/execute';

function generateTenantKey() {
  return `oclw_${crypto.randomUUID().replace(/-/g, '')}`;
}

export default function OpenClawAdminPage() {
  const { toast } = useToast();
  const { usuario, loading: userLoading } = useCurrentUser();
  const orgId = usuario?.organization_id ?? null;
  const canManage = ['admin', 'super_admin'].includes(usuario?.rol ?? '');
  // TODO: usar contexto?.installedCapabilities cuando useCurrentUser({ includeContext: true }) sea estándar
  const hasOpenclawPlugin = true;

  const [publicApiKey, setPublicApiKey] = useState<string | null>(null);
  const [openClawSettings, setOpenClawSettings] =
    useState<OpenClawSettingsDoc | null>(null);
  const [skills, setSkills] = useState<OpenClawSkillManifest[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'key' | 'webhook' | null>(null);

  useEffect(() => {
    if (!orgId) {
      setPublicApiKey(null);
      setOpenClawSettings(null);
      return;
    }

    const orgRef = doc(db, 'organizations', orgId);
    const settingsRef = doc(db, 'organizations', orgId, 'settings', 'openclaw');

    const unsubscribeOrg = onSnapshot(orgRef, snapshot => {
      const data = snapshot.data();
      setPublicApiKey(
        typeof data?.public_api_key === 'string' ? data.public_api_key : null
      );
    });

    const unsubscribeSettings = onSnapshot(settingsRef, snapshot => {
      const data = snapshot.data();
      if (!snapshot.exists()) {
        setOpenClawSettings(null);
        return;
      }

      setOpenClawSettings({
        tenant_key:
          typeof data?.tenant_key === 'string' ? data.tenant_key : orgId,
        enabled_skills: Array.isArray(data?.enabled_skills)
          ? data.enabled_skills.filter(
              (item): item is string => typeof item === 'string'
            )
          : [],
        write_skills_require_otp:
          typeof data?.write_skills_require_otp === 'boolean'
            ? data.write_skills_require_otp
            : true,
      });
    });

    return () => {
      unsubscribeOrg();
      unsubscribeSettings();
    };
  }, [orgId]);

  const tenantKey = useMemo(() => {
    if (openClawSettings?.tenant_key) {
      return openClawSettings.tenant_key;
    }
    return publicApiKey ?? null;
  }, [openClawSettings?.tenant_key, publicApiKey]);

  const enabledSkillSet = useMemo(() => {
    if (!openClawSettings) {
      return null;
    }

    return new Set(openClawSettings.enabled_skills);
  }, [openClawSettings]);

  useEffect(() => {
    if (!tenantKey) {
      setSkills([]);
      return;
    }

    const controller = new AbortController();

    async function loadSkills() {
      try {
        setLoadingSkills(true);
        const response = await fetch(
          `/api/public/openclaw/skills?tenant_key=${encodeURIComponent(tenantKey!)}`,
          { signal: controller.signal }
        );
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'No se pudieron cargar las skills');
        }

        setSkills(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }

        console.error('[admin/openclaw] Error loading skills:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las skills disponibles.',
          variant: 'destructive',
        });
      } finally {
        setLoadingSkills(false);
      }
    }

    void loadSkills();

    return () => controller.abort();
  }, [tenantKey, toast]);

  async function handleCopy(value: string, field: 'key' | 'webhook') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(current => (current === field ? null : current)), 1500);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles.',
        variant: 'destructive',
      });
    }
  }

  async function handleGenerateKey() {
    if (!orgId) {
      return;
    }

    const nextKey = generateTenantKey();

    try {
      setSavingKey(true);
      await setDoc(
        doc(db, 'organizations', orgId),
        { public_api_key: nextKey },
        { merge: true }
      );
      await setDoc(
        doc(db, 'organizations', orgId, 'settings', 'openclaw'),
        {
          tenant_key: nextKey,
          enabled_skills: openClawSettings?.enabled_skills ?? [],
          write_skills_require_otp: true,
        },
        { merge: true }
      );
      toast({
        title: 'Clave generada',
        description: 'La clave de acceso de OpenClaw fue creada correctamente.',
      });
    } catch (error) {
      console.error('[admin/openclaw] Error generating key:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la clave de acceso.',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(false);
    }
  }

  async function handleToggleSkill(skill: OpenClawSkillManifest, enabled: boolean) {
    if (!orgId || !tenantKey) {
      return;
    }

    if (
      skill.mode === 'write' &&
      !window.confirm(
        enabled
          ? 'Vas a habilitar una skill con capacidad de escritura. Continuar?'
          : 'Vas a deshabilitar una skill con capacidad de escritura. Continuar?'
      )
    ) {
      return;
    }

    const currentEnabledSkills =
      openClawSettings?.enabled_skills ?? skills.map(item => item.skill_id);
    const nextEnabledSkills = enabled
      ? Array.from(new Set([...currentEnabledSkills, skill.skill_id]))
      : currentEnabledSkills.filter(id => id !== skill.skill_id);

    try {
      setSavingSkillId(skill.skill_id);
      await setDoc(
        doc(db, 'organizations', orgId, 'settings', 'openclaw'),
        {
          tenant_key: tenantKey,
          enabled_skills: nextEnabledSkills,
          write_skills_require_otp: openClawSettings?.write_skills_require_otp ?? true,
        },
        { merge: true }
      );
      toast({
        title: enabled ? 'Skill habilitada' : 'Skill deshabilitada',
        description: `${skill.display_name} fue actualizada para este tenant.`,
      });
    } catch (error) {
      console.error('[admin/openclaw] Error updating skill:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la skill.',
        variant: 'destructive',
      });
    } finally {
      setSavingSkillId(null);
    }
  }

  if (!userLoading && (!canManage || !hasOpenclawPlugin)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Integracion OpenClaw"
          description="Conecta tu asistente de WhatsApp con el sistema."
          breadcrumbs={[
            { label: 'Administracion', href: '/admin/usuarios' },
            { label: 'OpenClaw IA' },
          ]}
        />
        <Card className="border-red-200">
          <CardContent className="p-6 text-sm text-red-700">
            {!canManage
              ? 'Esta pantalla solo esta disponible para roles admin y super_admin.'
              : 'El plugin OpenClaw no esta instalado en esta organizacion. Activalo desde el marketplace.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integracion OpenClaw"
        description="Conecta tu asistente de WhatsApp con el sistema"
        breadcrumbs={[
          { label: 'Administracion', href: '/admin/usuarios' },
          { label: 'OpenClaw IA' },
        ]}
        actions={
          tenantKey ? (
            <Button
              variant="outline"
              onClick={() => void handleCopy(WEBHOOK_URL, 'webhook')}
            >
              {copiedField === 'webhook' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Copiar webhook
            </Button>
          ) : undefined
        }
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-sky-600" />
            Tu clave de acceso
          </CardTitle>
          <CardDescription>
            Compartila como `tenant_key` en OpenClaw para identificar este tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicApiKey ? (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
              <code className="break-all text-sm text-slate-700">{publicApiKey}</code>
              <Button
                variant="outline"
                onClick={() => void handleCopy(publicApiKey, 'key')}
              >
                {copiedField === 'key' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copiar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">
                Esta organizacion todavia no tiene una clave publica generada.
              </p>
              <Button onClick={() => void handleGenerateKey()} disabled={savingKey}>
                {savingKey ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Generar clave
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Skills disponibles</CardTitle>
              <CardDescription>
                Se muestran solo las skills compatibles con capabilities activas del tenant.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!tenantKey || loadingSkills}
              onClick={() => {
                if (tenantKey) {
                  setSkills([]);
                  setLoadingSkills(true);
                  fetch(`/api/public/openclaw/skills?tenant_key=${encodeURIComponent(tenantKey)}`)
                    .then(async response => {
                      const json = await response.json();
                      if (!response.ok || !json.success) {
                        throw new Error(json.error || 'No se pudieron cargar las skills');
                      }
                      setSkills(Array.isArray(json.data) ? json.data : []);
                    })
                    .catch(error => {
                      console.error('[admin/openclaw] Error refreshing skills:', error);
                      toast({
                        title: 'Error',
                        description: 'No se pudieron refrescar las skills.',
                        variant: 'destructive',
                      });
                    })
                    .finally(() => setLoadingSkills(false));
                }
              }}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingSkills ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!tenantKey ? (
            <p className="text-sm text-slate-600">
              Genera primero la clave de acceso para consultar las skills disponibles.
            </p>
          ) : loadingSkills ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando skills...
            </div>
          ) : skills.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay skills activas para las capabilities instaladas en este tenant.
            </p>
          ) : (
            skills.map(skill => (
              <SkillCard
                key={skill.skill_id}
                skill={skill}
                enabled={enabledSkillSet?.has(skill.skill_id) ?? true}
                disabled={savingSkillId === skill.skill_id}
                onToggle={nextValue => void handleToggleSkill(skill, nextValue)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>URL del webhook</CardTitle>
          <CardDescription>
            Configura esta URL en OpenClaw Dashboard para ejecutar skills contra tu tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <code className="break-all text-sm text-slate-700">{WEBHOOK_URL}</code>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Crea o edita tu asistente en OpenClaw Dashboard.</li>
            <li>Pega esta URL como webhook de ejecucion.</li>
            <li>Usa la clave del tenant como `tenant_key` en la configuracion.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <span>Necesitas mas contexto operativo o ejemplos de configuracion.</span>
        <Link
          href="/documentacion"
          className="font-medium text-sky-700 transition-colors hover:text-sky-800"
        >
          Ir a documentacion
        </Link>
      </div>
    </div>
  );
}
