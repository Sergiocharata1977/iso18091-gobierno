package com.doncandido.vendedor.domain.model

data class GovMonitorResumen(
    val totalExpedientes: Int,
    val expedientesUrgentes: Int,
    val serviciosActivos: Int,
    val alertasCiudadanas: Int,
    val ultimaActualizacion: String? = null,
)

data class GovExpediente(
    val id: String,
    val numero: String,
    val asunto: String,
    val estado: String,
    val areaResponsable: String,
    val prioridad: String? = null,
    val updatedAt: String? = null,
)

data class GovServicio(
    val id: String,
    val nombre: String,
    val descripcion: String,
    val categoria: String,
    val nivelDigitalizacion: String,
    val disponible24h: Boolean,
)

data class GovPerfilResumen(
    val dependencia: String,
    val rol: String,
    val entorno: String,
)
