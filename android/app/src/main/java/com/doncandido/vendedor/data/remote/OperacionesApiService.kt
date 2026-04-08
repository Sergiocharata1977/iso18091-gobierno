package com.doncandido.vendedor.data.remote

import com.doncandido.vendedor.data.remote.dto.CatalogoProductoDto
import com.doncandido.vendedor.data.remote.dto.ClienteMapaDto
import com.doncandido.vendedor.data.remote.dto.CompraOperacionDto
import com.doncandido.vendedor.data.remote.dto.EvidenciaOperacionDto
import com.doncandido.vendedor.data.remote.dto.MobileListResponse
import com.doncandido.vendedor.data.remote.dto.MobileSingleResponse
import com.doncandido.vendedor.data.remote.dto.OperacionesBootstrapDto
import com.doncandido.vendedor.data.remote.dto.PatchSolicitudOperacionRequest
import com.doncandido.vendedor.data.remote.dto.SolicitudDetalleDto
import com.doncandido.vendedor.data.remote.dto.SolicitudResumenDto
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query
import javax.inject.Singleton

interface OperacionesApiService {
    @GET("api/mobile/operaciones/bootstrap")
    suspend fun getBootstrap(
        @Query("organization_id") organizationId: String? = null,
    ): MobileSingleResponse<OperacionesBootstrapDto>

    @GET("api/mobile/operaciones/solicitudes")
    suspend fun getSolicitudes(
        @Query("tipo") tipo: String? = null,
        @Query("estado") estado: String? = null,
        @Query("q") query: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("cursor") cursor: String? = null,
    ): MobileListResponse<SolicitudResumenDto>

    @GET("api/mobile/operaciones/solicitudes/{id}")
    suspend fun getSolicitudById(
        @Path("id") id: String,
    ): MobileSingleResponse<SolicitudDetalleDto>

    @PATCH("api/mobile/operaciones/solicitudes/{id}")
    suspend fun patchSolicitud(
        @Path("id") id: String,
        @retrofit2.http.Body body: PatchSolicitudOperacionRequest,
    ): MobileSingleResponse<SolicitudDetalleDto>

    @GET("api/mobile/operaciones/solicitudes/{id}/evidencias")
    suspend fun getSolicitudEvidencias(
        @Path("id") id: String,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
    ): MobileListResponse<EvidenciaOperacionDto>

    @GET("api/mobile/operaciones/compras")
    suspend fun getCompras(
        @Query("estado") estado: String? = null,
        @Query("prioridad") prioridad: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
    ): MobileListResponse<CompraOperacionDto>

    @GET("api/mobile/operaciones/catalogo")
    suspend fun getCatalogo(
        @Query("categoria") categoria: String? = null,
        @Query("q") query: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
    ): MobileListResponse<CatalogoProductoDto>

    @GET("api/mobile/operaciones/mapa/clientes")
    suspend fun getMapaClientes(
        @Query("q") query: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
    ): MobileListResponse<ClienteMapaDto>
}

@Module
@InstallIn(SingletonComponent::class)
object OperacionesApiModule {
    @Provides
    @Singleton
    fun provideOperacionesApiService(retrofit: Retrofit): OperacionesApiService =
        retrofit.create(OperacionesApiService::class.java)
}
