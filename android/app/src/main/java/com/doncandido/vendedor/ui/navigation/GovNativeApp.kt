package com.doncandido.vendedor.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.MiscellaneousServices
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.doncandido.vendedor.ui.screen.gobierno.GovExpedientesScreen
import com.doncandido.vendedor.ui.screen.gobierno.GovMonitorScreen
import com.doncandido.vendedor.ui.screen.gobierno.GovPerfilScreen
import com.doncandido.vendedor.ui.screen.gobierno.GovServiciosScreen
import com.doncandido.vendedor.ui.screen.login.LoginScreen

sealed class GovScreen(val route: String) {
    data object Login : GovScreen("government/login")
    data object Main : GovScreen("government/main")
    data object Monitor : GovScreen("government/monitor")
    data object Expedientes : GovScreen("government/expedientes")
    data object Servicios : GovScreen("government/servicios")
    data object Perfil : GovScreen("government/perfil")
}

private data class GovNavItem(
    val screen: GovScreen,
    val label: String,
    val icon: ImageVector,
)

private val GOV_NAV_ITEMS = listOf(
    GovNavItem(GovScreen.Monitor, "Monitor", Icons.Filled.FactCheck),
    GovNavItem(GovScreen.Expedientes, "Expedientes", Icons.Filled.Description),
    GovNavItem(GovScreen.Servicios, "Servicios", Icons.Filled.MiscellaneousServices),
    GovNavItem(GovScreen.Perfil, "Perfil", Icons.Filled.ManageAccounts),
)

@Composable
fun GovNativeApp() {
    val rootNav = rememberNavController()

    NavHost(
        navController = rootNav,
        startDestination = GovScreen.Login.route,
    ) {
        composable(GovScreen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    rootNav.navigate(GovScreen.Main.route) {
                        popUpTo(GovScreen.Login.route) { inclusive = true }
                    }
                },
            )
        }

        composable(GovScreen.Main.route) {
            GovScaffold(
                onLogout = {
                    rootNav.navigate(GovScreen.Login.route) {
                        popUpTo(GovScreen.Main.route) { inclusive = true }
                    }
                },
            )
        }
    }
}

@Composable
private fun GovScaffold(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val topLevelRoutes = GOV_NAV_ITEMS.map { it.screen.route }.toSet()
    val showBottomBar = currentDestination?.route in topLevelRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    GOV_NAV_ITEMS.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any {
                            it.route == item.screen.route
                        } == true
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = GovScreen.Monitor.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(GovScreen.Monitor.route) { GovMonitorScreen() }
            composable(GovScreen.Expedientes.route) { GovExpedientesScreen() }
            composable(GovScreen.Servicios.route) { GovServiciosScreen() }
            composable(GovScreen.Perfil.route) { GovPerfilScreen(onLogout = onLogout) }
        }
    }
}
