package com.doncandido.vendedor.ui.screen.gobierno

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.QueryStats
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.NavyPrimary
import com.doncandido.vendedor.ui.theme.OrangeAccent
import com.doncandido.vendedor.ui.theme.TextPrimary
import com.doncandido.vendedor.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GovMonitorScreen() {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "DON CANDIDO GOBIERNO",
                        fontWeight = FontWeight.ExtraBold,
                        color = NavyPrimary,
                        letterSpacing = 1.sp,
                    )
                },
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
                        "MONITOR 18091",
                        style = MaterialTheme.typography.labelMedium,
                        color = OrangeAccent,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Panel ejecutivo municipal",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Shell nativa lista para integrar indicadores, alertas y seguimiento interareas.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    GovMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "EXPEDIENTES",
                        value = "128",
                        icon = Icons.Filled.TaskAlt,
                        accent = false,
                    )
                    GovMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "ALERTAS",
                        value = "09",
                        icon = Icons.Filled.NotificationsActive,
                        accent = true,
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    GovMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "SERVICIOS",
                        value = "24",
                        icon = Icons.Filled.AccountBalance,
                        accent = false,
                    )
                    GovMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "SLA HOY",
                        value = "92%",
                        icon = Icons.Filled.QueryStats,
                        accent = false,
                    )
                }
            }

            item {
                GovHighlightCard(
                    title = "Integracion pendiente",
                    body = "Este espacio expondra resumen operativo, tablero de incidencias y cortes de servicio del monitor 18091.",
                )
            }

            item {
                GovTimelineCard(
                    title = "Proxima ola",
                    items = listOf(
                        "Conectar repositorio de monitor con endpoints reales.",
                        "Agregar filtros por dependencia y criticidad.",
                        "Incorporar trazabilidad de expedientes urgentes.",
                    ),
                )
            }
        }
    }
}

@Composable
private fun GovMetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    accent: Boolean,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (accent) OrangeAccent else CardWhite,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (accent) 0.dp else 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        if (accent) Color.White.copy(alpha = 0.18f)
                        else NavyPrimary.copy(alpha = 0.08f),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (accent) Color.White else NavyPrimary,
                )
            }
            Text(
                title,
                style = MaterialTheme.typography.labelMedium,
                color = if (accent) Color.White.copy(alpha = 0.82f) else TextSecondary,
                fontSize = 10.sp,
                letterSpacing = 0.5.sp,
            )
            Text(
                value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = if (accent) Color.White else TextPrimary,
            )
        }
    }
}

@Composable
internal fun GovHighlightCard(title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = NavyPrimary),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.78f),
            )
        }
    }
}

@Composable
internal fun GovTimelineCard(title: String, items: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            items.forEachIndexed { index, item ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .padding(top = 4.dp)
                            .size(8.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (index == 0) OrangeAccent else NavyPrimary.copy(alpha = 0.35f)),
                    )
                    Text(
                        item,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                    )
                }
            }
        }
    }
}
