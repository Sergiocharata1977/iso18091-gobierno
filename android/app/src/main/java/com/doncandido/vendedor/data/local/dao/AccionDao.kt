package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.doncandido.vendedor.data.local.entities.AccionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AccionDao {

    @Query("SELECT * FROM acciones WHERE organizationId = :orgId ORDER BY fechaProgramada ASC, createdAt DESC")
    fun observeAll(orgId: String): Flow<List<AccionEntity>>

    @Query("SELECT * FROM acciones WHERE organizationId = :orgId ORDER BY fechaProgramada ASC")
    suspend fun getAll(orgId: String): List<AccionEntity>

    @Query("SELECT * FROM acciones WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): AccionEntity?

    @Query("SELECT * FROM acciones WHERE organizationId = :orgId AND oportunidadId = :oportunidadId ORDER BY fechaProgramada ASC")
    suspend fun getByOportunidad(orgId: String, oportunidadId: String): List<AccionEntity>

    @Query("SELECT * FROM acciones WHERE organizationId = :orgId AND clienteId = :clienteId ORDER BY fechaProgramada ASC")
    suspend fun getByCliente(orgId: String, clienteId: String): List<AccionEntity>

    @Query("SELECT * FROM acciones WHERE organizationId = :orgId AND responsableId = :responsableId ORDER BY fechaProgramada ASC")
    suspend fun getByResponsable(orgId: String, responsableId: String): List<AccionEntity>

    @Query(
        """SELECT * FROM acciones WHERE organizationId = :orgId
        AND estado NOT IN ('completada', 'cancelada')
        ORDER BY fechaProgramada ASC LIMIT 20"""
    )
    suspend fun getPendientes(orgId: String): List<AccionEntity>

    @Upsert
    suspend fun upsertAll(acciones: List<AccionEntity>)

    @Upsert
    suspend fun upsert(accion: AccionEntity)

    @Query("SELECT MAX(updatedAt) FROM acciones WHERE organizationId = :orgId")
    suspend fun getLastUpdatedAt(orgId: String): String?
}
