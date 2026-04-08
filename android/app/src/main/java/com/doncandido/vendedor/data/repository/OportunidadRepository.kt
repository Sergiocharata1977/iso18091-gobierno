package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.OportunidadDao
import com.doncandido.vendedor.data.remote.CrmApiService
import com.doncandido.vendedor.data.remote.dto.PatchOportunidadRequest
import com.doncandido.vendedor.domain.model.Oportunidad
import com.doncandido.vendedor.domain.repository.IOportunidadRepository
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
class OportunidadRepository @Inject constructor(
    private val api: CrmApiService,
    private val dao: OportunidadDao,
    private val sessionManager: SessionManager,
) : IOportunidadRepository {

    override fun getOportunidades(
        estadoId: String?,
        responsableId: String?,
        clienteId: String?,
    ): Flow<Resource<List<Oportunidad>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""

        // 1. Emit from cache
        val cached = when {
            estadoId != null -> dao.getByEstado(orgId, estadoId)
            responsableId != null -> dao.getByResponsable(orgId, responsableId)
            clienteId != null -> dao.getByCliente(orgId, clienteId)
            else -> dao.getAll(orgId)
        }
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        // 2. Sync from network
        try {
            val updatedAfter = dao.getLastUpdatedAt(orgId)
            val response = api.getOportunidades(
                estadoId = estadoId,
                responsableId = responsableId,
                clienteId = clienteId,
                updatedAfter = updatedAfter,
            )
            dao.upsertAll(response.data.map { it.toEntity(orgId) })
            val fresh = when {
                estadoId != null -> dao.getByEstado(orgId, estadoId)
                responsableId != null -> dao.getByResponsable(orgId, responsableId)
                clienteId != null -> dao.getByCliente(orgId, clienteId)
                else -> dao.getAll(orgId)
            }
            emit(Resource.Success(fresh.map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "Error al cargar oportunidades."))
            }
        }
    }

    override suspend fun getOportunidadById(id: String): Resource<Oportunidad> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        return try {
            val response = api.getOportunidadById(id)
            dao.upsert(response.data.toEntity(orgId))
            val detalle = response.data.toEntity(orgId).toDomain()
                .copy(historialEstados = response.data.toHistorial())
            Resource.Success(detalle)
        } catch (e: Exception) {
            val cached = dao.getById(id)
            if (cached != null) Resource.Success(cached.toDomain())
            else Resource.Error(e.message ?: "No se pudo cargar la oportunidad.")
        }
    }

    override suspend fun cambiarEtapa(
        oportunidadId: String,
        nuevoEstadoId: String,
        nuevoEstadoNombre: String,
        nuevoEstadoColor: String,
        updatedAt: String?,
    ): Resource<Oportunidad> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""

        // Optimistic update in cache
        val current = dao.getById(oportunidadId)
        if (current != null) {
            dao.upsert(
                current.copy(
                    estadoId = nuevoEstadoId,
                    estadoNombre = nuevoEstadoNombre,
                    estadoColor = nuevoEstadoColor,
                )
            )
        }

        return try {
            val response = api.patchOportunidad(
                id = oportunidadId,
                body = PatchOportunidadRequest(
                    offlineAction = "cambiar_etapa_oportunidad",
                    estadoNuevoId = nuevoEstadoId,
                    estadoNuevoNombre = nuevoEstadoNombre,
                    estadoNuevoColor = nuevoEstadoColor,
                    ifUnmodifiedSince = updatedAt,
                    clientRequestId = UUID.randomUUID().toString(),
                )
            )
            dao.upsert(response.data.toEntity(orgId))
            Resource.Success(response.data.toEntity(orgId).toDomain())
        } catch (e: Exception) {
            // Rollback optimistic update
            if (current != null) dao.upsert(current)
            val msg = if (e.message?.contains("409") == true) "conflict"
            else e.message ?: "No se pudo cambiar la etapa."
            Resource.Error(msg)
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class OportunidadRepositoryModule {
    @Binds
    abstract fun bindOportunidadRepository(impl: OportunidadRepository): IOportunidadRepository
}
