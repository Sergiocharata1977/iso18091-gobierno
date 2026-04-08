package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.data.local.entities.AccionEntity
import com.doncandido.vendedor.data.local.entities.ClienteEntity
import com.doncandido.vendedor.data.local.entities.OportunidadEntity
import com.doncandido.vendedor.data.remote.dto.AccionResumenDto
import com.doncandido.vendedor.data.remote.dto.ClienteDetalleDto
import com.doncandido.vendedor.data.remote.dto.ClienteResumenDto
import com.doncandido.vendedor.data.remote.dto.HistorialEstadoDto
import com.doncandido.vendedor.data.remote.dto.OportunidadDetalleDto
import com.doncandido.vendedor.data.remote.dto.OportunidadResumenDto
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.model.HistorialEstado
import com.doncandido.vendedor.domain.model.Oportunidad

// --- Entity → Domain ---

fun ClienteEntity.toDomain() = Cliente(
    id = id,
    razonSocial = razonSocial,
    nombreComercial = nombreComercial,
    cuitCuil = cuitCuil,
    tipoCliente = tipoCliente,
    categoriaRiesgo = categoriaRiesgo,
    estadoId = estadoId,
    estadoNombre = estadoNombre,
    responsableId = responsableId,
    responsableNombre = responsableNombre,
    email = email,
    telefono = telefono,
    whatsappPhone = whatsappPhone,
    preferredChannel = preferredChannel,
    montoEstimadoCompra = montoEstimadoCompra,
    probabilidadConversion = probabilidadConversion,
    fechaCierreEstimada = fechaCierreEstimada,
    proximaAccionTipo = proximaAccionTipo,
    proximaAccionFecha = proximaAccionFecha,
    proximaAccionDesc = proximaAccionDesc,
    ultimaInteraccion = ultimaInteraccion,
    updatedAt = updatedAt,
    direccion = direccion,
    localidad = localidad,
    provincia = provincia,
    notas = notas,
    isDetalleCargado = isDetalleCargado,
)

fun OportunidadEntity.toDomain() = Oportunidad(
    id = id,
    nombre = nombre,
    descripcion = descripcion,
    clienteId = clienteId,
    clienteNombre = clienteNombre,
    responsableId = responsableId,
    responsableNombre = responsableNombre,
    estadoId = estadoId,
    estadoNombre = estadoNombre,
    estadoColor = estadoColor,
    montoEstimado = montoEstimado,
    probabilidad = probabilidad,
    fechaCierreEstimada = fechaCierreEstimada,
    resultado = resultado,
    motivoCierre = motivoCierre,
    updatedAt = updatedAt,
    createdAt = createdAt,
)

fun AccionEntity.toDomain() = Accion(
    id = id,
    clienteId = clienteId,
    clienteNombre = clienteNombre,
    oportunidadId = oportunidadId,
    oportunidadTitulo = oportunidadTitulo,
    responsableId = responsableId,
    responsableNombre = responsableNombre,
    tipo = tipo,
    canal = canal,
    titulo = titulo,
    descripcion = descripcion,
    resultado = resultado,
    estado = estado,
    fechaProgramada = fechaProgramada,
    fechaRealizada = fechaRealizada,
    duracionMin = duracionMin,
    updatedAt = updatedAt,
    createdAt = createdAt,
)

// --- DTO → Entity ---

fun ClienteResumenDto.toEntity(orgId: String) = ClienteEntity(
    id = id,
    organizationId = orgId,
    razonSocial = razonSocial,
    nombreComercial = nombreComercial,
    cuitCuil = cuitCuil,
    tipoCliente = tipoCliente,
    categoriaRiesgo = categoriaRiesgo,
    estadoId = estado?.id,
    estadoNombre = estado?.nombre,
    responsableId = responsable?.id,
    responsableNombre = responsable?.nombre,
    email = contacto?.email,
    telefono = contacto?.telefono,
    whatsappPhone = contacto?.whatsappPhone,
    preferredChannel = contacto?.preferredChannel,
    montoEstimadoCompra = oportunidad?.montoEstimadoCompra,
    probabilidadConversion = oportunidad?.probabilidadConversion,
    fechaCierreEstimada = oportunidad?.fechaCierreEstimada,
    proximaAccionTipo = proximaAccion?.tipo,
    proximaAccionFecha = proximaAccion?.fechaProgramada,
    proximaAccionDesc = proximaAccion?.descripcion,
    ultimaInteraccion = ultimaInteraccion,
    updatedAt = updatedAt,
    direccion = null,
    localidad = null,
    provincia = null,
    codigoPostal = null,
    notas = null,
    isDetalleCargado = false,
)

fun ClienteDetalleDto.toEntity(orgId: String) = ClienteEntity(
    id = id,
    organizationId = orgId,
    razonSocial = razonSocial,
    nombreComercial = nombreComercial,
    cuitCuil = cuitCuil,
    tipoCliente = tipoCliente,
    categoriaRiesgo = categoriaRiesgo,
    estadoId = estado?.id,
    estadoNombre = estado?.nombre,
    responsableId = responsable?.id,
    responsableNombre = responsable?.nombre,
    email = contacto?.email,
    telefono = contacto?.telefono,
    whatsappPhone = contacto?.whatsappPhone,
    preferredChannel = contacto?.preferredChannel,
    montoEstimadoCompra = oportunidad?.montoEstimadoCompra,
    probabilidadConversion = oportunidad?.probabilidadConversion,
    fechaCierreEstimada = oportunidad?.fechaCierreEstimada,
    proximaAccionTipo = proximaAccion?.tipo,
    proximaAccionFecha = proximaAccion?.fechaProgramada,
    proximaAccionDesc = proximaAccion?.descripcion,
    ultimaInteraccion = ultimaInteraccion,
    updatedAt = updatedAt,
    direccion = direccion?.direccion,
    localidad = direccion?.localidad,
    provincia = direccion?.provincia,
    codigoPostal = direccion?.codigoPostal,
    notas = notas,
    isDetalleCargado = true,
)

fun OportunidadResumenDto.toEntity(orgId: String) = OportunidadEntity(
    id = id,
    organizationId = orgId,
    nombre = nombre,
    descripcion = descripcion,
    clienteId = cliente?.id,
    clienteNombre = cliente?.nombre,
    clienteCuit = cliente?.cuit,
    contactoId = contacto?.id,
    contactoNombre = contacto?.nombre,
    responsableId = responsable?.id,
    responsableNombre = responsable?.nombre,
    estadoId = estado?.id,
    estadoNombre = estado?.nombre,
    estadoColor = estado?.color,
    montoEstimado = montoEstimado,
    probabilidad = probabilidad,
    fechaCierreEstimada = fechaCierreEstimada,
    resultado = resultado,
    motivoCierre = null,
    updatedAt = updatedAt,
    createdAt = null,
)

fun OportunidadDetalleDto.toEntity(orgId: String) = OportunidadEntity(
    id = id,
    organizationId = orgId,
    nombre = nombre,
    descripcion = descripcion,
    clienteId = cliente?.id,
    clienteNombre = cliente?.nombre,
    clienteCuit = cliente?.cuit,
    contactoId = contacto?.id,
    contactoNombre = contacto?.nombre,
    responsableId = responsable?.id,
    responsableNombre = responsable?.nombre,
    estadoId = estado?.id,
    estadoNombre = estado?.nombre,
    estadoColor = estado?.color,
    montoEstimado = montoEstimado,
    probabilidad = probabilidad,
    fechaCierreEstimada = fechaCierreEstimada,
    resultado = resultado,
    motivoCierre = motivoCierre,
    updatedAt = updatedAt,
    createdAt = createdAt,
)

fun OportunidadDetalleDto.toHistorial(): List<HistorialEstado> =
    historialEstados?.map { it.toDomain() } ?: emptyList()

fun HistorialEstadoDto.toDomain() = HistorialEstado(
    estadoId = estadoId,
    estadoNombre = estadoNombre,
    timestamp = timestamp,
    usuarioNombre = usuarioNombre,
)

fun AccionResumenDto.toEntity(orgId: String) = AccionEntity(
    id = id,
    organizationId = orgId,
    clienteId = cliente?.id,
    clienteNombre = cliente?.nombre,
    oportunidadId = oportunidad?.id,
    oportunidadTitulo = oportunidad?.titulo,
    responsableId = responsable?.id,
    responsableNombre = responsable?.nombre,
    tipo = tipo,
    canal = canal,
    titulo = titulo,
    descripcion = descripcion,
    resultado = resultado,
    estado = estado,
    fechaProgramada = fechaProgramada,
    fechaRealizada = fechaRealizada,
    duracionMin = duracionMin,
    updatedAt = updatedAt,
    createdAt = createdAt,
)
