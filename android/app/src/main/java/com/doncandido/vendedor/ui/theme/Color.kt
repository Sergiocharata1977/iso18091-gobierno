package com.doncandido.vendedor.ui.theme

import androidx.compose.ui.graphics.Color

// === Design System — Don Cándido ===

// Primary — Navy
val NavyPrimary    = Color(0xFF1A2B4A)
val NavyPrimaryVar = Color(0xFF243756)
val NavyLight      = Color(0xFFE8EDF5)

// Accent — Orange (operaciones / CASE)
val OrangeAccent          = Color(0xFFE65100)
val OrangeAccentContainer = Color(0xFFFFF3E0)

// Backgrounds
val BgLight   = Color(0xFFF4F5F7)
val CardWhite = Color(0xFFFFFFFF)

// Text
val TextPrimary   = Color(0xFF1A2B4A)
val TextSecondary = Color(0xFF6B7280)

// Border
val BorderColor = Color(0xFFE5E7EB)

// Status badges
val StatusEnCurso          = Color(0xFF1565C0)
val StatusEnCursoContainer = Color(0xFFE3F2FD)
val StatusPendiente          = Color(0xFFF59E0B)
val StatusPendienteContainer = Color(0xFFFFFBEB)
val StatusCompletado          = Color(0xFF10B981)
val StatusCompletadoContainer = Color(0xFFECFDF5)
val StatusUrgente          = Color(0xFFE65100)
val StatusUrgenteContainer = Color(0xFFFFF3E0)

// Legacy aliases — compatibilidad con código existente
val Primary80        = NavyPrimary
val Primary60        = NavyPrimaryVar
val Primary40        = Color(0xFF4B6FA8)
val Primary20        = NavyLight
val PrimaryContainer = NavyLight
val Surface          = BgLight
val SurfaceContainer = CardWhite
val OnSurface        = TextPrimary
val OnSurfaceVariant = TextSecondary
val Outline          = BorderColor
val Success          = StatusCompletado
val SuccessContainer = StatusCompletadoContainer
val Warning          = OrangeAccent
val WarningContainer = OrangeAccentContainer
val Error            = Color(0xFFC62828)
val ErrorContainer   = Color(0xFFFFEBEE)

// Dark theme
val Primary80Dark = Color(0xFF90CAF9)
val SurfaceDark   = Color(0xFF111827)
val OnSurfaceDark = Color(0xFFF9FAFB)
