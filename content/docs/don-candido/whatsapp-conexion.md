---
title: "Conectar WhatsApp Business"
slug: "don-candido/whatsapp-conexion"
module: "don-candido"
screen: "/configuracion/whatsapp"
summary: "Cómo conectar el número de WhatsApp Business de tu organización a Don Cándido en menos de 2 minutos."
roles: ["admin", "super_admin"]
tags: ["whatsapp", "conexion", "configuracion", "onboarding"]
relatedRoutes: ["/configuracion/whatsapp"]
entity: "whatsapp_config"
order: 41
status: "active"
category: "configuracion"
lastValidated: "2026-03-27"
---

## Que necesitás antes de empezar

Antes de conectar WhatsApp Business a la plataforma, asegurate de tener:

- Una **cuenta de Facebook** (puede ser la del dueño o encargado del negocio)
- Un **número de teléfono del negocio** que NO esté registrado como WhatsApp personal

Si el número que querés usar ya está en WhatsApp personal, necesitás usar otro número o hacer una migración desde la app de WhatsApp Business.

---

## Cómo conectar (2 minutos)

1. Ir a **Configuración → WhatsApp**
2. Hacer click en el botón verde **"Conectar WhatsApp Business"**
3. Se abre un popup de Facebook/Meta — loguearse con la cuenta del negocio
4. Seleccionar o crear la **cuenta de WhatsApp Business**
5. Ingresar el número del negocio → recibir SMS con código → ingresarlo
6. Aceptar los permisos solicitados
7. El popup se cierra y la sección muestra **"Cuenta conectada"**

---

## Que NO necesitás hacer

No es necesario entrar a developers.facebook.com ni configurar nada técnico.
La plataforma se encarga de todo lo demás: webhook, tokens de acceso, verificación.

---

## Que pasa después de conectar

Una vez conectado:

- Los mensajes que lleguen al número del negocio por WhatsApp son respondidos automáticamente por Don Cándido
- Las conversaciones aparecen en el **inbox de WhatsApp** en `/crm/whatsapp`
- Don Cándido responde con contexto del CRM: historial del cliente, solicitudes abiertas, estado del pedido

---

## Resolución de problemas

**El popup no se abre:**
El navegador puede bloquear popups. Buscá el ícono de popup bloqueado en la barra de direcciones de Chrome y permitilo para este sitio.

**El número ya está en WhatsApp personal:**
Ese número no puede usarse directamente. Opciones: usar un número diferente del negocio, o migrar desde WhatsApp Business app (Meta tiene un proceso de migración).

**El número no recibe el SMS de verificación:**
Probá con verificación por llamada de voz en lugar de SMS.

---

## Token de acceso y duración

El token de conexión tiene una duración de aproximadamente 60 días. Cuando esté por vencer, la plataforma mostrará una advertencia en esta pantalla para renovarlo. La renovación se hace volviendo a hacer click en "Conectar WhatsApp Business".
