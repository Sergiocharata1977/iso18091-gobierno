package com.doncandido.vendedor.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.ClienteDao
import com.doncandido.vendedor.data.local.entities.ClienteEntity
import com.doncandido.vendedor.data.remote.CrmApiService
import com.doncandido.vendedor.data.remote.dto.ClienteResumenDto
import com.doncandido.vendedor.data.remote.dto.ContactoDto
import com.doncandido.vendedor.data.remote.dto.EstadoDto
import com.doncandido.vendedor.data.remote.dto.MobileListResponse
import com.doncandido.vendedor.data.remote.dto.MobileMeta
import com.doncandido.vendedor.data.remote.dto.PersonaDto
import com.doncandido.vendedor.data.repository.ClienteRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ClienteRepositoryTest {

    private lateinit var api: CrmApiService
    private lateinit var dao: ClienteDao
    private lateinit var sessionManager: SessionManager
    private lateinit var repository: ClienteRepository

    @Before
    fun setup() {
        api = mockk()
        dao = mockk()
        sessionManager = mockk()
        every { sessionManager.orgId } returns flowOf("org-1")

        repository = ClienteRepository(
            api = api,
            dao = dao,
            sessionManager = sessionManager,
        )
    }

    @Test
    fun getClientes_emitsFreshMappedSuccess_afterNetworkSync() = runTest {
        val freshEntity = clienteEntity(
            id = "c-1",
            razonSocial = "Cliente Fresco SA",
            responsableId = "r-1",
        )
        val response = MobileListResponse(
            success = true,
            data = listOf(
                ClienteResumenDto(
                    id = "c-1",
                    razonSocial = "Cliente Fresco SA",
                    nombreComercial = "Fresco",
                    cuitCuil = "20-12345678-9",
                    tipoCliente = "empresa",
                    categoriaRiesgo = "bajo",
                    estado = EstadoDto(id = "e-1", nombre = "Activo", color = "#00AA00"),
                    responsable = PersonaDto(id = "r-1", nombre = "Juan"),
                    contacto = ContactoDto(
                        email = "fresco@test.com",
                        telefono = "1111",
                        whatsappPhone = "+541111",
                        preferredChannel = "whatsapp",
                    ),
                    oportunidad = null,
                    proximaAccion = null,
                    ultimaInteraccion = "2026-04-01T10:00:00Z",
                    updatedAt = "2026-04-01T10:00:00Z",
                )
            ),
            meta = meta(),
        )

        coEvery { dao.getAll("org-1") } returnsMany listOf(emptyList(), listOf(freshEntity))
        coEvery { dao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { dao.upsertAll(any()) } returns Unit
        coEvery { api.getClientes(any(), any(), any(), any(), any()) } returns response

        val emissions = repository.getClientes(query = null, responsableId = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)
        val data = (emissions[1] as Resource.Success).data
        assertEquals(1, data.size)
        assertEquals("c-1", data[0].id)
        assertEquals("Cliente Fresco SA", data[0].razonSocial)
        assertEquals("r-1", data[0].responsableId)

        coVerify(exactly = 1) { dao.upsertAll(match { it.first().organizationId == "org-1" }) }
    }

    @Test
    fun getClientes_emitsError_whenNoCacheAndNetworkFails() = runTest {
        coEvery { dao.getAll("org-1") } returns emptyList()
        coEvery { dao.getLastUpdatedAt("org-1") } returns null
        coEvery { api.getClientes(any(), any(), any(), any(), any()) } throws RuntimeException("network down")

        val emissions = repository.getClientes(query = null, responsableId = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Error)
        assertEquals("network down", (emissions[1] as Resource.Error).message)
    }

    @Test
    fun getClientes_keepsCachedData_whenNetworkFails() = runTest {
        val cached = clienteEntity(id = "c-cache", razonSocial = "Cliente Cacheado")

        coEvery { dao.getAll("org-1") } returns listOf(cached)
        coEvery { dao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { api.getClientes(any(), any(), any(), any(), any()) } throws RuntimeException("timeout")

        val emissions = repository.getClientes(query = null, responsableId = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)
        val cachedData = (emissions[1] as Resource.Success).data
        assertEquals("c-cache", cachedData.first().id)
        assertEquals("Cliente Cacheado", cachedData.first().razonSocial)
        assertEquals(2, emissions.size)

        coVerify(exactly = 0) { dao.upsertAll(any()) }
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

    private fun clienteEntity(
        id: String,
        razonSocial: String,
        responsableId: String? = null,
    ) = ClienteEntity(
        id = id,
        organizationId = "org-1",
        razonSocial = razonSocial,
        nombreComercial = "NC",
        cuitCuil = "20-12345678-9",
        tipoCliente = "empresa",
        categoriaRiesgo = "bajo",
        estadoId = "e-1",
        estadoNombre = "Activo",
        responsableId = responsableId,
        responsableNombre = "Juan",
        email = "mail@test.com",
        telefono = "1111",
        whatsappPhone = "+541111",
        preferredChannel = "whatsapp",
        montoEstimadoCompra = null,
        probabilidadConversion = null,
        fechaCierreEstimada = null,
        proximaAccionTipo = null,
        proximaAccionFecha = null,
        proximaAccionDesc = null,
        ultimaInteraccion = "2026-04-01T10:00:00Z",
        updatedAt = "2026-04-01T10:00:00Z",
        direccion = null,
        localidad = null,
        provincia = null,
        codigoPostal = null,
        notas = null,
        isDetalleCargado = false,
    )
}
