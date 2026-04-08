package com.doncandido.vendedor.ui.screen.clientes

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Note
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doncandido.vendedor.ui.components.LoadingSkeletonList

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClienteDetailScreen(
    onBack: () -> Unit,
    viewModel: ClienteDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    LaunchedEffect(uiState.notaSavedSuccess) {
        if (uiState.notaSavedSuccess) {
            snackbarHostState.showSnackbar("Nota guardada")
            viewModel.onNotaSavedAcknowledged()
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
            title = { Text("Datos desactualizados") },
            text = { Text("El cliente fue modificado desde otro dispositivo. Se actualizaron los datos. Intenta guardar la nota de nuevo.") },
            confirmButton = {
                TextButton(onClick = viewModel::onErrorDismissed) { Text("Entendido") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.cliente?.razonSocial ?: "Detalle") },
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
            uiState.isLoading -> LoadingSkeletonList(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(padding)
            )
            uiState.cliente == null -> {}
            else -> {
                val cliente = uiState.cliente!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Header info
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(cliente.razonSocial, style = MaterialTheme.typography.titleLarge)
                        cliente.nombreComercial?.let {
                            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        cliente.cuitCuil?.let {
                            Text("CUIT: $it", style = MaterialTheme.typography.bodySmall)
                        }
                        cliente.estadoNombre?.let {
                            Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                        }
                    }

                    HorizontalDivider()

                    // Contacto + CTAs
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Contacto", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(8.dp))

                        cliente.telefono?.let { tel ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(tel, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$tel")))
                                }) { Icon(Icons.Filled.Call, contentDescription = "Llamar", modifier = Modifier.size(20.dp)) }
                                IconButton(onClick = {
                                    clipboard.setText(AnnotatedString(tel))
                                }) { Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar", modifier = Modifier.size(20.dp)) }
                            }
                        }

                        cliente.whatsappPhone?.let { wa ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(wa, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    val clean = wa.filter { it.isDigit() }
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$clean")))
                                }) { Icon(Icons.Filled.Send, contentDescription = "WhatsApp", modifier = Modifier.size(20.dp)) }
                            }
                        }

                        cliente.email?.let {
                            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    HorizontalDivider()

                    // Proxima accion
                    if (cliente.proximaAccionTipo != null) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Proxima accion", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(4.dp))
                            Text("${cliente.proximaAccionTipo}: ${cliente.proximaAccionDesc ?: ""}")
                            cliente.proximaAccionFecha?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        HorizontalDivider()
                    }

                    // Notas
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Notas", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(8.dp))

                        if (!cliente.notas.isNullOrBlank()) {
                            Text(
                                text = cliente.notas,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(12.dp))
                        }

                        // Agregar nota
                        OutlinedTextField(
                            value = uiState.notaInput,
                            onValueChange = viewModel::onNotaChange,
                            label = { Text("Nueva nota") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 5,
                            enabled = !uiState.isSavingNota,
                        )
                        Spacer(Modifier.height(8.dp))
                        FilledTonalButton(
                            onClick = viewModel::onGuardarNota,
                            enabled = uiState.notaInput.isNotBlank() && !uiState.isSavingNota,
                            modifier = Modifier.align(Alignment.End),
                        ) {
                            if (uiState.isSavingNota) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.AutoMirrored.Filled.Note, contentDescription = null, modifier = Modifier.size(16.dp))
                                Text("  Guardar nota")
                            }
                        }
                    }

                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}
