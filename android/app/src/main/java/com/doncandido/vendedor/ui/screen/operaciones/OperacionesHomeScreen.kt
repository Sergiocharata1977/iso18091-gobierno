package com.doncandido.vendedor.ui.screen.operaciones

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.domain.model.SolicitudOperacion
import com.doncandido.vendedor.domain.usecase.GetComprasOperacionesUseCase
import com.doncandido.vendedor.domain.usecase.GetSolicitudesOperacionesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.NavyPrimary
import com.doncandido.vendedor.ui.theme.OrangeAccent
import com.doncandido.vendedor.ui.theme.TextPrimary
import com.doncandido.vendedor.ui.theme.TextSecondary

data class OperacionesHomeUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val solicitudes: List<SolicitudOperacion> = emptyList(),
    val totalSolicitudes: Int = 0,
    val pendientesRevision: Int = 0,
    val comprasAbiertas: Int = 0,
    val syncPendiente: Int = 0,
)

@HiltViewModel
class OperacionesHomeViewModel @Inject constructor(
    private val getSolicitudesUseCase: GetSolicitudesOperacionesUseCase,
    private val getComprasUseCase: GetComprasOperacionesUseCase,
    private val syncQueueDao: SyncQueueDao,
    private val sessionManager: SessionManager,
) : ViewModel() {
    private val _uiState = MutableStateFlow(OperacionesHomeUiState())
    val uiState: StateFlow<OperacionesHomeUiState> = _uiState.asStateFlow()

    init {
        loadSolicitudes()
        loadCompras()
        observeSyncQueue()
    }

    private fun loadSolicitudes() {
        viewModelScope.launch {
            getSolicitudesUseCase().collectLatest { result ->
                when (result) {
                    is Resource.Success -> {
                        val pendientes = result.data.count {
                            it.estado == "recibida" || it.estado == "en_revision"
                        }
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                solicitudes = result.data.take(4),
                                totalSolicitudes = result.data.size,
                                pendientesRevision = pendientes,
                                error = null,
                            )
                        }
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                    Resource.Loading -> Unit
                }
            }
        }
    }

    private fun loadCompras() {
        viewModelScope.launch {
            getComprasUseCase().collectLatest { result ->
                if (result is Resource.Success) {
                    _uiState.update { it.copy(comprasAbiertas = result.data.size) }
                }
            }
        }
    }

    private fun observeSyncQueue() {
        viewModelScope.launch {
            val orgId = sessionManager.orgId.firstOrNull() ?: return@launch
            syncQueueDao.observePendingCount(orgId).collectLatest { count ->
                _uiState.update { it.copy(syncPendiente = count) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OperacionesHomeScreen(
    organizationName: String,
    onSolicitudClick: (String) -> Unit,
    viewModel: OperacionesHomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "DON CÁNDIDO",
                        fontWeight = FontWeight.ExtraBold,
                        color = NavyPrimary,
                        letterSpacing = 1.sp,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CardWhite,
                ),
            )
        },
        containerColor = BgLight,
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = NavyPrimary)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Greeting
            item {
                Column {
                    Text(
                        "PANEL DE OPERACIONES",
                        style = MaterialTheme.typography.labelMedium,
                        color = OrangeAccent,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Hola, $organizationName",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                    )
                }
            }

            // KPI 2x2 grid
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    KpiTile(
                        modifier = Modifier.weight(1f),
                        label = "SOLICITUDES HOY",
                        value = uiState.totalSolicitudes.toString(),
                        icon = Icons.Filled.Build,
                        isAccent = true,
                    )
                    KpiTile(
                        modifier = Modifier.weight(1f),
                        label = "EN PROGRESO",
                        value = (uiState.totalSolicitudes - uiState.pendientesRevision).toString(),
                        icon = Icons.Filled.Schedule,
                        isAccent = false,
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    KpiTile(
                        modifier = Modifier.weight(1f),
                        label = "PENDIENTES",
                        value = uiState.pendientesRevision.toString(),
                        icon = Icons.Filled.Schedule,
                        isAccent = false,
                    )
                    KpiTile(
                        modifier = Modifier.weight(1f),
                        label = "ÓRDENES DE COMPRA",
                        value = uiState.comprasAbiertas.toString(),
                        icon = Icons.Filled.ShoppingCart,
                        isAccent = false,
                    )
                }
            }

            // Error
            uiState.error?.let { message ->
                item { ErrorCard(message) }
            }

            // Solicitudes recientes
            if (uiState.solicitudes.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Mi Agenda",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                        )
                        Text(
                            "VER TODO",
                            style = MaterialTheme.typography.labelMedium,
                            color = OrangeAccent,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                items(uiState.solicitudes) { solicitud ->
                    SolicitudAgendaCard(
                        solicitud = solicitud,
                        onClick = { onSolicitudClick(solicitud.id) },
                    )
                }
            }

            // Sync status bar
            if (uiState.syncPendiente > 0) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(NavyPrimary)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(OrangeAccent),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                "ESTADO DE RED",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White.copy(alpha = 0.6f),
                                letterSpacing = 1.sp,
                            )
                            Text(
                                "${uiState.syncPendiente} acciones pendientes de sincronizar",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun KpiTile(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: ImageVector,
    isAccent: Boolean,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isAccent) OrangeAccent else CardWhite,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isAccent) 0.dp else 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = if (isAccent) Color.White.copy(alpha = 0.8f) else TextSecondary,
                letterSpacing = 0.5.sp,
                fontSize = 10.sp,
            )
            Text(
                value,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.ExtraBold,
                color = if (isAccent) Color.White else TextPrimary,
                fontSize = 40.sp,
            )
        }
    }
}

@Composable
private fun SolicitudAgendaCard(
    solicitud: SolicitudOperacion,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Icon placeholder
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(NavyPrimary.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Build,
                    contentDescription = null,
                    tint = NavyPrimary,
                    modifier = Modifier.size(24.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        solicitud.nombre,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f),
                    )
                    StatusPill(estado = solicitud.estado)
                }
                Spacer(Modifier.height(2.dp))
                Text(
                    solicitud.tipo,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
            }
        }
    }
}
