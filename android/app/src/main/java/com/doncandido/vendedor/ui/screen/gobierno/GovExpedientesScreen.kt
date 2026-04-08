package com.doncandido.vendedor.ui.screen.gobierno

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.NavyPrimary
import com.doncandido.vendedor.ui.theme.OrangeAccent
import com.doncandido.vendedor.ui.theme.TextPrimary
import com.doncandido.vendedor.ui.theme.TextSecondary

private data class GovExpedientePreview(
    val code: String,
    val asunto: String,
    val estado: String,
    val area: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GovExpedientesScreen() {
    val expedientes = listOf(
        GovExpedientePreview("EXP-18091-024", "Solicitud de mantenimiento urbano", "En revision", "Obras publicas"),
        GovExpedientePreview("EXP-18091-025", "Reclamo por alumbrado", "Asignado", "Servicios publicos"),
        GovExpedientePreview("EXP-18091-026", "Permiso de evento barrial", "Pendiente", "Gobierno abierto"),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Expedientes") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardWhite),
            )
        },
        containerColor = BgLight,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column {
                    Text(
                        "SEGUIMIENTO",
                        style = MaterialTheme.typography.labelMedium,
                        color = OrangeAccent,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Bandeja inicial de expedientes",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Placeholder para integrar filtros, estado documental y derivaciones entre areas.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                    )
                }
            }

            item {
                GovHighlightCard(
                    title = "Estado del modulo",
                    body = "La pantalla ya refleja una lista nativa Compose para conectar luego busquedas, SLA y detalle por expediente.",
                )
            }

            items(expedientes) { expediente ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                expediente.code,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary,
                            )
                            Text(
                                expediente.estado.uppercase(),
                                style = MaterialTheme.typography.labelMedium,
                                color = OrangeAccent,
                                letterSpacing = 0.6.sp,
                            )
                        }
                        Text(
                            expediente.asunto,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                        )
                        Text(
                            expediente.area,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                        )
                    }
                }
            }
        }
    }
}
