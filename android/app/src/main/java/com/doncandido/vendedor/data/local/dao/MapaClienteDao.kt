package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.MapaClienteEntity

@Dao
interface MapaClienteDao {
    @Query(
        """SELECT * FROM operaciones_mapa_clientes
        WHERE organizationId = :orgId
        AND (
            :query IS NULL OR
            razonSocial LIKE '%' || :query || '%' OR
            nombreComercial LIKE '%' || :query || '%' OR
            localidad LIKE '%' || :query || '%' OR
            provincia LIKE '%' || :query || '%'
        )
        ORDER BY updatedAt DESC"""
    )
    suspend fun query(orgId: String, query: String?): List<MapaClienteEntity>

    @Query("SELECT MAX(updatedAt) FROM operaciones_mapa_clientes WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Upsert
    suspend fun upsertAll(items: List<MapaClienteEntity>)
}
