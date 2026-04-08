package com.doncandido.vendedor.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.OportunidadDao
import com.doncandido.vendedor.data.local.entities.OportunidadEntity
import com.doncandido.vendedor.data.remote.CrmApiService
import com.doncandido.vendedor.data.remote.dto.ClienteRefDto
import com.doncandido.vendedor.data.remote.dto.EstadoDto
import com.doncandido.vendedor.data.remote.dto.MobileListResponse
import com.doncandido.vendedor.data.remote.dto.MobileMeta
import com.doncandido.vendedor.data.remote.dto.OportunidadResumenDto
import com.doncandido.vendedor.data.remote.dto.PersonaDto
import com.doncandido.vendedor.data.repository.OportunidadRepository
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class OportunidadRepositoryTest {

    private lateinit var api: CrmApiService
    private lateinit var dao: OportunidadDao
    private lateinit var sessionManager: SessionManager
    private lateinit var repository: OportunidadRepository

    @Before
    fun setup() {
        api = mockk()
        dao = mockk()
        sessionManager = mockk()
        every { sessionManager.orgId } returns flowOf("org-1")

        repository = OportunidadRepository(
            api = api,
            dao = dao,
            sessionManager = sessionManager,
        )
    }

    @Test
    fun getOportunidades_emitsCachedThenFreshMappedData() = runTest {
        val cached = oportunidadEntity(id = "op-cache", nombre = "Oportunidad Cache")
        val fresh = oportunidadEntity(id = "op-1", nombre = "Oportunidad Fresh", estadoId = "nuevo")

        val response = MobileListResponse(
            success = true,
            data = listOf(
                OportunidadResumenDto(
                    id = "op-1",
                    nombre = "Oportunidad Fresh",
                    descripcion = "desc",
                    cliente = ClienteRefDto(id = "c-1", nombre = "Cliente A", cuit = "20-123"),
                    contacto = PersonaDto(id = "p-1", nombre = "Mario"),
                    responsable = PersonaDto(id = "r-1", nombre = "Ana"),
                    estado = EstadoDto(id = "nuevo", nombre = "Nuevo", color = "#2196F3"),
                    montoEstimado = 1000.0,
                    probabilidad = 60,
                    fechaCierreEstimada = "2026-04-30",
                    resultado = "abierta",
                    updatedAt = "2026-04-01T10:00:00Z",
                )
            ),
            meta = meta(),
        )

        coEvery { dao.getAll("org-1") } returnsMany listOf(listOf(cached), listOf(fresh))
        coEvery { dao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { dao.upsertAll(any()) } returns Unit
        coEvery { api.getOportunidades(any(), any(), any(), any(), any(), any()) } returns response

        val emissions = repository.getOportunidades(null, null, null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)
        assertTrue(emissions[2] is Resource.Success)
        assertEquals("op-cache", (emissions[1] as Resource.Success).data.first().id)

        val freshData = (emissions[2] as Resource.Success).data.first()
        assertEquals("op-1", freshData.id)
        assertEquals("Oportunidad Fresh", freshData.nombre)
        assertEquals("nuevo", freshData.estadoId)
    }

    @Test
    fun getOportunidades_emitsError_whenNoCacheAndNetworkFails() = runTest {
        coEvery { dao.getAll("org-1") } returns emptyList()
        coEvery { dao.getLastUpdatedAt("org-1") } returns null
        coEvery { api.getOportunidades(any(), any(), any(), any(), any(), any()) } throws RuntimeException("api error")

        val emissions = repository.getOportunidades(null, null, null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Error)
        assertEquals("api error", (emissions[1] as Resource.Error).message)
    }

    @Test
    fun getOportunidades_keepsCache_whenNetworkFails() = runTest {
        val cached = oportunidadEntity(id = "op-cache", nombre = "Solo Cache")

        coEvery { dao.getAll("org-1") } returns listOf(cached)
        coEvery { dao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { api.getOportunidades(any(), any(), any(), any(), any(), any()) } throws RuntimeException("timeout")

        val emissions = repository.getOportunidades(null, null, null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)
        assertEquals(2, emissions.size)
        assertEquals("op-cache", (emissions[1] as Resource.Success).data.first().id)
    }

    private fun meta() = MobileMeta(
        apiVersion = "v1",
        generatedAt = "2026-04-08T00:00:00Z",
        organizationId = "org-1",
        itemCount = 1,
        limit = 50,
        nextCursor = null,
        hasMore = false,
        cursorApplied = null,
        updatedAfter = null,
    )

    private fun oportunidadEntity(
        id: String,
        nombre: String,
        estadoId: String = "e-1",
    ) = OportunidadEntity(
        id = id,
        organizationId = "org-1",
        nombre = nombre,
        descripcion = "desc",
        clienteId = "c-1",
        clienteNombre = "Cliente A",
        clienteCuit = "20-123",
        contactoId = "p-1",
        contactoNombre = "Mario",
        responsableId = "r-1",
        responsableNombre = "Ana",
        estadoId = estadoId,
        estadoNombre = "Nuevo",
        estadoColor = "#2196F3",
        montoEstimado = 1000.0,
        probabilidad = 60,
        fechaCierreEstimada = "2026-04-30",
        resultado = "abierta",
        motivoCierre = null,
        updatedAt = "2026-04-01T10:00:00Z",
        createdAt = "2026-03-01T10:00:00Z",
    )
}
