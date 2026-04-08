package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "operaciones_compras")
data class CompraOperacionEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val numero: Int?,
    val tipo: String,
    val estado: String,
    val prioridad: String,
    val solicitanteNombre: String,
    val area: String,
    val motivo: String,
    val proveedorNombre: String?,
    val montoEstimado: Double?,
    val moneda: String?,
    val updatedAt: String?,
    val createdAt: String?,
)
