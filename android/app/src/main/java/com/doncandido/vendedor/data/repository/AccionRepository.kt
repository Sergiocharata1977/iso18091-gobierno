package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.AccionDao
import com.doncandido.vendedor.data.remote.CrmApiService
import com.doncandido.vendedor.data.remote.dto.CreateAccionRequest
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.repository.IAccionRepository
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
class AccionRepository @Inject constructor(
    private val api: CrmApiService,
    private val dao: AccionDao,
    private val sessionManager: SessionManager,
) : IAccionRepository {

    override fun getAcciones(
        responsableId: String?,
        clienteId: String?,
        oportunidadId: String?,
        estado: String?,
    ): Flow<Resource<List<Accion>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""

        // 1. Emit from cache
        val cached = when {
            oportunidadId != null -> dao.getByOportunidad(orgId, oportunidadId)
            clienteId != null -> dao.getByCliente(orgId, clienteId)
            responsableId != null -> dao.getByResponsable(orgId, responsableId)
            else -> dao.getAll(orgId)
        }
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        // 2. Sync from network
        try {
            val updatedAfter = dao.getLastUpdatedAt(orgId)
            val response = api.getAcciones(
                responsableId = responsableId,
                clienteId = clienteId,
                oportunidadId = oportunidadId,
                estado = estado,
                updatedAfter = updatedAfter,
            )
            dao.upsertAll(response.data.map { it.toEntity(orgId) })
            val fresh = when {
                oportunidadId != null -> dao.getByOportunidad(orgId, oportunidadId)
                clienteId != null -> dao.getByCliente(orgId, clienteId)
                responsableId != null -> dao.getByResponsable(orgId, responsableId)
                else -> dao.getAll(orgId)
            }
            emit(Resource.Success(fresh.map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "Error al cargar acciones."))
            }
        }
    }

    override suspend fun createAccion(
        tipo: String,
        canal: String,
        titulo: String,
        descripcion: String?,
        clienteId: String?,
        clienteNombre: String?,
        oportunidadId: String?,
        oportunidadTitulo: String?,
        vendedorId: String,
        vendedorNombre: String?,
        fechaProgramada: String?,
    ): Resource<Accion> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        return try {
            val response = api.createAccion(
                CreateAccionRequest(
                    tipo = tipo,
                    canal = canal,
                    titulo = titulo,
                    descripcion = descripcion,
                    clienteId = clienteId,
                    clienteNombre = clienteNombre,
                    oportunidadId = oportunidadId,
                    oportunidadTitulo = oportunidadTitulo,
                    vendedorId = vendedorId,
                    vendedorNombre = vendedorNombre,
                    fechaProgramada = fechaProgramada,
                    estado = "programada",
                    clientRequestId = UUID.randomUUID().toString(),
                )
            )
            val entity = response.data.toEntity(orgId)
            dao.upsert(entity)
            Resource.Success(entity.toDomain())
        } catch (e: Exception) {
            Resource.Error(e.message ?: "No se pudo crear la accion.")
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AccionRepositoryModule {
    @Binds
    abstract fun bindAccionRepository(impl: AccionRepository): IAccionRepository
}
