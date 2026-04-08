# /analiza-build — Diagnóstico y corrección de errores de Vercel build

Actúa como un desarrollador Senior experto en Next.js 14 App Router y despliegues en Vercel.

Estamos teniendo errores de build (deploy) en el proyecto **Don Cándido IA** (9001app-firebase) y necesitamos aislar y corregir el problema.

## Paso 1 — Identificación

1. Revisa los logs del build fallido usando `npx vercel ls` y `npx vercel inspect <url> --logs` para obtener el error real.
2. Corre `npx tsc --noEmit` localmente para detectar errores TypeScript.
3. Lista todos los archivos con problemas, desde el primer error hasta los últimos cambios subidos.
4. Clasifica cada error:
   - **TypeScript**: tipo incorrecto, export faltante, import incorrecto
   - **Next.js runtime**: `useSearchParams` sin `<Suspense>`, `useRouter` en Server Component, etc.
   - **Import/Module**: importando desde el path equivocado, export inexistente
   - **ESLint**: reglas que rompen el build

## Paso 2 — Aislamiento y corrección directa

Para cada error encontrado, **corregir de raíz** (no comentar):

### Patrones frecuentes en este proyecto:
- `useSearchParams()` sin Suspense → extraer a componente hijo + `<Suspense>` wrapper
- Import desde `@/types/X` de algo que vive en `@/lib/X` → corregir el import path
- Tipo `'valor'` no asignable a union type → revisar la definición del tipo y mapear al valor correcto
- `export const dynamic = 'force-dynamic'` faltante en API routes que usan `request.headers`
- Type assertion `AssertTrue<IsExact<A, B>>` fallida → comentar (es solo un check, no lógica)
- `PluginSettingField` vs `PluginSettingFieldSchema` → usar el nombre exacto exportado
- Función con firma de tipos incompleta → ampliar la firma para incluir todos los casos

### Bundle size — patrón crítico en este proyecto:
- **Barrel file imports** — importar desde `index.ts` re-exportador carga TODO el barrel:
  ```typescript
  // ❌ Mal — carga todos los componentes del design system
  import { BaseCard, PageHeader } from '@/components/design-system/layout';

  // ✅ Bien — carga solo lo necesario
  import { BaseCard } from '@/components/design-system/primitives/BaseCard';
  import { PageHeader } from '@/components/design-system/layout/PageHeader';
  ```
  Buscar en el build log: `Exceeded the bundle size limit` o warnings de chunks muy grandes.
- **Dynamic imports** para componentes pesados (editores, charts, PDF viewers):
  ```typescript
  const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), { ssr: false });
  ```

### Arquitectura clave a recordar:
- `src/lib/plugins/manifestSchema.ts` exporta `pluginManifestSchema` (Zod schema)
- `src/types/plugins.ts` exporta los tipos TypeScript de plugins
- API routes con `withAuth` usan `request.headers` → son dinámicas por diseño (los errores `DYNAMIC_SERVER_USAGE` son **warnings**, no fallos)
- `src/app/participacion/page.tsx` usa `useSearchParams` → siempre necesita `<Suspense>`

## Paso 3 — Verificación antes de push

1. Correr `npx tsc --noEmit` → debe dar exit code 0
2. Verificar con `git status` que los archivos correctos están modificados
3. Commit con mensaje descriptivo y push
4. Monitorear el nuevo build en Vercel con `npx vercel ls`

## Paso 4 — Plan de habilitación progresiva (si se comentó código)

Si fue necesario comentar código para desbloquear el build:
1. Listar cada bloque comentado con su archivo y número de línea
2. Para cada bloque: explicar por qué fallaba, cuál es el fix correcto
3. Habilitar de a uno, correr tsc, commit, verificar build antes de pasar al siguiente

---

**Contexto del proyecto:**
- Next.js 14.2.18 + TypeScript strict + Firebase
- Vercel deployment: `sergiocharata1977s-projects/9001app-v8`
- Branch principal: `main`
- Zod v4 (z.record requiere 2 args, no usar z.coerce)
- `withAuth` wrapper en API routes → todas son dinámicas por diseño
