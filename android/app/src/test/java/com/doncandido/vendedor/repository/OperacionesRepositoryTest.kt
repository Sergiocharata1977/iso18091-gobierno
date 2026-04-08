package com.doncandido.vendedor.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.CatalogoProductoDao
import com.doncandido.vendedor.data.local.dao.CompraOperacionDao
import com.doncandido.vendedor.data.local.dao.MapaClienteDao
import com.doncandido.vendedor.data.local.dao.SolicitudEvidenciaDao
import com.doncandido.vendedor.data.local.dao.SolicitudOperacionDao
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.data.local.entities.SolicitudOperacionEntity
import com.doncandido.vendedor.data.remote.OperacionesApiService
import com.doncandido.vendedor.data.remote.dto.MobileListResponse
import com.doncandido.vendedor.data.remote.dto.MobileMeta
import com.doncandido.vendedor.data.remote.dto.SolicitudResumenDto
import com.doncandido.vendedor.data.repository.OperacionesRepository
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

class OperacionesRepositoryTest {

    private lateinit var api: OperacionesApiService
    private lateinit var sessionManager: SessionManager
    private lateinit var solicitudDao: SolicitudOperacionDao
    private lateinit var evidenciaDao: SolicitudEvidenciaDao
    private lateinit var compraDao: CompraOperacionDao
    private lateinit var catalogoDao: CatalogoProductoDao
    private lateinit var mapaDao: MapaClienteDao
    private lateinit var syncQueueDao: SyncQueueDao
    private lateinit var repository: OperacionesRepository

    @Before
    fun setup() {
        api = mockk()
        sessionManager = mockk()
        solicitudDao = mockk()
        evidenciaDao = mockk(relaxed = true)
        compraDao = mockk(relaxed = true)
        catalogoDao = mockk(relaxed = true)
        mapaDao = mockk(relaxed = true)
        syncQueueDao = mockk(relaxed = true)

        every { sessionManager.orgId } returns flowOf("org-1")

        repository = OperacionesRepository(
            api = api,
            sessionManager = sessionManager,
            solicitudDao = solicitudDao,
            evidenciaDao = evidenciaDao,
            compraDao = compraDao,
            catalogoDao = catalogoDao,
            mapaDao = mapaDao,
            syncQueueDao = syncQueueDao,
        )
    }

    @Test
    fun getSolicitudes_emitsFreshMappedData_afterNetworkSync() = runTest {
        val fresh = solicitudEntity(id = "sol-1", nombre = "Solicitud Fresca", estado = "abierta")
        val response = MobileListResponse(
            success = true,
            data = listOf(
                SolicitudResumenDto(
                    id = "sol-1",
                    numero = 101,
                    tipo = "mantenimiento",
                    flujo = "normal",
                    estado = "abierta",
                    estadoOperativo = "en_ruta",
                    prioridad = "alta",
                    nombre = "Solicitud Fresca",
                    telefono = "1111",
                    email = "sol@test.com",
                    assignedTo = "Operador 1",
                    crmSyncStatus = "synced",
                    crmOportunidadId = "op-1",
                    updatedAt = "2026-04-01T10:00:00Z",
                    createdAt = "2026-03-01T10:00:00Z",
                )
            ),
            meta = meta(),
        )

        coEvery { solicitudDao.query("org-1", null, null, null) } returnsMany listOf(
            emptyList(),
            listOf(fresh),
        )
        coEvery { solicitudDao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { solicitudDao.upsertAll(any()) } returns Unit
        coEvery { api.getSolicitudes(any(), any(), any(), any(), any(), any()) } returns response

        val emissions = repository.getSolicitudes(tipo = null, estado = null, query = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)

        val freshData = (emissions[1] as Resource.Success).data.first()
        assertEquals("sol-1", freshData.id)
        assertEquals("Solicitud Fresca", freshData.nombre)
        assertEquals("abierta", freshData.estado)
        assertEquals("en_ruta", freshData.estadoOperativo)
    }

    @Test
    fun getSolicitudes_emitsError_whenNoCacheAndNetworkFails() = runTest {
        coEvery { solicitudDao.query("org-1", null, null, null) } returns emptyList()
        coEvery { solicitudDao.getLastUpdatedAt("org-1") } returns null
        coEvery { api.getSolicitudes(any(), any(), any(), any(), any(), any()) } throws RuntimeException("sin red")

        val emissions = repository.getSolicitudes(tipo = null, estado = null, query = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Error)
        assertEquals("sin red", (emissions[1] as Resource.Error).message)
    }

    @Test
    fun getSolicitudes_keepsCachedData_whenNetworkFails() = runTest {
        val cached = solicitudEntity(id = "sol-cache", nombre = "Solicitud Cache", estado = "pendiente")

        coEvery { solicitudDao.query("org-1", null, null, null) } returns listOf(cached)
        coEvery { solicitudDao.getLastUpdatedAt("org-1") } returns "2026-03-01T00:00:00Z"
        coEvery { api.getSolicitudes(any(), any(), any(), any(), any(), any()) } throws RuntimeException("timeout")

        val emissions = repository.getSolicitudes(tipo = null, estado = null, query = null).toList()

        assertTrue(emissions[0] is Resource.Loading)
        assertTrue(emissions[1] is Resource.Success)
        assertEquals(2, emissions.size)
        assertEquals("sol-cache", (emissions[1] as Resource.Success).data.first().id)
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

    private fun solicitudEntity(
        id: String,
        nombre: String,
        estado: String,
    ) = SolicitudOperacionEntity(
        id = id,
        organizationId = "org-1",
        numero = 101,
        tipo = "mantenimiento",
        flujo = "normal",
        estado = estado,
        estadoOperativo = "en_ruta",
        prioridad = "alta",
        nombre = nombre,
        telefono = "1111",
        email = "sol@test.com",
        assignedTo = "Operador 1",
        crmSyncStatus = "synced",
        crmOportunidadId = "op-1",
        mensaje = null,
        updatedAt = "2026-04-01T10:00:00Z",
        createdAt = "2026-03-01T10:00:00Z",
        isDetalleCargado = false,
    )
}
