# Sistema de Diseño - Don Cándido 9001App

Sistema de diseño unificado para estandarizar la UI de la aplicación 9001App.

## 📁 Estructura

```
design-system/
├── tokens/          # Design tokens (colores, tipografía, espaciado, etc.)
├── primitives/      # Componentes base (botones, tarjetas, badges)
├── layout/          # Componentes de layout (PageHeader, PageToolbar, Section)
├── patterns/        # Patrones de dominio (DomainCard, ListGrid, UnifiedKanban)
│   ├── cards/
│   ├── lists/
│   ├── kanban/
│   └── forms/       # (placeholder para futuros patrones)
├── data-display/    # (placeholder para futuros componentes)
├── feedback/        # (placeholder para futuros componentes)
└── index.ts         # Barrel export centralizado
```

## 🚀 Uso

### Importación Centralizada

Importa desde el barrel export raíz para acceso simplificado:

```tsx
import {
  // Tokens
  typography,
  radius,
  spacing,
  colors,

  // Primitivas
  BaseCard,
  BaseButton,
  BaseBadge,

  // Layout
  PageHeader,
  PageToolbar,
  Section,

  // Patrones
  DomainCard,
  ListGrid,
  ListTable,
  UnifiedKanban,
} from '@/components/design-system';
```

### Importación Específica

También puedes importar desde subdirectorios específicos:

```tsx
import { typography, radius } from '@/components/design-system/tokens';
import { BaseCard } from '@/components/design-system/primitives';
import { DomainCard } from '@/components/design-system/patterns/cards';
```

## 📦 Componentes Principales

### 1. Tokens

#### Tipografía

```tsx
import { typography } from '@/components/design-system';

<h1 className={typography.h1}>Título Principal</h1>
<h2 className={typography.h2}>Subtítulo</h2>
<p className={typography.p}>Párrafo de texto</p>
```

#### Colores

```tsx
import { colors } from '@/components/design-system';

<div className={colors.primary.bg}>Fondo primario</div>
<span className={colors.success.text}>Texto de éxito</span>
```

#### Espaciado y Radios

```tsx
import { spacing, radius } from '@/components/design-system';

<div className={`${spacing.md} ${radius.card}`}>
  Contenido con espaciado y bordes redondeados
</div>;
```

### 2. Primitivas

#### BaseCard

```tsx
<BaseCard padding="md">
  <h3>Título de la tarjeta</h3>
  <p>Contenido de la tarjeta</p>
</BaseCard>
```

#### BaseButton

```tsx
<BaseButton variant="default" size="md">
  Acción Principal
</BaseButton>
```

#### BaseBadge

```tsx
<BaseBadge variant="success">Activo</BaseBadge>
<BaseBadge variant="warning">Pendiente</BaseBadge>
```

### 3. Layout

#### PageHeader

```tsx
<PageHeader
  title="Gestión de Procesos"
  subtitle="Administra los procesos de tu organización"
>
  <Button>Nueva Acción</Button>
</PageHeader>
```

#### PageToolbar

```tsx
<PageToolbar
  searchValue={searchTerm}
  onSearch={setSearchTerm}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  supportedViews={['list', 'grid', 'kanban']}
/>
```

#### Section

```tsx
<Section
  title="Procesos Activos"
  description="Lista de procesos en ejecución"
  actions={<Button>Ver Todos</Button>}
>
  {/* Contenido de la sección */}
</Section>
```

### 4. Patrones

#### DomainCard

```tsx
<DomainCard
  title="Proceso de Ventas"
  subtitle="PR-COM-001"
  status={{ label: 'Activo', variant: 'success' }}
  meta={<span>Responsable: Juan Pérez</span>}
  actions={[
    { label: 'Editar', onClick: handleEdit },
    { label: 'Eliminar', onClick: handleDelete, variant: 'destructive' },
  ]}
>
  <p>Descripción del proceso...</p>
</DomainCard>
```

#### ListGrid

```tsx
<ListGrid
  data={items}
  renderItem={item => <DomainCard {...item} />}
  keyExtractor={item => item.id}
  columns={3}
  emptyState={<EmptyState />}
/>
```

#### ListTable

```tsx
<ListTable
  data={items}
  columns={[
    { header: 'Código', accessorKey: 'code' },
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Estado',
      cell: item => (
        <BaseBadge variant={item.status.variant}>{item.status.label}</BaseBadge>
      ),
    },
  ]}
  keyExtractor={item => item.id}
  onRowClick={handleRowClick}
/>
```

#### UnifiedKanban

```tsx
<UnifiedKanban
  columns={[
    { id: 'todo', title: 'Por Hacer', color: 'bg-slate-500' },
    { id: 'in-progress', title: 'En Progreso', color: 'bg-blue-500' },
    { id: 'done', title: 'Completado', color: 'bg-green-500' },
  ]}
  items={kanbanItems}
  onItemMove={handleItemMove}
  onItemClick={handleItemClick}
  renderCard={item => <CustomCard {...item} />}
/>
```

## 🎨 Página de Demostración

Visita `/super-admin/design-system` para ver todos los componentes en acción.

## 📝 Convenciones

1. **Nomenclatura**: Usa prefijos semánticos (`Base`, `Domain`, `Unified`)
2. **Composición**: Prefiere composición sobre herencia
3. **Tokens**: Usa tokens en lugar de valores hardcodeados
4. **Tipado**: Todos los componentes están completamente tipados con TypeScript
5. **Accesibilidad**: Incluye atributos ARIA y soporte de teclado

## 🔧 Configuración de Build

El proyecto está configurado con `NODE_OPTIONS=--max-old-space-size=4096` para evitar errores de memoria (OOM) durante el build.

## 📚 Referencias

- **Módulo Refactorizado**: Ver `src/components/procesos/` como ejemplo de uso
- **Página de Prueba**: `src/app/(dashboard)/super-admin/design-system/page.tsx`
- **Tokens Base**: Basados en shadcn/ui y Tailwind CSS

## 🚧 Roadmap

- [ ] Implementar componentes de `data-display/` (StatCard, DataTable avanzada)
- [ ] Implementar componentes de `feedback/` (Toast, AlertBanner, LoadingSpinner)
- [ ] Implementar patrones de `forms/` (DomainForm, FormSection, InlineEdit)
- [ ] Agregar animaciones y transiciones estandarizadas
- [ ] Documentar patrones de accesibilidad
