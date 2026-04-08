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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Public
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.NavyPrimary
import com.doncandido.vendedor.ui.theme.OrangeAccent
import com.doncandido.vendedor.ui.theme.TextPrimary
import com.doncandido.vendedor.ui.theme.TextSecondary

private data class GovServicioPreview(
    val nombre: String,
    val categoria: String,
    val disponibilidad: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GovServiciosScreen() {
    val servicios = listOf(
        GovServicioPreview("Carta de servicios", "Atencion ciudadana", "Disponible"),
        GovServicioPreview("Turnos para tramites", "Modernizacion", "Proximamente"),
        GovServicioPreview("Incidencias urbanas", "Servicios publicos", "Proximamente"),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Servicios") },
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
                        "CARTA DE SERVICIOS",
                        style = MaterialTheme.typography.labelMedium,
                        color = OrangeAccent,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Catalogo de modulos ciudadanos",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                    )
                }
            }

            item {
                GovTimelineCard(
                    title = "Roadmap de integracion",
                    items = listOf(
                        "Publicar indicadores de disponibilidad por servicio.",
                        "Exponer onboarding y requisitos por tramite.",
                        "Unificar estado operativo con el monitor municipal.",
                    ),
                )
            }

            items(servicios) { servicio ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(NavyPrimary.copy(alpha = 0.08f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = if (servicio.disponibilidad == "Disponible") {
                                    Icons.Filled.CheckCircle
                                } else {
                                    Icons.Filled.Public
                                },
                                contentDescription = null,
                                tint = if (servicio.disponibilidad == "Disponible") OrangeAccent else NavyPrimary,
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                servicio.nombre,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary,
                            )
                            Text(
                                servicio.categoria,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                servicio.disponibilidad.uppercase(),
                                style = MaterialTheme.typography.labelMedium,
                                color = OrangeAccent,
                                letterSpacing = 0.5.sp,
                            )
                            Text(
                                "Nativo",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Apartment,
                            contentDescription = null,
                            tint = NavyPrimary,
                        )
                        Text(
                            "Seccion preparada para mostrar responsables, canales y cobertura por dependencia.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                        )
                    }
                }
            }
        }
    }
}
