package com.doncandido.vendedor.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.hilt.navigation.compose.hiltViewModel
import com.doncandido.vendedor.ui.screen.login.LoginScreen
import com.doncandido.vendedor.ui.screen.operaciones.CatalogoScreen
import com.doncandido.vendedor.ui.screen.operaciones.ComprasScreen
import com.doncandido.vendedor.ui.screen.operaciones.MapaClientesScreen
import com.doncandido.vendedor.ui.screen.operaciones.OperacionesHomeScreen
import com.doncandido.vendedor.ui.screen.operaciones.SolicitudDetailScreen
import com.doncandido.vendedor.ui.screen.operaciones.SolicitudesScreen
import com.doncandido.vendedor.ui.screen.perfil.PerfilScreen

sealed class OperacionesScreen(val route: String) {
    data object Login : OperacionesScreen("operaciones/login")
    data object Main : OperacionesScreen("operaciones/main")
    data object Home : OperacionesScreen("operaciones/home")
    data object Solicitudes : OperacionesScreen("operaciones/solicitudes")
    data object Compras : OperacionesScreen("operaciones/compras")
    data object Catalogo : OperacionesScreen("operaciones/catalogo")
    data object Mapa : OperacionesScreen("operaciones/mapa")
    data object Perfil : OperacionesScreen("operaciones/perfil")
    data object SolicitudDetail : OperacionesScreen("operaciones/solicitudes/{solicitudId}") {
        fun createRoute(id: String) = "operaciones/solicitudes/$id"
    }
}

private data class OpsNavItem(
    val screen: OperacionesScreen,
    val label: String,
    val icon: ImageVector,
)

@Composable
fun OperacionesNativeApp() {
    val rootNav = rememberNavController()
    NavHost(
        navController = rootNav,
        startDestination = OperacionesScreen.Login.route,
    ) {
        composable(OperacionesScreen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    rootNav.navigate(OperacionesScreen.Main.route) {
                        popUpTo(OperacionesScreen.Login.route) { inclusive = true }
                    }
                },
            )
        }

        composable(OperacionesScreen.Main.route) {
            OperacionesScaffold(
                onLogout = {
                    rootNav.navigate(OperacionesScreen.Login.route) {
                        popUpTo(OperacionesScreen.Main.route) { inclusive = true }
                    }
                },
            )
        }
    }
}

@Composable
private fun OperacionesScaffold(
    onLogout: () -> Unit,
    viewModel: OperacionesShellViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val uiState by viewModel.uiState.collectAsState()
    val operacionesNavItems = remember(uiState.enabledModules) {
        buildOperacionesNavItems(uiState.enabledModules)
    }
    val topLevelRoutes = operacionesNavItems.map { it.screen.route }.toSet()
    val showBottomBar = currentDestination?.route in topLevelRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    operacionesNavItems.forEach { item ->
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
            startDestination = OperacionesScreen.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(OperacionesScreen.Home.route) {
                OperacionesHomeScreen(
                    organizationName = uiState.organizationName,
                    onSolicitudClick = {
                        navController.navigate(OperacionesScreen.SolicitudDetail.createRoute(it))
                    },
                )
            }
            if (uiState.enabledModules.contains("solicitudes")) {
                composable(OperacionesScreen.Solicitudes.route) {
                    SolicitudesScreen(
                        onSolicitudClick = {
                            navController.navigate(OperacionesScreen.SolicitudDetail.createRoute(it))
                        },
                    )
                }
            }
            if (uiState.enabledModules.contains("compras")) {
                composable(OperacionesScreen.Compras.route) { ComprasScreen() }
            }
            if (uiState.enabledModules.contains("catalogo")) {
                composable(OperacionesScreen.Catalogo.route) { CatalogoScreen() }
            }
            if (uiState.enabledModules.contains("mapa_clientes")) {
                composable(OperacionesScreen.Mapa.route) { MapaClientesScreen() }
            }
            composable(OperacionesScreen.Perfil.route) { PerfilScreen(onLogout = onLogout) }
            if (uiState.enabledModules.contains("solicitudes")) {
                composable(
                    route = OperacionesScreen.SolicitudDetail.route,
                    arguments = listOf(navArgument("solicitudId") { type = NavType.StringType }),
                ) {
                    SolicitudDetailScreen(onBack = { navController.popBackStack() })
                }
            }
        }
    }
}

private fun buildOperacionesNavItems(enabledModules: Set<String>): List<OpsNavItem> {
    val items = mutableListOf(
        OpsNavItem(OperacionesScreen.Home, "Inicio", Icons.Filled.Home),
    )

    if (enabledModules.contains("solicitudes")) {
        items += OpsNavItem(
            OperacionesScreen.Solicitudes,
            "Solicitudes",
            Icons.Filled.ReceiptLong,
        )
    }
    if (enabledModules.contains("compras")) {
        items += OpsNavItem(OperacionesScreen.Compras, "Compras", Icons.Filled.ShoppingCart)
    }
    if (enabledModules.contains("catalogo")) {
        items += OpsNavItem(OperacionesScreen.Catalogo, "Catalogo", Icons.Filled.Inventory2)
    }
    if (enabledModules.contains("mapa_clientes")) {
        items += OpsNavItem(OperacionesScreen.Mapa, "Mapa", Icons.Filled.Map)
    }

    items += OpsNavItem(OperacionesScreen.Perfil, "Perfil", Icons.Filled.Person)
    return items
}
