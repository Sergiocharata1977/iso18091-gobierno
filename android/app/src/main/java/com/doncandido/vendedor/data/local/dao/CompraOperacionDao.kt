package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.CompraOperacionEntity

@Dao
interface CompraOperacionDao {
    @Query(
        """SELECT * FROM operaciones_compras
        WHERE organizationId = :orgId
        AND (:estado IS NULL OR estado = :estado)
        AND (:prioridad IS NULL OR prioridad = :prioridad)
        ORDER BY updatedAt DESC"""
    )
    suspend fun query(
        orgId: String,
        estado: String?,
        prioridad: String?,
    ): List<CompraOperacionEntity>

    @Query("SELECT MAX(updatedAt) FROM operaciones_compras WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Upsert
    suspend fun upsertAll(items: List<CompraOperacionEntity>)
}
