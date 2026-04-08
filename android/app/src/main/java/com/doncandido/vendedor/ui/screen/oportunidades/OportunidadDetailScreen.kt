package com.doncandido.vendedor.ui.screen.oportunidades

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doncandido.vendedor.domain.model.HistorialEstado
import com.doncandido.vendedor.domain.model.KanbanEstado
import com.doncandido.vendedor.ui.components.LoadingSkeletonList

// Minimal hardcoded stage list — in Ola 4 this fetches from /api/mobile/crm/catalogs/kanban-estados
private val ETAPAS_PLACEHOLDER = listOf(
    KanbanEstado("prospecto", "Prospecto", "#6366f1"),
    KanbanEstado("contactado", "Contactado", "#3b82f6"),
    KanbanEstado("interesado", "Interesado", "#f59e0b"),
    KanbanEstado("propuesta", "Propuesta enviada", "#f97316"),
    KanbanEstado("negociacion", "Negociacion", "#ef4444"),
    KanbanEstado("ganada", "Ganada", "#22c55e"),
    KanbanEstado("perdida", "Perdida", "#6b7280"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OportunidadDetailScreen(
    onBack: () -> Unit,
    viewModel: OportunidadDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.etapaCambiadaSuccess) {
        if (uiState.etapaCambiadaSuccess) {
            snackbarHostState.showSnackbar("Etapa actualizada")
            viewModel.onEtapaCambiadaAcknowledged()
        }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.onErrorDismissed()
        }
    }

    if (uiState.conflictError) {
        AlertDialog(
            onDismissRequest = viewModel::onErrorDismissed,
            icon = { Icon(Icons.Filled.Warning, contentDescription = null) },
            title = { Text("Conflicto de version") },
            text = { Text("La oportunidad fue modificada desde otro dispositivo. Se actualizaron los datos. Intenta el cambio de etapa de nuevo.") },
            confirmButton = { TextButton(onClick = viewModel::onErrorDismissed) { Text("Entendido") } },
        )
    }

    if (uiState.showEtapaSelector) {
        ModalBottomSheet(onDismissRequest = viewModel::onToggleEtapaSelector) {
            Text(
                "Cambiar etapa",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            ETAPAS_PLACEHOLDER.forEach { etapa ->
                ListItem(
                    headlineContent = { Text(etapa.nombre) },
                    leadingContent = {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(
                                    runCatching { Color(android.graphics.Color.parseColor(etapa.color)) }.getOrElse { Color.Gray },
                                    RoundedCornerShape(50),
                                )
                        )
                    },
                    modifier = Modifier.clickable { viewModel.onCambiarEtapa(etapa) },
                )
            }
            Spacer(Modifier.height(32.dp))
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.oportunidad?.nombre ?: "Oportunidad") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        when {
            uiState.isLoading -> LoadingSkeletonList(modifier = Modifier.fillMaxWidth().padding(padding))
            uiState.oportunidad == null -> {}
            else -> {
                val op = uiState.oportunidad!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Header
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(op.nombre, style = MaterialTheme.typography.titleLarge)
                        op.clienteNombre?.let {
                            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row {
                            op.estadoNombre?.let {
                                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        op.montoEstimado?.let {
                            Text("$ ${"%,.0f".format(it)}", style = MaterialTheme.typography.headlineMedium)
                        }
                        op.probabilidad?.let {
                            Text("Probabilidad: $it%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        op.fechaCierreEstimada?.let {
                            Text("Cierre estimado: $it", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    HorizontalDivider()

                    // Cambiar etapa CTA
                    Column(modifier = Modifier.padding(16.dp)) {
                        FilledTonalButton(
                            onClick = viewModel::onToggleEtapaSelector,
                            enabled = !uiState.isCambiandoEtapa,
                        ) {
                            Icon(Icons.Filled.SwapHoriz, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(if (uiState.isCambiandoEtapa) "Cambiando..." else "Cambiar etapa")
                        }
                    }

                    HorizontalDivider()

                    // Timeline de historial de estados
                    if (op.historialEstados.isNotEmpty()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Historial de etapas", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(8.dp))
                            op.historialEstados.forEach { entry ->
                                HistorialRow(entry)
                            }
                        }
                        HorizontalDivider()
                    }

                    // Responsable
                    op.responsableNombre?.let {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Responsable", style = MaterialTheme.typography.titleMedium)
                            Text(it, style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}

@Composable
private fun HistorialRow(entry: HistorialEstado) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Column {
            Text(
                text = entry.estadoNombre ?: "—",
                style = MaterialTheme.typography.bodyMedium,
            )
            entry.timestamp?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            entry.usuarioNombre?.let {
                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
