package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class OportunidadResumenDto(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("descripcion") val descripcion: String?,
    @SerializedName("cliente") val cliente: ClienteRefDto?,
    @SerializedName("contacto") val contacto: PersonaDto?,
    @SerializedName("responsable") val responsable: PersonaDto?,
    @SerializedName("estado") val estado: EstadoDto?,
    @SerializedName("monto_estimado") val montoEstimado: Double?,
    @SerializedName("probabilidad") val probabilidad: Int?,
    @SerializedName("fecha_cierre_estimada") val fechaCierreEstimada: String?,
    @SerializedName("resultado") val resultado: String?,
    @SerializedName("updated_at") val updatedAt: String?,
)

data class OportunidadDetalleDto(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("descripcion") val descripcion: String?,
    @SerializedName("cliente") val cliente: ClienteRefDto?,
    @SerializedName("contacto") val contacto: PersonaDto?,
    @SerializedName("responsable") val responsable: PersonaDto?,
    @SerializedName("estado") val estado: EstadoDto?,
    @SerializedName("monto_estimado") val montoEstimado: Double?,
    @SerializedName("probabilidad") val probabilidad: Int?,
    @SerializedName("fecha_cierre_estimada") val fechaCierreEstimada: String?,
    @SerializedName("resultado") val resultado: String?,
    @SerializedName("motivo_cierre") val motivoCierre: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("productos_interes") val productosInteres: List<String>?,
    @SerializedName("historial_estados") val historialEstados: List<HistorialEstadoDto>?,
)

data class ClienteRefDto(
    @SerializedName("id") val id: String?,
    @SerializedName("nombre") val nombre: String?,
    @SerializedName("cuit") val cuit: String?,
)

data class HistorialEstadoDto(
    @SerializedName("estado_id") val estadoId: String?,
    @SerializedName("estado_nombre") val estadoNombre: String?,
    @SerializedName("timestamp") val timestamp: String?,
    @SerializedName("usuario_nombre") val usuarioNombre: String?,
)

data class PatchOportunidadRequest(
    @SerializedName("offline_action") val offlineAction: String,
    @SerializedName("estado_nuevo_id") val estadoNuevoId: String,
    @SerializedName("estado_nuevo_nombre") val estadoNuevoNombre: String,
    @SerializedName("estado_nuevo_color") val estadoNuevoColor: String,
    @SerializedName("if_unmodified_since") val ifUnmodifiedSince: String?,
    @SerializedName("client_request_id") val clientRequestId: String,
)
