package com.doncandido.vendedor.ui.screen.gobierno

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.doncandido.vendedor.ui.theme.BgLight
import com.doncandido.vendedor.ui.theme.CardWhite
import com.doncandido.vendedor.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GovPerfilScreen(onLogout: () -> Unit) {
    var showLogoutConfirm by remember { mutableStateOf(false) }

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Cerrar sesion") },
            text = { Text("Confirmas que queres salir del modulo gobierno?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutConfirm = false
                        onLogout()
                    },
                ) { Text("Salir") }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) { Text("Cancelar") }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Perfil") },
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(
                            "Operacion municipal",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            "Mesa de gobierno local",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        Text(
                            "Shell nativa preparada para autenticacion, permisos y auditoria.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                ) {
                    Column {
                        ListItem(
                            headlineContent = { Text("Dependencia") },
                            supportingContent = { Text("Secretaria de Gobierno") },
                            leadingContent = { Icon(Icons.Filled.Domain, contentDescription = null) },
                        )
                        HorizontalDivider()
                        ListItem(
                            headlineContent = { Text("Rol") },
                            supportingContent = { Text("Operador municipal") },
                            leadingContent = { Icon(Icons.Filled.Badge, contentDescription = null) },
                        )
                        HorizontalDivider()
                        ListItem(
                            headlineContent = { Text("Acceso") },
                            supportingContent = { Text("Monitor 18091 - proximamente con permisos reales") },
                            leadingContent = { Icon(Icons.Filled.VerifiedUser, contentDescription = null) },
                        )
                    }
                }
            }

            item {
                ListItem(
                    headlineContent = {
                        Text(
                            "Cerrar sesion",
                            color = MaterialTheme.colorScheme.error,
                        )
                    },
                    supportingContent = { Text("Volver al login nativo de gobierno") },
                    leadingContent = {
                        Icon(
                            Icons.AutoMirrored.Filled.ExitToApp,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showLogoutConfirm = true },
                )
            }
        }
    }
}
