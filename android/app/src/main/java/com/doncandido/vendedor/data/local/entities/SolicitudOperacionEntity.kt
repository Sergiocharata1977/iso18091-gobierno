package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "operaciones_solicitudes")
data class SolicitudOperacionEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val numero: Int?,
    val tipo: String,
    val flujo: String?,
    val estado: String,
    val estadoOperativo: String?,
    val prioridad: String?,
    val nombre: String,
    val telefono: String?,
    val email: String?,
    val assignedTo: String?,
    val crmSyncStatus: String?,
    val crmOportunidadId: String?,
    val mensaje: String?,
    val updatedAt: String?,
    val createdAt: String?,
    val isDetalleCargado: Boolean = false,
)
