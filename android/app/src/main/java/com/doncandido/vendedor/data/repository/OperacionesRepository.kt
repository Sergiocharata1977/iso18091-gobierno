package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.CatalogoProductoDao
import com.doncandido.vendedor.data.local.dao.CompraOperacionDao
import com.doncandido.vendedor.data.local.dao.MapaClienteDao
import com.doncandido.vendedor.data.local.dao.SolicitudEvidenciaDao
import com.doncandido.vendedor.data.local.dao.SolicitudOperacionDao
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.data.local.entities.CatalogoProductoEntity
import com.doncandido.vendedor.data.local.entities.CompraOperacionEntity
import com.doncandido.vendedor.data.local.entities.MapaClienteEntity
import com.doncandido.vendedor.data.local.entities.SolicitudEvidenciaEntity
import com.doncandido.vendedor.data.local.entities.SolicitudOperacionEntity
import com.doncandido.vendedor.data.local.entities.SyncQueueEntity
import com.doncandido.vendedor.data.remote.OperacionesApiService
import com.doncandido.vendedor.data.remote.dto.CatalogoProductoDto
import com.doncandido.vendedor.data.remote.dto.ClienteMapaDto
import com.doncandido.vendedor.data.remote.dto.CompraOperacionDto
import com.doncandido.vendedor.data.remote.dto.EvidenciaOperacionDto
import com.doncandido.vendedor.data.remote.dto.PatchSolicitudOperacionRequest
import com.doncandido.vendedor.data.remote.dto.SolicitudDetalleDto
import com.doncandido.vendedor.data.remote.dto.SolicitudResumenDto
import com.doncandido.vendedor.domain.model.CatalogoProductoOperacion
import com.doncandido.vendedor.domain.model.ClienteMapaOperacion
import com.doncandido.vendedor.domain.model.CompraOperacion
import com.doncandido.vendedor.domain.model.EvidenciaOperacion
import com.doncandido.vendedor.domain.model.SolicitudOperacion
import com.doncandido.vendedor.domain.repository.IOperacionesRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OperacionesRepository @Inject constructor(
    private val api: OperacionesApiService,
    private val sessionManager: SessionManager,
    private val solicitudDao: SolicitudOperacionDao,
    private val evidenciaDao: SolicitudEvidenciaDao,
    private val compraDao: CompraOperacionDao,
    private val catalogoDao: CatalogoProductoDao,
    private val mapaDao: MapaClienteDao,
    private val syncQueueDao: SyncQueueDao,
) : IOperacionesRepository {

    override fun getSolicitudes(
        tipo: String?,
        estado: String?,
        query: String?,
    ): Flow<Resource<List<SolicitudOperacion>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val localQuery = query?.trim()?.takeIf { it.isNotBlank() }
        val cached = solicitudDao.query(orgId, tipo, estado, localQuery)
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        try {
            val response = api.getSolicitudes(
                tipo = tipo,
                estado = estado,
                query = localQuery,
                updatedAfter = solicitudDao.getLastUpdatedAt(orgId),
            )
            solicitudDao.upsertAll(response.data.map { it.toEntity(orgId) })
            emit(Resource.Success(solicitudDao.query(orgId, tipo, estado, localQuery).map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "No se pudieron cargar las solicitudes."))
            }
        }
    }

    override suspend fun getSolicitudById(id: String): Resource<SolicitudOperacion> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val cached = solicitudDao.getById(id)
        val cachedEvidencias = evidenciaDao.getBySolicitud(id)

        return try {
            val detalle = api.getSolicitudById(id).data
            val evidencias = api.getSolicitudEvidencias(
                id = id,
                updatedAfter = evidenciaDao.getLastUpdatedAt(id),
            ).data
            solicitudDao.upsert(detalle.toEntity(orgId))
            evidenciaDao.upsertAll(evidencias.map { it.toEntity(orgId) })
            val fresh = solicitudDao.getById(id)?.toDomain(
                evidenciaDao.getBySolicitud(id).map { it.toDomain() }
            )
            if (fresh != null) Resource.Success(fresh)
            else Resource.Error("No se pudo cargar la solicitud.")
        } catch (e: Exception) {
            if (cached != null) {
                Resource.Success(cached.toDomain(cachedEvidencias.map { it.toDomain() }))
            } else {
                Resource.Error(e.message ?: "No se pudo cargar la solicitud.")
            }
        }
    }

    override suspend fun updateSolicitud(
        id: String,
        estado: String?,
        estadoOperativo: String?,
        prioridad: String?,
        updatedAt: String?,
        auditNote: String?,
    ): Resource<SolicitudOperacion> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val clientRequestId = UUID.randomUUID().toString()

        return try {
            val response = api.patchSolicitud(
                id = id,
                body = PatchSolicitudOperacionRequest(
                    estado = estado,
                    estadoOperativo = estadoOperativo,
                    prioridad = prioridad,
                    ifUnmodifiedSince = updatedAt,
                    clientRequestId = clientRequestId,
                    offlineAction = "cambios_estado",
                    auditNote = auditNote,
                )
            )
            solicitudDao.upsert(response.data.toEntity(orgId))
            val refreshed = getSolicitudById(id)
            if (refreshed is Resource.Success) refreshed
            else Resource.Success(response.data.toEntity(orgId).toDomain())
        } catch (e: Exception) {
            val current = solicitudDao.getById(id)
            if (current != null) {
                val optimistic = current.copy(
                    estado = estado ?: current.estado,
                    estadoOperativo = estadoOperativo ?: current.estadoOperativo,
                    prioridad = prioridad ?: current.prioridad,
                    updatedAt = updatedAt ?: current.updatedAt,
                    isDetalleCargado = true,
                )
                solicitudDao.upsert(optimistic)
                syncQueueDao.enqueue(
                    SyncQueueEntity(
                        action = "actualizar_solicitud_operacion",
                        entityType = "solicitud_operacion",
                        entityId = id,
                        payload = listOf(
                            "estado=${estado.orEmpty()}",
                            "estado_operativo=${estadoOperativo.orEmpty()}",
                            "prioridad=${prioridad.orEmpty()}",
                            "updated_at=${updatedAt.orEmpty()}",
                            "audit_note=${auditNote.orEmpty()}",
                        ).joinToString("|"),
                        clientRequestId = clientRequestId,
                        organizationId = orgId,
                    )
                )
                val evidencias = evidenciaDao.getBySolicitud(id).map { it.toDomain() }
                Resource.Success(optimistic.toDomain(evidencias))
            } else {
                Resource.Error(e.message ?: "No se pudo actualizar la solicitud.")
            }
        }
    }

    override fun getCompras(
        estado: String?,
        prioridad: String?,
    ): Flow<Resource<List<CompraOperacion>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val cached = compraDao.query(orgId, estado, prioridad)
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        try {
            val response = api.getCompras(
                estado = estado,
                prioridad = prioridad,
                updatedAfter = compraDao.getLastUpdatedAt(orgId),
            )
            compraDao.upsertAll(response.data.map { it.toEntity(orgId) })
            emit(Resource.Success(compraDao.query(orgId, estado, prioridad).map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "No se pudieron cargar las compras."))
            }
        }
    }

    override fun getCatalogo(
        categoria: String?,
        query: String?,
    ): Flow<Resource<List<CatalogoProductoOperacion>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val localQuery = query?.trim()?.takeIf { it.isNotBlank() }
        val cached = catalogoDao.query(orgId, categoria, localQuery)
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        try {
            val response = api.getCatalogo(
                categoria = categoria,
                query = localQuery,
                updatedAfter = catalogoDao.getLastUpdatedAt(orgId),
            )
            catalogoDao.upsertAll(response.data.map { it.toEntity(orgId) })
            emit(Resource.Success(catalogoDao.query(orgId, categoria, localQuery).map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "No se pudo cargar el catalogo."))
            }
        }
    }

    override fun getClientesMapa(query: String?): Flow<Resource<List<ClienteMapaOperacion>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        val localQuery = query?.trim()?.takeIf { it.isNotBlank() }
        val cached = mapaDao.query(orgId, localQuery)
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        try {
            val response = api.getMapaClientes(
                query = localQuery,
                updatedAfter = mapaDao.getLastUpdatedAt(orgId),
            )
            mapaDao.upsertAll(response.data.map { it.toEntity(orgId) })
            emit(Resource.Success(mapaDao.query(orgId, localQuery).map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "No se pudo cargar el mapa de clientes."))
            }
        }
    }
}

private fun SolicitudResumenDto.toEntity(orgId: String) = SolicitudOperacionEntity(
    id = id,
    organizationId = orgId,
    numero = numero,
    tipo = tipo,
    flujo = flujo,
    estado = estado,
    estadoOperativo = estadoOperativo,
    prioridad = prioridad,
    nombre = nombre,
    telefono = telefono,
    email = email,
    assignedTo = assignedTo,
    crmSyncStatus = crmSyncStatus,
    crmOportunidadId = crmOportunidadId,
    mensaje = null,
    updatedAt = updatedAt,
    createdAt = createdAt,
    isDetalleCargado = false,
)

private fun SolicitudDetalleDto.toEntity(orgId: String) = SolicitudOperacionEntity(
    id = id,
    organizationId = orgId,
    numero = numero,
    tipo = tipo,
    flujo = flujo,
    estado = estado,
    estadoOperativo = estadoOperativo,
    prioridad = prioridad,
    nombre = nombre,
    telefono = telefono,
    email = email,
    assignedTo = assignedTo,
    crmSyncStatus = crmSyncStatus,
    crmOportunidadId = crmOportunidadId,
    mensaje = mensaje,
    updatedAt = updatedAt,
    createdAt = createdAt,
    isDetalleCargado = true,
)

private fun EvidenciaOperacionDto.toEntity(orgId: String) = SolicitudEvidenciaEntity(
    id = id,
    solicitudId = solicitudId,
    organizationId = orgId,
    type = type,
    label = label,
    fileName = fileName,
    mimeType = mimeType,
    sizeBytes = sizeBytes ?: 0L,
    url = url,
    createdAt = createdAt,
    updatedAt = createdAt,
)

private fun CompraOperacionDto.toEntity(orgId: String) = CompraOperacionEntity(
    id = id,
    organizationId = orgId,
    numero = numero,
    tipo = tipo,
    estado = estado,
    prioridad = prioridad,
    solicitanteNombre = solicitanteNombre,
    area = area,
    motivo = motivo,
    proveedorNombre = proveedorNombre,
    montoEstimado = montoEstimado,
    moneda = moneda,
    updatedAt = updatedAt,
    createdAt = createdAt,
)

private fun CatalogoProductoDto.toEntity(orgId: String) = CatalogoProductoEntity(
    id = id,
    organizationId = orgId,
    nombre = nombre,
    descripcion = descripcion,
    categoria = categoria,
    marca = marca,
    modelo = modelo,
    precioContado = precioContado,
    precioLista = precioLista,
    stock = stock,
    activo = activo ?: true,
    destacado = destacado ?: false,
    updatedAt = updatedAt,
)

private fun ClienteMapaDto.toEntity(orgId: String) = MapaClienteEntity(
    id = id,
    organizationId = orgId,
    razonSocial = razonSocial,
    nombreComercial = nombreComercial,
    responsableNombre = responsable?.nombre,
    direccion = direccion?.direccion,
    localidad = direccion?.localidad,
    provincia = direccion?.provincia,
    telefono = contacto?.telefono,
    whatsappPhone = contacto?.whatsappPhone,
    lat = coordenadas?.lat,
    lng = coordenadas?.lng,
    geocodingStatus = geocodingStatus,
    updatedAt = updatedAt,
)

private fun SolicitudOperacionEntity.toDomain(
    evidencias: List<EvidenciaOperacion> = emptyList(),
) = SolicitudOperacion(
    id = id,
    numero = numero,
    tipo = tipo,
    flujo = flujo,
    estado = estado,
    estadoOperativo = estadoOperativo,
    prioridad = prioridad,
    nombre = nombre,
    telefono = telefono,
    email = email,
    assignedTo = assignedTo,
    crmSyncStatus = crmSyncStatus,
    crmOportunidadId = crmOportunidadId,
    mensaje = mensaje,
    updatedAt = updatedAt,
    createdAt = createdAt,
    evidencias = evidencias,
    isDetalleCargado = isDetalleCargado,
)

private fun SolicitudEvidenciaEntity.toDomain() = EvidenciaOperacion(
    id = id,
    solicitudId = solicitudId,
    type = type,
    label = label,
    fileName = fileName,
    mimeType = mimeType,
    sizeBytes = sizeBytes,
    url = url,
    createdAt = createdAt,
)

private fun CompraOperacionEntity.toDomain() = CompraOperacion(
    id = id,
    numero = numero,
    tipo = tipo,
    estado = estado,
    prioridad = prioridad,
    solicitanteNombre = solicitanteNombre,
    area = area,
    motivo = motivo,
    proveedorNombre = proveedorNombre,
    montoEstimado = montoEstimado,
    moneda = moneda,
    updatedAt = updatedAt,
    createdAt = createdAt,
)

private fun CatalogoProductoEntity.toDomain() = CatalogoProductoOperacion(
    id = id,
    nombre = nombre,
    descripcion = descripcion,
    categoria = categoria,
    marca = marca,
    modelo = modelo,
    precioContado = precioContado,
    precioLista = precioLista,
    stock = stock,
    activo = activo,
    destacado = destacado,
    updatedAt = updatedAt,
)

private fun MapaClienteEntity.toDomain() = ClienteMapaOperacion(
    id = id,
    razonSocial = razonSocial,
    nombreComercial = nombreComercial,
    responsableNombre = responsableNombre,
    direccion = direccion,
    localidad = localidad,
    provincia = provincia,
    telefono = telefono,
    whatsappPhone = whatsappPhone,
    lat = lat,
    lng = lng,
    geocodingStatus = geocodingStatus,
    updatedAt = updatedAt,
)

@Module
@InstallIn(SingletonComponent::class)
abstract class OperacionesRepositoryModule {
    @Binds
    abstract fun bindOperacionesRepository(impl: OperacionesRepository): IOperacionesRepository
}
