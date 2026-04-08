package com.doncandido.vendedor.domain.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.model.Oportunidad
import kotlinx.coroutines.flow.Flow

interface IClienteRepository {
    fun getClientes(query: String? = null, responsableId: String? = null): Flow<Resource<List<Cliente>>>
    suspend fun getClienteById(id: String): Resource<Cliente>
    suspend fun agregarNota(clienteId: String, nota: String, updatedAt: String?): Resource<Cliente>
    suspend fun syncPending()
}

interface IOportunidadRepository {
    fun getOportunidades(estadoId: String? = null, responsableId: String? = null, clienteId: String? = null): Flow<Resource<List<Oportunidad>>>
    suspend fun getOportunidadById(id: String): Resource<Oportunidad>
    suspend fun cambiarEtapa(
        oportunidadId: String,
        nuevoEstadoId: String,
        nuevoEstadoNombre: String,
        nuevoEstadoColor: String,
        updatedAt: String?,
    ): Resource<Oportunidad>
}

interface IAccionRepository {
    fun getAcciones(
        responsableId: String? = null,
        clienteId: String? = null,
        oportunidadId: String? = null,
        estado: String? = null,
    ): Flow<Resource<List<Accion>>>

    suspend fun createAccion(
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
    ): Resource<Accion>
}
