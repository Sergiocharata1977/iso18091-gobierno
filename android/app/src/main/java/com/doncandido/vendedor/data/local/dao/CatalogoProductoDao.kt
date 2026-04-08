package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.CatalogoProductoEntity

@Dao
interface CatalogoProductoDao {
    @Query(
        """SELECT * FROM operaciones_catalogo
        WHERE organizationId = :orgId
        AND (:categoria IS NULL OR categoria = :categoria)
        AND (
            :query IS NULL OR
            nombre LIKE '%' || :query || '%' OR
            descripcion LIKE '%' || :query || '%' OR
            marca LIKE '%' || :query || '%'
        )
        ORDER BY destacado DESC, updatedAt DESC"""
    )
    suspend fun query(
        orgId: String,
        categoria: String?,
        query: String?,
    ): List<CatalogoProductoEntity>

    @Query("SELECT MAX(updatedAt) FROM operaciones_catalogo WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Upsert
    suspend fun upsertAll(items: List<CatalogoProductoEntity>)
}
