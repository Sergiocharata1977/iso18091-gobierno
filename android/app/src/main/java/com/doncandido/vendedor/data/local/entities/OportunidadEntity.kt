package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "oportunidades")
data class OportunidadEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val nombre: String,
    val descripcion: String?,
    // Cliente
    val clienteId: String?,
    val clienteNombre: String?,
    val clienteCuit: String?,
    // Contacto
    val contactoId: String?,
    val contactoNombre: String?,
    // Responsable
    val responsableId: String?,
    val responsableNombre: String?,
    // Estado kanban
    val estadoId: String?,
    val estadoNombre: String?,
    val estadoColor: String?,
    // Comercial
    val montoEstimado: Double?,
    val probabilidad: Int?,
    val fechaCierreEstimada: String?,
    val resultado: String?,
    val motivoCierre: String?,
    // Timestamps
    val updatedAt: String?,
    val createdAt: String?,
    // Cache metadata
    val cachedAt: Long = System.currentTimeMillis(),
)
