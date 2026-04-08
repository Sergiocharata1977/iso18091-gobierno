package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.ClienteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ClienteDao {

    @Query("SELECT * FROM clientes WHERE organizationId = :orgId ORDER BY updatedAt DESC")
    fun observeAll(orgId: String): Flow<List<ClienteEntity>>

    @Query("SELECT * FROM clientes WHERE organizationId = :orgId ORDER BY updatedAt DESC")
    suspend fun getAll(orgId: String): List<ClienteEntity>

    @Query("SELECT * FROM clientes WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ClienteEntity?

    @Query(
        """SELECT * FROM clientes WHERE organizationId = :orgId
        AND (razonSocial LIKE '%' || :query || '%'
          OR nombreComercial LIKE '%' || :query || '%'
          OR cuitCuil LIKE '%' || :query || '%'
          OR email LIKE '%' || :query || '%'
          OR telefono LIKE '%' || :query || '%')
        ORDER BY updatedAt DESC"""
    )
    suspend fun search(orgId: String, query: String): List<ClienteEntity>

    @Query("SELECT * FROM clientes WHERE organizationId = :orgId AND responsableId = :responsableId ORDER BY updatedAt DESC")
    suspend fun getByResponsable(orgId: String, responsableId: String): List<ClienteEntity>

    @Upsert
    suspend fun upsertAll(clientes: List<ClienteEntity>)

    @Upsert
    suspend fun upsert(cliente: ClienteEntity)

    @Query("SELECT MAX(updatedAt) FROM clientes WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Query("DELETE FROM clientes WHERE organizationId = :orgId")
    suspend fun clearAll(orgId: String)
}
