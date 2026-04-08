package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.OportunidadEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OportunidadDao {

    @Query("SELECT * FROM oportunidades WHERE organizationId = :orgId ORDER BY updatedAt DESC")
    fun observeAll(orgId: String): Flow<List<OportunidadEntity>>

    @Query("SELECT * FROM oportunidades WHERE organizationId = :orgId ORDER BY updatedAt DESC")
    suspend fun getAll(orgId: String): List<OportunidadEntity>

    @Query("SELECT * FROM oportunidades WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): OportunidadEntity?

    @Query("SELECT * FROM oportunidades WHERE organizationId = :orgId AND estadoId = :estadoId ORDER BY updatedAt DESC")
    suspend fun getByEstado(orgId: String, estadoId: String): List<OportunidadEntity>

    @Query("SELECT * FROM oportunidades WHERE organizationId = :orgId AND responsableId = :responsableId ORDER BY updatedAt DESC")
    suspend fun getByResponsable(orgId: String, responsableId: String): List<OportunidadEntity>

    @Query("SELECT * FROM oportunidades WHERE organizationId = :orgId AND clienteId = :clienteId ORDER BY updatedAt DESC")
    suspend fun getByCliente(orgId: String, clienteId: String): List<OportunidadEntity>

    @Upsert
    suspend fun upsertAll(oportunidades: List<OportunidadEntity>)

    @Upsert
    suspend fun upsert(oportunidad: OportunidadEntity)

    @Query("SELECT MAX(updatedAt) FROM oportunidades WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?

    @Query("DELETE FROM oportunidades WHERE organizationId = :orgId")
    suspend fun clearAll(orgId: String)
}
