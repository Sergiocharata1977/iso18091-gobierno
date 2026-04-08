package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "operaciones_catalogo")
data class CatalogoProductoEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val nombre: String,
    val descripcion: String?,
    val categoria: String?,
    val marca: String?,
    val modelo: String?,
    val precioContado: Double?,
    val precioLista: Double?,
    val stock: Double?,
    val activo: Boolean,
    val destacado: Boolean,
    val updatedAt: String?,
)
