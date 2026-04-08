package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.SolicitudEvidenciaEntity

@Dao
interface SolicitudEvidenciaDao {
    @Query("SELECT * FROM operaciones_solicitud_evidencias WHERE solicitudId = :solicitudId ORDER BY createdAt DESC")
    suspend fun getBySolicitud(solicitudId: String): List<SolicitudEvidenciaEntity>

    @Query("SELECT MAX(updatedAt) FROM operaciones_solicitud_evidencias WHERE solicitudId = :solicitudId")
    suspend fun getLastUpdatedAt(solicitudId: String): String?

    @Upsert
    suspend fun upsertAll(items: List<SolicitudEvidenciaEntity>)
}
