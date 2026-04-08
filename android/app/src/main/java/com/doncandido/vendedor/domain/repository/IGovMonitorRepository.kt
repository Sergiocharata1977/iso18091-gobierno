package com.doncandido.vendedor.domain.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.GovExpediente
import com.doncandido.vendedor.domain.model.GovMonitorResumen
import com.doncandido.vendedor.domain.model.GovServicio
import kotlinx.coroutines.flow.Flow

interface IGovMonitorRepository {
    fun getResumenMonitor(): Flow<Resource<GovMonitorResumen>>

    fun getExpedientes(
        estado: String? = null,
        areaResponsable: String? = null,
        query: String? = null,
    ): Flow<Resource<List<GovExpediente>>>

    fun getServicios(
        categoria: String? = null,
        query: String? = null,
    ): Flow<Resource<List<GovServicio>>>
}
