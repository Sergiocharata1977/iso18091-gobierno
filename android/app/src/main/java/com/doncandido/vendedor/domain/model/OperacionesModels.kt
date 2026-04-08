package com.doncandido.vendedor.domain.model

data class SolicitudOperacion(
    val id: String,
    val numero: Int?,
    val tipo: String,
    val flujo: String?,
    val estado: String,
    val estadoOperativo: String?,
    val prioridad: String?,
    val nombre: String,
    val telefono: String?,
    val email: String?,
    val assignedTo: String?,
    val crmSyncStatus: String?,
    val crmOportunidadId: String?,
    val mensaje: String?,
    val updatedAt: String?,
    val createdAt: String?,
    val evidencias: List<EvidenciaOperacion> = emptyList(),
    val isDetalleCargado: Boolean = false,
)

data class EvidenciaOperacion(
    val id: String,
    val solicitudId: String,
    val type: String,
    val label: String,
    val fileName: String,
    val mimeType: String?,
    val sizeBytes: Long,
    val url: String?,
    val createdAt: String?,
)

data class CompraOperacion(
    val id: String,
    val numero: Int?,
    val tipo: String,
    val estado: String,
    val prioridad: String,
    val solicitanteNombre: String,
    val area: String,
    val motivo: String,
    val proveedorNombre: String?,
    val montoEstimado: Double?,
    val moneda: String?,
    val updatedAt: String?,
    val createdAt: String?,
)

data class CatalogoProductoOperacion(
    val id: String,
    val nombre: String,
    val descripcion: String?,
    val categoria: String?,
    val marca: String?,
    val modelo: String?,
    val precioContado: Double?,
    val precioLista: Double?,
    val stock: Double?,
    val activo: Boolean,
    val destacado: Boolean,
    val updatedAt: String?,
)

data class ClienteMapaOperacion(
    val id: String,
    val razonSocial: String,
    val nombreComercial: String?,
    val responsableNombre: String?,
    val direccion: String?,
    val localidad: String?,
    val provincia: String?,
    val telefono: String?,
    val whatsappPhone: String?,
    val lat: Double?,
    val lng: Double?,
    val geocodingStatus: String?,
    val updatedAt: String?,
)
