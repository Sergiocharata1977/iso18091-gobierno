package com.doncandido.vendedor.data.remote

import com.doncandido.vendedor.data.remote.dto.AccionResumenDto
import com.doncandido.vendedor.data.remote.dto.ClienteDetalleDto
import com.doncandido.vendedor.data.remote.dto.ClienteResumenDto
import com.doncandido.vendedor.data.remote.dto.CreateAccionRequest
import com.doncandido.vendedor.data.remote.dto.MobileListResponse
import com.doncandido.vendedor.data.remote.dto.MobileSingleResponse
import com.doncandido.vendedor.data.remote.dto.OportunidadDetalleDto
import com.doncandido.vendedor.data.remote.dto.OportunidadResumenDto
import com.doncandido.vendedor.data.remote.dto.PatchClienteRequest
import com.doncandido.vendedor.data.remote.dto.PatchOportunidadRequest
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import javax.inject.Singleton

interface CrmApiService {

    // --- Clientes ---
    @GET("api/mobile/crm/clientes")
    suspend fun getClientes(
        @Query("q") q: String? = null,
        @Query("responsable_id") responsableId: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("cursor") cursor: String? = null,
    ): MobileListResponse<ClienteResumenDto>

    @GET("api/mobile/crm/clientes/{id}")
    suspend fun getClienteById(
        @Path("id") id: String,
    ): MobileSingleResponse<ClienteDetalleDto>

    @PATCH("api/mobile/crm/clientes/{id}")
    suspend fun patchCliente(
        @Path("id") id: String,
        @Body body: PatchClienteRequest,
    ): MobileSingleResponse<ClienteDetalleDto>

    // --- Oportunidades ---
    @GET("api/mobile/crm/oportunidades")
    suspend fun getOportunidades(
        @Query("estado_kanban_id") estadoId: String? = null,
        @Query("responsable_id") responsableId: String? = null,
        @Query("cliente_id") clienteId: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("cursor") cursor: String? = null,
    ): MobileListResponse<OportunidadResumenDto>

    @GET("api/mobile/crm/oportunidades/{id}")
    suspend fun getOportunidadById(
        @Path("id") id: String,
    ): MobileSingleResponse<OportunidadDetalleDto>

    @PATCH("api/mobile/crm/oportunidades/{id}")
    suspend fun patchOportunidad(
        @Path("id") id: String,
        @Body body: PatchOportunidadRequest,
    ): MobileSingleResponse<OportunidadDetalleDto>

    // --- Acciones ---
    @GET("api/mobile/crm/acciones")
    suspend fun getAcciones(
        @Query("responsable_id") responsableId: String? = null,
        @Query("cliente_id") clienteId: String? = null,
        @Query("oportunidad_id") oportunidadId: String? = null,
        @Query("estado") estado: String? = null,
        @Query("fecha_desde") fechaDesde: String? = null,
        @Query("updated_after") updatedAfter: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("cursor") cursor: String? = null,
    ): MobileListResponse<AccionResumenDto>

    @POST("api/mobile/crm/acciones")
    suspend fun createAccion(
        @Body body: CreateAccionRequest,
    ): MobileSingleResponse<AccionResumenDto>
}

@Module
@InstallIn(SingletonComponent::class)
object CrmApiModule {

    @Provides
    @Singleton
    fun provideCrmApiService(retrofit: Retrofit): CrmApiService =
        retrofit.create(CrmApiService::class.java)
}
