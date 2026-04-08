package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "acciones")
data class AccionEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    // Relaciones
    val clienteId: String?,
    val clienteNombre: String?,
    val oportunidadId: String?,
    val oportunidadTitulo: String?,
    val responsableId: String?,
    val responsableNombre: String?,
    // Datos de la accion
    val tipo: String,
    val canal: String,
    val titulo: String,
    val descripcion: String?,
    val resultado: String?,
    val estado: String?,
    // Fechas
    val fechaProgramada: String?,
    val fechaRealizada: String?,
    val duracionMin: Int?,
    // Timestamps
    val updatedAt: String?,
    val createdAt: String?,
    // Cache metadata
    val cachedAt: Long = System.currentTimeMillis(),
)
