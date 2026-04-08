package com.doncandido.vendedor.ui.screen.acciones

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.ui.components.EmptyState
import com.doncandido.vendedor.ui.components.LoadingSkeletonList
import com.doncandido.vendedor.ui.components.OfflineBanner

private val ESTADO_FILTERS = listOf(
    null to "Todas",
    "pendiente" to "Pendiente",
    "en_progreso" to "En progreso",
    "completada" to "Completada",
)

private val TIPO_OPTIONS = listOf(
    "llamada" to "Llamada",
    "reunion" to "Reunión",
    "email" to "Email",
    "visita" to "Visita",
    "otro" to "Otro",
)

private val CANAL_OPTIONS = listOf(
    "telefono" to "Teléfono",
    "whatsapp" to "WhatsApp",
    "email" to "Email",
    "presencial" to "Presencial",
    "videoconferencia" to "Video",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccionesListScreen(
    viewModel: AccionesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.creadaSuccess) {
        if (uiState.creadaSuccess) {
            snackbarHostState.showSnackbar("Acción registrada")
            viewModel.onCreadaSuccessAcknowledged()
        }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.onErrorDismissed()
        }
    }

    if (uiState.showCrearDialog) {
        CrearAccionDialog(
            isCreando = uiState.isCreando,
            onDismiss = viewModel::onToggleCrearDialog,
            onCreate = { tipo, canal, titulo, descripcion, fechaProgramada ->
                viewModel.onCrearAccion(tipo, canal, titulo, descripcion, null, null, fechaProgramada)
            },
        )
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Acciones") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = viewModel::onToggleCrearDialog) {
                Icon(Icons.Filled.Add, contentDescription = "Nueva acción")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.isOffline) OfflineBanner()

            // Filter chips
            LazyRow(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(ESTADO_FILTERS) { (estado, label) ->
                    FilterChip(
                        selected = uiState.filtroEstado == estado,
                        onClick = { viewModel.onFiltroEstado(estado) },
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                    )
                }
            }

            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = viewModel::onRefresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    uiState.isLoading -> LoadingSkeletonList(modifier = Modifier.fillMaxWidth())
                    uiState.acciones.isEmpty() -> EmptyState(
                        icon = Icons.Filled.EventNote,
                        title = "Sin acciones",
                        subtitle = "Registra llamadas, reuniones o visitas con tus clientes",
                        modifier = Modifier.fillMaxSize(),
                    )
                    else -> LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(uiState.acciones, key = { it.id }) { accion ->
                            AccionRow(accion = accion)
                            HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccionRow(accion: Accion) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(accion.titulo, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    accion.tipo,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    " · ${accion.canal}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            accion.clienteNombre?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            accion.descripcion?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            val estadoColor = when (accion.estado) {
                "completada" -> MaterialTheme.colorScheme.primary
                "en_progreso" -> MaterialTheme.colorScheme.tertiary
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
            Text(
                accion.estado ?: "pendiente",
                style = MaterialTheme.typography.labelSmall,
                color = estadoColor,
            )
            accion.fechaProgramada?.let {
                Spacer(Modifier.height(2.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun CrearAccionDialog(
    isCreando: Boolean,
    onDismiss: () -> Unit,
    onCreate: (tipo: String, canal: String, titulo: String, descripcion: String?, fechaProgramada: String?) -> Unit,
) {
    var titulo by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var tipo by remember { mutableStateOf(TIPO_OPTIONS.first().first) }
    var canal by remember { mutableStateOf(CANAL_OPTIONS.first().first) }
    var fechaProgramada by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nueva acción") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = titulo,
                    onValueChange = { titulo = it },
                    label = { Text("Título *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                // Tipo selector chips
                Text("Tipo", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(TIPO_OPTIONS) { (value, label) ->
                        FilterChip(
                            selected = tipo == value,
                            onClick = { tipo = value },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
                // Canal selector chips
                Text("Canal", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(CANAL_OPTIONS) { (value, label) ->
                        FilterChip(
                            selected = canal == value,
                            onClick = { canal = value },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    label = { Text("Descripción (opcional)") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = fechaProgramada,
                    onValueChange = { fechaProgramada = it },
                    label = { Text("Fecha programada (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onCreate(
                        tipo,
                        canal,
                        titulo,
                        descripcion.takeIf { it.isNotBlank() },
                        fechaProgramada.takeIf { it.isNotBlank() },
                    )
                },
                enabled = titulo.isNotBlank() && !isCreando,
            ) {
                Text(if (isCreando) "Guardando..." else "Crear")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}
