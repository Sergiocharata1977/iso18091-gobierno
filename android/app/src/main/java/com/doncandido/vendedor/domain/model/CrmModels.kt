package com.doncandido.vendedor.domain.model

data class Cliente(
    val id: String,
    val razonSocial: String,
    val nombreComercial: String?,
    val cuitCuil: String?,
    val tipoCliente: String?,
    val categoriaRiesgo: String?,
    val estadoId: String?,
    val estadoNombre: String?,
    val responsableId: String?,
    val responsableNombre: String?,
    val email: String?,
    val telefono: String?,
    val whatsappPhone: String?,
    val preferredChannel: String?,
    val montoEstimadoCompra: Double?,
    val probabilidadConversion: Int?,
    val fechaCierreEstimada: String?,
    val proximaAccionTipo: String?,
    val proximaAccionFecha: String?,
    val proximaAccionDesc: String?,
    val ultimaInteraccion: String?,
    val updatedAt: String?,
    // Detalle (nullable hasta que se cargue el detalle)
    val direccion: String?,
    val localidad: String?,
    val provincia: String?,
    val notas: String?,
    val isDetalleCargado: Boolean = false,
)

data class Oportunidad(
    val id: String,
    val nombre: String,
    val descripcion: String?,
    val clienteId: String?,
    val clienteNombre: String?,
    val responsableId: String?,
    val responsableNombre: String?,
    val estadoId: String?,
    val estadoNombre: String?,
    val estadoColor: String?,
    val montoEstimado: Double?,
    val probabilidad: Int?,
    val fechaCierreEstimada: String?,
    val resultado: String?,
    val motivoCierre: String?,
    val updatedAt: String?,
    val createdAt: String?,
    val historialEstados: List<HistorialEstado> = emptyList(),
)

data class HistorialEstado(
    val estadoId: String?,
    val estadoNombre: String?,
    val timestamp: String?,
    val usuarioNombre: String?,
)

data class Accion(
    val id: String,
    val clienteId: String?,
    val clienteNombre: String?,
    val oportunidadId: String?,
    val oportunidadTitulo: String?,
    val responsableId: String?,
    val responsableNombre: String?,
    val tipo: String,
    val canal: String,
    val titulo: String,
    val descripcion: String?,
    val resultado: String?,
    val estado: String?,
    val fechaProgramada: String?,
    val fechaRealizada: String?,
    val duracionMin: Int?,
    val updatedAt: String?,
    val createdAt: String?,
)

data class KanbanEstado(
    val id: String,
    val nombre: String,
    val color: String,
)
