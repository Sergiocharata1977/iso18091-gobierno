package com.doncandido.vendedor.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.TrendingUp
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
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.doncandido.vendedor.ui.screen.acciones.AccionesListScreen
import com.doncandido.vendedor.ui.screen.clientes.ClienteDetailScreen
import com.doncandido.vendedor.ui.screen.clientes.ClientesListScreen
import com.doncandido.vendedor.ui.screen.home.HomeScreen
import com.doncandido.vendedor.ui.screen.login.LoginScreen
import com.doncandido.vendedor.ui.screen.oportunidades.OportunidadDetailScreen
import com.doncandido.vendedor.ui.screen.oportunidades.OportunidadesListScreen
import com.doncandido.vendedor.ui.screen.perfil.PerfilScreen

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Main : Screen("main")

    // Bottom nav tabs
    data object Home : Screen("home")
    data object Clientes : Screen("clientes")
    data object Oportunidades : Screen("oportunidades")
    data object Acciones : Screen("acciones")
    data object Perfil : Screen("perfil")

    // Detail screens
    data object ClienteDetail : Screen("clientes/{clienteId}") {
        fun createRoute(id: String) = "clientes/$id"
    }
    data object OportunidadDetail : Screen("oportunidades/{oportunidadId}") {
        fun createRoute(id: String) = "oportunidades/$id"
    }
}

private data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val icon: ImageVector,
)

private val BOTTOM_NAV_ITEMS = listOf(
    BottomNavItem(Screen.Home, "Inicio", Icons.Filled.Home),
    BottomNavItem(Screen.Clientes, "Clientes", Icons.Filled.People),
    BottomNavItem(Screen.Oportunidades, "Pipeline", Icons.Filled.TrendingUp),
    BottomNavItem(Screen.Acciones, "Acciones", Icons.Filled.EventNote),
    BottomNavItem(Screen.Perfil, "Perfil", Icons.Filled.Person),
)

@Composable
fun CrmNativeApp() {
    val rootNav = rememberNavController()

    NavHost(
        navController = rootNav,
        startDestination = Screen.Login.route,
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    rootNav.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
            )
        }

        composable(Screen.Main.route) {
            MainScaffold(
                onLogout = {
                    rootNav.navigate(Screen.Login.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                },
            )
        }
    }
}

@Composable
private fun MainScaffold(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Show bottom bar only on top-level tabs
    val topLevelRoutes = BOTTOM_NAV_ITEMS.map { it.screen.route }.toSet()
    val showBottomBar = currentDestination?.route in topLevelRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    BOTTOM_NAV_ITEMS.forEach { item ->
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
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Screen.Home.route) {
                HomeScreen()
            }

            composable(Screen.Clientes.route) {
                ClientesListScreen(
                    onClienteClick = { id ->
                        navController.navigate(Screen.ClienteDetail.createRoute(id))
                    },
                )
            }

            composable(
                route = Screen.ClienteDetail.route,
                arguments = listOf(navArgument("clienteId") { type = NavType.StringType }),
            ) {
                ClienteDetailScreen(
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Screen.Oportunidades.route) {
                OportunidadesListScreen(
                    onOportunidadClick = { id ->
                        navController.navigate(Screen.OportunidadDetail.createRoute(id))
                    },
                )
            }

            composable(
                route = Screen.OportunidadDetail.route,
                arguments = listOf(navArgument("oportunidadId") { type = NavType.StringType }),
            ) {
                OportunidadDetailScreen(
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Screen.Acciones.route) {
                AccionesListScreen()
            }

            composable(Screen.Perfil.route) {
                PerfilScreen(onLogout = onLogout)
            }
        }
    }
}
