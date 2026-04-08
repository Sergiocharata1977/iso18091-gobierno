package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.SolicitudOperacionEntity

@Dao
interface SolicitudOperacionDao {
    @Query("SELECT * FROM operaciones_solicitudes WHERE organizationId = :orgId ORDER BY updatedAt DESC")
    suspend fun getAll(orgId: String): List<SolicitudOperacionEntity>

    @Query("SELECT * FROM operaciones_solicitudes WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SolicitudOperacionEntity?

    @Query(
        """SELECT * FROM operaciones_solicitudes
        WHERE organizationId = :orgId
        AND (:tipo IS NULL OR tipo = :tipo)
        AND (:estado IS NULL OR estado = :estado)
        AND (
            :query IS NULL OR
            nombre LIKE '%' || :query || '%' OR
            email LIKE '%' || :query || '%' OR
            telefono LIKE '%' || :query || '%'
        )
        ORDER BY updatedAt DESC"""
    )
    suspend fun query(
        orgId: String,
        tipo: String?,
        estado: String?,
        query: String?,
    ): List<SolicitudOperacionEntity>

    @Query("SELECT MAX(updatedAt) FROM operaciones_solicitudes WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Upsert
    suspend fun upsertAll(items: List<SolicitudOperacionEntity>)

    @Upsert
    suspend fun upsert(item: SolicitudOperacionEntity)
}
