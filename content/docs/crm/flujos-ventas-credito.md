# Flujos: Ventas y Gestión de Crédito

**Proyecto:** Don Cándido / 9001app-firebase + prestaloapp
**Fecha:** 2026-03-24

---

## 1. Proceso de Ventas — CRM

```mermaid
flowchart TD
    A([Lead Ingresa]) --> B{Canal de entrada}

    B -->|Landing / Formulario público| C[POST /api/public/solicitudes\nx-tenant-key]
    B -->|WhatsApp| D[WhatsApp Inbox\n/crm/whatsapp]
    B -->|Alta manual CRM| E[Alta manual\n/crm/clientes]

    C --> F[Creación en colección\nclientes / solicitudes]
    D --> F
    E --> F

    F --> G[Enriquecimiento\nNosis scoring]
    G --> H{Score crediticio}

    H -->|Score alto ✅| I[Oportunidad calificada\n/crm/oportunidades]
    H -->|Score bajo ⚠️| J[Nurturing / Seguimiento\nen espera]
    H -->|Rechazo ❌| K[Descartado\nmotivo registrado]

    I --> L[Propuesta comercial\ngenerada por IA Don Cándido]
    L --> M{Decisión del cliente}

    M -->|Acepta| N[Cierre de venta ✅\nstatus: ganada]
    M -->|Negocia| O[Contraoferta\nnueva propuesta]
    M -->|Rechaza| P[Oportunidad perdida\nmotivo registrado]

    O --> M
    N --> Q[Notificación WhatsApp\nal cliente]
    N --> R{¿Requiere crédito?}

    R -->|Sí| S([Derivar a Gestión de Crédito])
    R -->|No| T([Contrato / Pedido generado])
```

---

## 2. Gestión de Crédito — prestaloapp

```mermaid
flowchart TD
    A([Solicitud de crédito\ndesde CRM o directo]) --> B[Alta cliente\nfin_clientes]

    B --> C[Carga de operación\nfin_creditos\nmonto + cuotas + tasa]

    C --> D[Evaluación crediticia\nNosis / scoring interno]
    D --> E{Decisión comité}

    E -->|Aprobado ✅| F[Generación de\nplan de cuotas\nfin_cuotas]
    E -->|Rechazado ❌| G[Notificación rechazo\ncausa registrada]
    E -->|Pendiente info| H[Solicitar documentación\nvuelve a evaluación]

    H --> D

    F --> I[Desembolso\nasiento contable\nfin_asientos]
    I --> J[Crédito ACTIVO\nstatus: vigente]

    J --> K{Vencimiento de cuota}

    K -->|Pago recibido| L[Registrar cobro\nfin_cobros\nasiento haber]
    K -->|Sin pago| M[Cuota VENCIDA\ngestión de mora]

    M --> N{Gestión de cobranza}
    N -->|Pago regularizado| L
    N -->|Acuerdo de pago| O[Plan de refinanciación\nnuevo fin_credito]
    N -->|Irrecuperable| P[Castigo contable\nfin_asientos ajuste]

    L --> Q{¿Última cuota pagada?}
    Q -->|No| K
    Q -->|Sí| R([Crédito CANCELADO ✅\nstatus: finalizado])
```

---

## 3. Integración entre ambos flujos

```mermaid
flowchart LR
    CRM[CRM\n9001app-firebase] -->|Cliente calificado\n+ monto solicitado| PRESTA[prestaloapp\nFinanciación]
    PRESTA -->|Estado crédito| CRM
    WHATSAPP[WhatsApp Inbox] -->|Lead ingresa| CRM
    NOSIS[Nosis API] -->|Score crediticio| CRM
    NOSIS -->|Evaluación| PRESTA
    DON[Don Cándido IA] -->|Propuesta generada| CRM
    DON -->|Análisis de riesgo| PRESTA
```
