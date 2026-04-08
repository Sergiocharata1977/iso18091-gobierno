package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class AccionResumenDto(
    @SerializedName("id") val id: String,
    @SerializedName("cliente") val cliente: PersonaDto?,
    @SerializedName("oportunidad") val oportunidad: OportunidadRefDto?,
    @SerializedName("responsable") val responsable: PersonaDto?,
    @SerializedName("tipo") val tipo: String,
    @SerializedName("canal") val canal: String,
    @SerializedName("titulo") val titulo: String,
    @SerializedName("descripcion") val descripcion: String?,
    @SerializedName("resultado") val resultado: String?,
    @SerializedName("estado") val estado: String?,
    @SerializedName("fecha_programada") val fechaProgramada: String?,
    @SerializedName("fecha_realizada") val fechaRealizada: String?,
    @SerializedName("duracion_min") val duracionMin: Int?,
    @SerializedName("tags") val tags: List<String>?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class OportunidadRefDto(
    @SerializedName("id") val id: String?,
    @SerializedName("titulo") val titulo: String?,
)

data class CreateAccionRequest(
    @SerializedName("tipo") val tipo: String,
    @SerializedName("canal") val canal: String,
    @SerializedName("titulo") val titulo: String,
    @SerializedName("descripcion") val descripcion: String?,
    @SerializedName("cliente_id") val clienteId: String?,
    @SerializedName("cliente_nombre") val clienteNombre: String?,
    @SerializedName("oportunidad_id") val oportunidadId: String?,
    @SerializedName("oportunidad_titulo") val oportunidadTitulo: String?,
    @SerializedName("vendedor_id") val vendedorId: String,
    @SerializedName("vendedor_nombre") val vendedorNombre: String?,
    @SerializedName("fecha_programada") val fechaProgramada: String?,
    @SerializedName("estado") val estado: String?,
    @SerializedName("offline_action") val offlineAction: String = "crear_accion",
    @SerializedName("client_request_id") val clientRequestId: String,
)

data class PatchClienteRequest(
    @SerializedName("offline_action") val offlineAction: String = "agregar_nota",
    @SerializedName("append_note") val appendNote: String,
    @SerializedName("if_unmodified_since") val ifUnmodifiedSince: String?,
    @SerializedName("client_request_id") val clientRequestId: String,
)
