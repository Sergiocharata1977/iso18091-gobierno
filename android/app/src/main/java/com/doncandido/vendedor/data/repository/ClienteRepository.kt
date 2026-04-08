package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.ClienteDao
import com.doncandido.vendedor.data.remote.CrmApiService
import com.doncandido.vendedor.data.remote.dto.PatchClienteRequest
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.repository.IClienteRepository
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
class ClienteRepository @Inject constructor(
    private val api: CrmApiService,
    private val dao: ClienteDao,
    private val sessionManager: SessionManager,
) : IClienteRepository {

    override fun getClientes(
        query: String?,
        responsableId: String?,
    ): Flow<Resource<List<Cliente>>> = flow {
        emit(Resource.Loading)
        val orgId = sessionManager.orgId.firstOrNull() ?: ""

        // 1. Emit from cache immediately
        val cached = if (!query.isNullOrBlank()) {
            dao.search(orgId, query)
        } else if (responsableId != null) {
            dao.getByResponsable(orgId, responsableId)
        } else {
            dao.getAll(orgId)
        }
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        // 2. Fetch delta from network
        try {
            val updatedAfter = dao.getLastUpdatedAt(orgId)
            val response = api.getClientes(
                q = query,
                responsableId = responsableId,
                updatedAfter = updatedAfter,
            )
            dao.upsertAll(response.data.map { it.toEntity(orgId) })
            // 3. Emit fresh from cache
            val fresh = if (!query.isNullOrBlank()) {
                dao.search(orgId, query)
            } else if (responsableId != null) {
                dao.getByResponsable(orgId, responsableId)
            } else {
                dao.getAll(orgId)
            }
            emit(Resource.Success(fresh.map { it.toDomain() }))
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "Error al cargar clientes."))
            }
            // else keep cached data — no error shown
        }
    }

    override suspend fun getClienteById(id: String): Resource<Cliente> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""

        // Emit cached first if has detalle
        val cached = dao.getById(id)
        if (cached?.isDetalleCargado == true) {
            // Refresh in background but return cached immediately
            try {
                val response = api.getClienteById(id)
                dao.upsert(response.data.toEntity(orgId))
                return Resource.Success(dao.getById(id)!!.toDomain())
            } catch (e: Exception) {
                return Resource.Success(cached.toDomain())
            }
        }

        // No cache or only summary — fetch from network
        return try {
            val response = api.getClienteById(id)
            dao.upsert(response.data.toEntity(orgId))
            Resource.Success(response.data.toEntity(orgId).toDomain())
        } catch (e: Exception) {
            if (cached != null) Resource.Success(cached.toDomain())
            else Resource.Error(e.message ?: "No se pudo cargar el cliente.")
        }
    }

    override suspend fun agregarNota(
        clienteId: String,
        nota: String,
        updatedAt: String?,
    ): Resource<Cliente> {
        val orgId = sessionManager.orgId.firstOrNull() ?: ""
        return try {
            val response = api.patchCliente(
                id = clienteId,
                body = PatchClienteRequest(
                    appendNote = nota,
                    ifUnmodifiedSince = updatedAt,
                    clientRequestId = UUID.randomUUID().toString(),
                )
            )
            dao.upsert(response.data.toEntity(orgId))
            Resource.Success(response.data.toEntity(orgId).toDomain())
        } catch (e: Exception) {
            val msg = if (e.message?.contains("409") == true) {
                "conflict"
            } else {
                e.message ?: "No se pudo guardar la nota."
            }
            Resource.Error(msg)
        }
    }

    override suspend fun syncPending() {
        // SyncQueue processing — implemented in SyncWorker (Ola 4)
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class ClienteRepositoryModule {
    @Binds
    abstract fun bindClienteRepository(impl: ClienteRepository): IClienteRepository
}
