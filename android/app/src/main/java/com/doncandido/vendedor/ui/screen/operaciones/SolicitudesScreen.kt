package com.doncandido.vendedor.ui.screen.operaciones

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.NavyPrimary
import com.doncandido.vendedor.ui.theme.OrangeAccent
import com.doncandido.vendedor.ui.theme.TextPrimary
import com.doncandido.vendedor.ui.theme.TextSecondary
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.SolicitudOperacion
import com.doncandido.vendedor.domain.usecase.GetSolicitudOperacionUseCase
import com.doncandido.vendedor.domain.usecase.GetSolicitudesOperacionesUseCase
import com.doncandido.vendedor.domain.usecase.UpdateSolicitudOperacionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SolicitudesUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val query: String = "",
    val solicitudes: List<SolicitudOperacion> = emptyList(),
)

@HiltViewModel
class SolicitudesViewModel @Inject constructor(
    private val getSolicitudesUseCase: GetSolicitudesOperacionesUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SolicitudesUiState())
    val uiState: StateFlow<SolicitudesUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun onQueryChange(value: String) {
        _uiState.update { it.copy(query = value) }
    }

    fun refresh() {
        viewModelScope.launch {
            getSolicitudesUseCase(query = uiState.value.query).collectLatest { result ->
                when (result) {
                    is Resource.Success -> _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = null,
                            solicitudes = result.data,
                        )
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                    Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                }
            }
        }
    }
}

data class SolicitudDetailUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val solicitud: SolicitudOperacion? = null,
    val isSaving: Boolean = false,
)

@HiltViewModel
class SolicitudDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getSolicitudUseCase: GetSolicitudOperacionUseCase,
    private val updateSolicitudUseCase: UpdateSolicitudOperacionUseCase,
) : ViewModel() {
    private val solicitudId: String = checkNotNull(savedStateHandle["solicitudId"])
    private val _uiState = MutableStateFlow(SolicitudDetailUiState())
    val uiState: StateFlow<SolicitudDetailUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = getSolicitudUseCase(solicitudId)) {
                is Resource.Success -> _uiState.update {
                    it.copy(isLoading = false, solicitud = result.data)
                }
                is Resource.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun moveToReview() = update(estado = "en_revision", estadoOperativo = "diagnostico")

    fun moveToGestion() = update(estado = "gestionando", estadoOperativo = "en_campo")

    private fun update(
        estado: String?,
        estadoOperativo: String?,
    ) {
        val current = uiState.value.solicitud ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            when (
                val result = updateSolicitudUseCase(
                    id = current.id,
                    estado = estado,
                    estadoOperativo = estadoOperativo,
                    updatedAt = current.updatedAt,
                    auditNote = "Actualizacion operativa desde Android nativo",
                )
            ) {
                is Resource.Success -> _uiState.update {
                    it.copy(isSaving = false, solicitud = result.data)
                }
                is Resource.Error -> _uiState.update {
                    it.copy(isSaving = false, error = result.message)
                }
                Resource.Loading -> Unit
            }
        }
    }
}

private val FILTER_TABS = listOf("Todas", "Pendientes", "En Curso", "Completadas")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolicitudesScreen(
    onSolicitudClick: (String) -> Unit,
    viewModel: SolicitudesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var query by remember { mutableStateOf(uiState.query) }
    var selectedTab by remember { mutableIntStateOf(0) }

    val filtered = when (selectedTab) {
        1 -> uiState.solicitudes.filter { it.estado in listOf("recibida", "en_revision", "pendiente") }
        2 -> uiState.solicitudes.filter { it.estado in listOf("en_campo", "gestionando", "en_curso") }
        3 -> uiState.solicitudes.filter { it.estado in listOf("cerrada", "finalizada", "completado") }
        else -> uiState.solicitudes
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "OPERACIONES",
                            style = MaterialTheme.typography.labelMedium,
                            color = OrangeAccent,
                            letterSpacing = 1.sp,
                        )
                        Text(
                            "Solicitudes de Servicio",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardWhite),
            )
        },
        containerColor = BgLight,
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator(color = NavyPrimary) }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Search bar
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        viewModel.onQueryChange(it)
                        viewModel.refresh()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Buscar por ID, máquina o cliente...", color = TextSecondary) },
                    leadingIcon = {
                        Icon(Icons.Filled.Search, contentDescription = null, tint = TextSecondary)
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedContainerColor = CardWhite,
                        focusedContainerColor = CardWhite,
                        unfocusedBorderColor = Color.Transparent,
                        focusedBorderColor = NavyPrimary,
                    ),
                    singleLine = true,
                )
            }

            // Filter chips
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    itemsIndexed(FILTER_TABS) { index, label ->
                        val selected = selectedTab == index
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (selected) NavyPrimary else CardWhite)
                                .clickable { selectedTab = index }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            Text(
                                label,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (selected) Color.White else TextSecondary,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                            )
                        }
                    }
                }
            }

            uiState.error?.let { message ->
                item { ErrorCard(message) }
            }

            if (filtered.isEmpty() && !uiState.isLoading) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Sin solicitudes", color = TextSecondary)
                    }
                }
            }

            items(filtered) { solicitud ->
                SolicitudCard(
                    solicitud = solicitud,
                    onClick = { onSolicitudClick(solicitud.id) },
                )
            }
        }
    }
}

@Composable
private fun SolicitudCard(
    solicitud: com.doncandido.vendedor.domain.model.SolicitudOperacion,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "#${solicitud.numero ?: "---"}  ·  ${solicitud.tipo}",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextSecondary,
                )
                StatusPill(estado = solicitud.estado)
            }
            // Title
            Text(
                solicitud.nombre,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            // Client row
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(NavyPrimary.copy(alpha = 0.08f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = null,
                        tint = NavyPrimary,
                        modifier = Modifier.size(16.dp),
                    )
                }
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(
                        solicitud.nombre,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary,
                    )
                    solicitud.email?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
                Spacer(Modifier.weight(1f))
                Icon(
                    Icons.Filled.ArrowForward,
                    contentDescription = null,
                    tint = TextSecondary,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolicitudDetailScreen(
    onBack: () -> Unit,
    viewModel: SolicitudDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val solicitud = uiState.solicitud

    Scaffold(
        topBar = { TopAppBar(title = { Text("Detalle solicitud") }) },
    ) { padding ->
        if (uiState.isLoading || solicitud == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator() }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Volver") }
            }
            uiState.error?.let { message ->
                item { ErrorCard(message) }
            }
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            "${solicitud.nombre} · ${solicitud.tipo}",
                            style = MaterialTheme.typography.titleLarge,
                        )
                        Text("Estado: ${solicitud.estado}")
                        Text("Operativo: ${solicitud.estadoOperativo ?: "-"}")
                        Text("Mensaje: ${solicitud.mensaje ?: "Sin detalle"}")
                        Text("Contacto: ${solicitud.telefono ?: "-"} · ${solicitud.email ?: "-"}")
                    }
                }
            }
            item {
                Button(
                    onClick = viewModel::moveToReview,
                    enabled = !uiState.isSaving,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Pasar a revision") }
            }
            item {
                OutlinedButton(
                    onClick = viewModel::moveToGestion,
                    enabled = !uiState.isSaving,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Marcar en campo") }
            }
            item {
                Text("Evidencias", style = MaterialTheme.typography.titleMedium)
            }
            items(solicitud.evidencias) { evidencia ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(evidencia.label)
                        Text("${evidencia.type} · ${evidencia.fileName}")
                    }
                }
            }
        }
    }
}
