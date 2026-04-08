package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class BootstrapUserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String?,
    @SerializedName("role") val role: String,
    @SerializedName("permissions") val permissions: List<String> = emptyList(),
)

data class BootstrapOrganizationDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("slug") val slug: String?,
    @SerializedName("tenant_type") val tenantType: String?,
)

data class BootstrapOperationalProfileDto(
    @SerializedName("key") val key: String,
    @SerializedName("label") val label: String,
    @SerializedName("can_convert_to_crm") val canConvertToCrm: Boolean,
    @SerializedName("can_manage_assignments") val canManageAssignments: Boolean,
    @SerializedName("can_manage_purchases") val canManagePurchases: Boolean,
)

data class BootstrapRolesDto(
    @SerializedName("platform_role") val platformRole: String,
    @SerializedName("operational_profile") val operationalProfile: String,
    @SerializedName("effective_roles") val effectiveRoles: List<String> = emptyList(),
)

data class BootstrapFeatureFlagsDto(
    @SerializedName("solicitudes") val solicitudes: Boolean,
    @SerializedName("evidencias") val evidencias: Boolean,
    @SerializedName("compras") val compras: Boolean,
    @SerializedName("catalogo") val catalogo: Boolean,
    @SerializedName("mapa_clientes") val mapaClientes: Boolean,
    @SerializedName("crm_handoff") val crmHandoff: Boolean,
    @SerializedName("offline_sync") val offlineSync: Boolean,
)

data class BootstrapCrmIntegrationDto(
    @SerializedName("active") val active: Boolean,
    @SerializedName("installed") val installed: Boolean,
    @SerializedName("namespace") val namespace: String,
    @SerializedName("can_convert_from_operaciones") val canConvertFromOperaciones: Boolean,
    @SerializedName("shared_events") val sharedEvents: List<String> = emptyList(),
    @SerializedName("source") val source: String,
)

data class BootstrapIntegrationsDto(
    @SerializedName("crm") val crm: BootstrapCrmIntegrationDto,
)

data class OperacionesBootstrapDto(
    @SerializedName("user") val user: BootstrapUserDto,
    @SerializedName("organization") val organization: BootstrapOrganizationDto,
    @SerializedName("operational_profile") val operationalProfile: BootstrapOperationalProfileDto,
    @SerializedName("roles") val roles: BootstrapRolesDto,
    @SerializedName("feature_flags") val featureFlags: BootstrapFeatureFlagsDto,
    @SerializedName("modules") val modules: List<MobileModuleDto> = emptyList(),
    @SerializedName("integrations") val integrations: BootstrapIntegrationsDto,
)

data class SolicitudResumenDto(
    @SerializedName("id") val id: String,
    @SerializedName("numero") val numero: Int?,
    @SerializedName("tipo") val tipo: String,
    @SerializedName("flujo") val flujo: String?,
    @SerializedName("estado") val estado: String,
    @SerializedName("estado_operativo") val estadoOperativo: String?,
    @SerializedName("prioridad") val prioridad: String?,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("telefono") val telefono: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("assigned_to") val assignedTo: String?,
    @SerializedName("crm_sync_status") val crmSyncStatus: String?,
    @SerializedName("crm_oportunidad_id") val crmOportunidadId: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class SolicitudDetalleDto(
    @SerializedName("id") val id: String,
    @SerializedName("numero") val numero: Int?,
    @SerializedName("tipo") val tipo: String,
    @SerializedName("flujo") val flujo: String?,
    @SerializedName("estado") val estado: String,
    @SerializedName("estado_operativo") val estadoOperativo: String?,
    @SerializedName("prioridad") val prioridad: String?,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("telefono") val telefono: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("assigned_to") val assignedTo: String?,
    @SerializedName("crm_sync_status") val crmSyncStatus: String?,
    @SerializedName("crm_oportunidad_id") val crmOportunidadId: String?,
    @SerializedName("mensaje") val mensaje: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class EvidenciaOperacionDto(
    @SerializedName("id") val id: String,
    @SerializedName("solicitud_id") val solicitudId: String,
    @SerializedName("type") val type: String,
    @SerializedName("label") val label: String,
    @SerializedName("file_name") val fileName: String,
    @SerializedName("mime_type") val mimeType: String?,
    @SerializedName("size_bytes") val sizeBytes: Long?,
    @SerializedName("url") val url: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class CompraOperacionDto(
    @SerializedName("id") val id: String,
    @SerializedName("numero") val numero: Int?,
    @SerializedName("tipo") val tipo: String,
    @SerializedName("estado") val estado: String,
    @SerializedName("prioridad") val prioridad: String,
    @SerializedName("solicitante_nombre") val solicitanteNombre: String,
    @SerializedName("area") val area: String,
    @SerializedName("motivo") val motivo: String,
    @SerializedName("proveedor_nombre") val proveedorNombre: String?,
    @SerializedName("monto_estimado") val montoEstimado: Double?,
    @SerializedName("moneda") val moneda: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class CatalogoProductoDto(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("descripcion") val descripcion: String?,
    @SerializedName("categoria") val categoria: String?,
    @SerializedName("marca") val marca: String?,
    @SerializedName("modelo") val modelo: String?,
    @SerializedName("precio_contado") val precioContado: Double?,
    @SerializedName("precio_lista") val precioLista: Double?,
    @SerializedName("stock") val stock: Double?,
    @SerializedName("activo") val activo: Boolean?,
    @SerializedName("destacado") val destacado: Boolean?,
    @SerializedName("updated_at") val updatedAt: String?,
)

data class ResponsableDto(
    @SerializedName("nombre") val nombre: String?,
)

data class DireccionOpDto(
    @SerializedName("direccion") val direccion: String?,
    @SerializedName("localidad") val localidad: String?,
    @SerializedName("provincia") val provincia: String?,
)

data class ContactoOpDto(
    @SerializedName("telefono") val telefono: String?,
    @SerializedName("whatsapp_phone") val whatsappPhone: String?,
)

data class CoordenadasDto(
    @SerializedName("lat") val lat: Double?,
    @SerializedName("lng") val lng: Double?,
)

data class ClienteMapaDto(
    @SerializedName("id") val id: String,
    @SerializedName("razon_social") val razonSocial: String,
    @SerializedName("nombre_comercial") val nombreComercial: String?,
    @SerializedName("responsable") val responsable: ResponsableDto?,
    @SerializedName("direccion") val direccion: DireccionOpDto?,
    @SerializedName("contacto") val contacto: ContactoOpDto?,
    @SerializedName("coordenadas") val coordenadas: CoordenadasDto?,
    @SerializedName("geocoding_status") val geocodingStatus: String?,
    @SerializedName("updated_at") val updatedAt: String?,
)

data class PatchSolicitudOperacionRequest(
    @SerializedName("estado") val estado: String? = null,
    @SerializedName("estado_operativo") val estadoOperativo: String? = null,
    @SerializedName("prioridad") val prioridad: String? = null,
    @SerializedName("if_unmodified_since") val ifUnmodifiedSince: String? = null,
    @SerializedName("client_request_id") val clientRequestId: String,
    @SerializedName("offline_action") val offlineAction: String? = null,
    @SerializedName("audit_note") val auditNote: String? = null,
)
