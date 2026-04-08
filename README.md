# iso18091-gobierno ? Don C?ndido Gobierno Local

Edici?n dedicada de **Don C?ndido** para **municipios y organismos p?blicos**, certificable bajo **ISO 18091**.

Fork de [`9001app-v8`](https://github.com/Sergiocharata1977/9001app-v8).

## Stack
Next.js 14 ? TypeScript ? Firebase (proyecto propio) ? Tailwind ? Radix UI

## M?dulos activos
- ISO 9001 core (Procesos, Auditor?as, Hallazgos, Acciones, Documentos, RRHH)
- ISO 18091 Gobierno Local (Ciudadanos, Expedientes, Servicios, Transparencia, Control Interno, Madurez Municipal)
- IA / Don C?ndido
- App Android ? flavor `government`

## Setup local
```bash
cp .env.gobierno.example .env.local
# Completar valores Firebase del proyecto iso18091-gobierno
npm install
npm run dev
```

## Deploy
Vercel + Firebase project `iso18091-gobierno` (base de datos independiente de la edici?n SaaS).

## Documentaci?n
Ver `reports/` para planes de olas y arquitectura.
