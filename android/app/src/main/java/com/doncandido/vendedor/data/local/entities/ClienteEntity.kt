package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "clientes")
data class ClienteEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val razonSocial: String,
    val nombreComercial: String?,
    val cuitCuil: String?,
    val tipoCliente: String?,
    val categoriaRiesgo: String?,
    // Estado kanban
    val estadoId: String?,
    val estadoNombre: String?,
    // Responsable
    val responsableId: String?,
    val responsableNombre: String?,
    // Contacto
    val email: String?,
    val telefono: String?,
    val whatsappPhone: String?,
    val preferredChannel: String?,
    // Oportunidad comercial
    val montoEstimadoCompra: Double?,
    val probabilidadConversion: Int?,
    val fechaCierreEstimada: String?,
    // Proxima accion
    val proximaAccionTipo: String?,
    val proximaAccionFecha: String?,
    val proximaAccionDesc: String?,
    // Timestamps
    val ultimaInteraccion: String?,
    val updatedAt: String?,
    // Campos de detalle (solo populados en fetch de detalle)
    val direccion: String?,
    val localidad: String?,
    val provincia: String?,
    val codigoPostal: String?,
    val notas: String?,
    val isDetalleCargado: Boolean = false,
    // Cache metadata
    val cachedAt: Long = System.currentTimeMillis(),
)
