package com.doncandido.vendedor.ui.screen.operaciones

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doncandido.vendedor.ui.theme.StatusCompletado
import com.doncandido.vendedor.ui.theme.StatusCompletadoContainer
import com.doncandido.vendedor.ui.theme.StatusEnCurso
import com.doncandido.vendedor.ui.theme.StatusEnCursoContainer
import com.doncandido.vendedor.ui.theme.StatusPendiente
import com.doncandido.vendedor.ui.theme.StatusPendienteContainer
import com.doncandido.vendedor.ui.theme.StatusUrgente
import com.doncandido.vendedor.ui.theme.StatusUrgenteContainer
import com.doncandido.vendedor.ui.theme.TextSecondary

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(title, style = MaterialTheme.typography.labelLarge)
            Text(value, style = MaterialTheme.typography.headlineMedium)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
fun ErrorCard(message: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        ),
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onErrorContainer,
            modifier = Modifier.padding(16.dp),
        )
    }
}

@Composable
fun StatusPill(estado: String, modifier: Modifier = Modifier) {
    val (bg, fg, label) = when (estado.lowercase()) {
        "en_curso", "en_campo", "gestionando" -> Triple(StatusEnCursoContainer, StatusEnCurso, "EN CURSO")
        "pendiente", "recibida", "en_revision" -> Triple(StatusPendienteContainer, StatusPendiente, "PENDIENTE")
        "completado", "cerrada", "finalizada" -> Triple(StatusCompletadoContainer, StatusCompletado, "COMPLETADO")
        "urgente", "critica", "critico" -> Triple(StatusUrgenteContainer, StatusUrgente, "URGENTE")
        else -> Triple(Color(0xFFF3F4F6), TextSecondary, estado.uppercase())
    }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = fg,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            letterSpacing = 0.5.sp,
        )
    }
}

@Composable
fun TwoColumnStats(
    firstTitle: String,
    firstValue: String,
    firstSubtitle: String,
    secondTitle: String,
    secondValue: String,
    secondSubtitle: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        StatCard(
            title = firstTitle,
            value = firstValue,
            subtitle = firstSubtitle,
            modifier = Modifier.weight(1f),
        )
        StatCard(
            title = secondTitle,
            value = secondValue,
            subtitle = secondSubtitle,
            modifier = Modifier.weight(1f),
        )
    }
}
