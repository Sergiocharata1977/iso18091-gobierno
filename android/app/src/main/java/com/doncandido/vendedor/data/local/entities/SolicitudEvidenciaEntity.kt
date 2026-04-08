package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "operaciones_solicitud_evidencias")
data class SolicitudEvidenciaEntity(
    @PrimaryKey val id: String,
    val solicitudId: String,
    val organizationId: String,
    val type: String,
    val label: String,
    val fileName: String,
    val mimeType: String?,
    val sizeBytes: Long,
    val url: String?,
    val createdAt: String?,
    val updatedAt: String?,
)
