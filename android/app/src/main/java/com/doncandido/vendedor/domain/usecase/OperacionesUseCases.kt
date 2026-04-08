package com.doncandido.vendedor.domain.usecase

import com.doncandido.vendedor.domain.repository.IOperacionesRepository
import javax.inject.Inject

class GetSolicitudesOperacionesUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    operator fun invoke(tipo: String? = null, estado: String? = null, query: String? = null) =
        repository.getSolicitudes(tipo = tipo, estado = estado, query = query)
}

class GetSolicitudOperacionUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    suspend operator fun invoke(id: String) = repository.getSolicitudById(id)
}

class UpdateSolicitudOperacionUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    suspend operator fun invoke(
        id: String,
        estado: String? = null,
        estadoOperativo: String? = null,
        prioridad: String? = null,
        updatedAt: String? = null,
        auditNote: String? = null,
    ) = repository.updateSolicitud(
        id = id,
        estado = estado,
        estadoOperativo = estadoOperativo,
        prioridad = prioridad,
        updatedAt = updatedAt,
        auditNote = auditNote,
    )
}

class GetComprasOperacionesUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    operator fun invoke(estado: String? = null, prioridad: String? = null) =
        repository.getCompras(estado = estado, prioridad = prioridad)
}

class GetCatalogoOperacionesUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    operator fun invoke(categoria: String? = null, query: String? = null) =
        repository.getCatalogo(categoria = categoria, query = query)
}

class GetMapaClientesOperacionesUseCase @Inject constructor(
    private val repository: IOperacionesRepository,
) {
    operator fun invoke(query: String? = null) = repository.getClientesMapa(query = query)
}
