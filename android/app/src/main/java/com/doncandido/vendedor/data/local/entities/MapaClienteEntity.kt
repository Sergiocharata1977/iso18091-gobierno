package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "operaciones_mapa_clientes")
data class MapaClienteEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val razonSocial: String,
    val nombreComercial: String?,
    val responsableNombre: String?,
    val direccion: String?,
    val localidad: String?,
    val provincia: String?,
    val telefono: String?,
    val whatsappPhone: String?,
    val lat: Double?,
    val lng: Double?,
    val geocodingStatus: String?,
    val updatedAt: String?,
)
