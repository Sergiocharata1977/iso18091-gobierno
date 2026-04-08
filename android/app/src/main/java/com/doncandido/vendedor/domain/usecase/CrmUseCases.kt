package com.doncandido.vendedor.domain.usecase

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.model.Oportunidad
import com.doncandido.vendedor.domain.repository.IAccionRepository
import com.doncandido.vendedor.domain.repository.IClienteRepository
import com.doncandido.vendedor.domain.repository.IOportunidadRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

// --- Clientes ---

class GetClientesUseCase @Inject constructor(
    private val repo: IClienteRepository,
) {
    operator fun invoke(query: String? = null, responsableId: String? = null): Flow<Resource<List<Cliente>>> =
        repo.getClientes(query, responsableId)
}

class GetClienteDetailUseCase @Inject constructor(
    private val repo: IClienteRepository,
) {
    suspend operator fun invoke(id: String): Resource<Cliente> = repo.getClienteById(id)
}

class AgregarNotaUseCase @Inject constructor(
    private val repo: IClienteRepository,
) {
    suspend operator fun invoke(
        clienteId: String,
        nota: String,
        updatedAt: String?,
    ): Resource<Cliente> {
        if (nota.isBlank()) return Resource.Error("La nota no puede estar vacia.")
        return repo.agregarNota(clienteId, nota.trim(), updatedAt)
    }
}

// --- Oportunidades ---

class GetOportunidadesUseCase @Inject constructor(
    private val repo: IOportunidadRepository,
) {
    operator fun invoke(
        estadoId: String? = null,
        responsableId: String? = null,
        clienteId: String? = null,
    ): Flow<Resource<List<Oportunidad>>> =
        repo.getOportunidades(estadoId, responsableId, clienteId)
}

class GetOportunidadDetailUseCase @Inject constructor(
    private val repo: IOportunidadRepository,
) {
    suspend operator fun invoke(id: String): Resource<Oportunidad> =
        repo.getOportunidadById(id)
}

class CambiarEtapaUseCase @Inject constructor(
    private val repo: IOportunidadRepository,
) {
    suspend operator fun invoke(
        oportunidadId: String,
        nuevoEstadoId: String,
        nuevoEstadoNombre: String,
        nuevoEstadoColor: String,
        updatedAt: String?,
    ): Resource<Oportunidad> =
        repo.cambiarEtapa(oportunidadId, nuevoEstadoId, nuevoEstadoNombre, nuevoEstadoColor, updatedAt)
}

// --- Acciones ---

class GetAccionesUseCase @Inject constructor(
    private val repo: IAccionRepository,
) {
    operator fun invoke(
        responsableId: String? = null,
        clienteId: String? = null,
        oportunidadId: String? = null,
        estado: String? = null,
    ): Flow<Resource<List<Accion>>> =
        repo.getAcciones(responsableId, clienteId, oportunidadId, estado)
}

class CrearAccionUseCase @Inject constructor(
    private val repo: IAccionRepository,
) {
    suspend operator fun invoke(
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
        if (titulo.isBlank()) return Resource.Error("El titulo es requerido.")
        return repo.createAccion(tipo, canal, titulo.trim(), descripcion, clienteId, clienteNombre, oportunidadId, oportunidadTitulo, vendedorId, vendedorNombre, fechaProgramada)
    }
}
