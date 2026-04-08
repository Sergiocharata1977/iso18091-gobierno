package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ClienteResumenDto(
    @SerializedName("id") val id: String,
    @SerializedName("razon_social") val razonSocial: String,
    @SerializedName("nombre_comercial") val nombreComercial: String?,
    @SerializedName("cuit_cuil") val cuitCuil: String?,
    @SerializedName("tipo_cliente") val tipoCliente: String?,
    @SerializedName("categoria_riesgo") val categoriaRiesgo: String?,
    @SerializedName("estado") val estado: EstadoDto?,
    @SerializedName("responsable") val responsable: PersonaDto?,
    @SerializedName("contacto") val contacto: ContactoDto?,
    @SerializedName("oportunidad") val oportunidad: OportunidadComercialDto?,
    @SerializedName("proxima_accion") val proximaAccion: ProximaAccionDto?,
    @SerializedName("ultima_interaccion") val ultimaInteraccion: String?,
    @SerializedName("updated_at") val updatedAt: String?,
)

data class ClienteDetalleDto(
    @SerializedName("id") val id: String,
    @SerializedName("razon_social") val razonSocial: String,
    @SerializedName("nombre_comercial") val nombreComercial: String?,
    @SerializedName("cuit_cuil") val cuitCuil: String?,
    @SerializedName("tipo_cliente") val tipoCliente: String?,
    @SerializedName("categoria_riesgo") val categoriaRiesgo: String?,
    @SerializedName("estado") val estado: EstadoDto?,
    @SerializedName("responsable") val responsable: PersonaDto?,
    @SerializedName("contacto") val contacto: ContactoDto?,
    @SerializedName("oportunidad") val oportunidad: OportunidadComercialDto?,
    @SerializedName("proxima_accion") val proximaAccion: ProximaAccionDto?,
    @SerializedName("ultima_interaccion") val ultimaInteraccion: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("direccion") val direccion: DireccionDto?,
    @SerializedName("notas") val notas: String?,
    @SerializedName("productos_interes") val productosInteres: List<String>?,
)

data class EstadoDto(
    @SerializedName("id") val id: String?,
    @SerializedName("nombre") val nombre: String?,
    @SerializedName("color") val color: String?,
)

data class PersonaDto(
    @SerializedName("id") val id: String?,
    @SerializedName("nombre") val nombre: String?,
)

data class ContactoDto(
    @SerializedName("email") val email: String?,
    @SerializedName("telefono") val telefono: String?,
    @SerializedName("whatsapp_phone") val whatsappPhone: String?,
    @SerializedName("preferred_channel") val preferredChannel: String?,
)

data class OportunidadComercialDto(
    @SerializedName("monto_estimado_compra") val montoEstimadoCompra: Double?,
    @SerializedName("probabilidad_conversion") val probabilidadConversion: Int?,
    @SerializedName("fecha_cierre_estimada") val fechaCierreEstimada: String?,
)

data class ProximaAccionDto(
    @SerializedName("tipo") val tipo: String?,
    @SerializedName("fecha_programada") val fechaProgramada: String?,
    @SerializedName("descripcion") val descripcion: String?,
)

data class DireccionDto(
    @SerializedName("direccion") val direccion: String?,
    @SerializedName("localidad") val localidad: String?,
    @SerializedName("provincia") val provincia: String?,
    @SerializedName("codigo_postal") val codigoPostal: String?,
)
