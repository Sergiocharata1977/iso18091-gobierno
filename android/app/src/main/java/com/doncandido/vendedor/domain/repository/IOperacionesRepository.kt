package com.doncandido.vendedor.domain.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.CatalogoProductoOperacion
import com.doncandido.vendedor.domain.model.ClienteMapaOperacion
import com.doncandido.vendedor.domain.model.CompraOperacion
import com.doncandido.vendedor.domain.model.SolicitudOperacion
import kotlinx.coroutines.flow.Flow

interface IOperacionesRepository {
    fun getSolicitudes(
        tipo: String? = null,
        estado: String? = null,
        query: String? = null,
    ): Flow<Resource<List<SolicitudOperacion>>>

    suspend fun getSolicitudById(id: String): Resource<SolicitudOperacion>

    suspend fun updateSolicitud(
        id: String,
        estado: String? = null,
        estadoOperativo: String? = null,
        prioridad: String? = null,
        updatedAt: String? = null,
        auditNote: String? = null,
    ): Resource<SolicitudOperacion>

    fun getCompras(
        estado: String? = null,
        prioridad: String? = null,
    ): Flow<Resource<List<CompraOperacion>>>

    fun getCatalogo(
        categoria: String? = null,
        query: String? = null,
    ): Flow<Resource<List<CatalogoProductoOperacion>>>

    fun getClientesMapa(query: String? = null): Flow<Resource<List<ClienteMapaOperacion>>>
}
