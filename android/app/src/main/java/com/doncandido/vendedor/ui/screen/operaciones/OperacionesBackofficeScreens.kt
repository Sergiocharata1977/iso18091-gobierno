package com.doncandido.vendedor.ui.screen.operaciones

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.CatalogoProductoOperacion
import com.doncandido.vendedor.domain.model.ClienteMapaOperacion
import com.doncandido.vendedor.domain.model.CompraOperacion
import com.doncandido.vendedor.domain.usecase.GetCatalogoOperacionesUseCase
import com.doncandido.vendedor.domain.usecase.GetComprasOperacionesUseCase
import com.doncandido.vendedor.domain.usecase.GetMapaClientesOperacionesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ComprasUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val compras: List<CompraOperacion> = emptyList(),
)

@HiltViewModel
class ComprasViewModel @Inject constructor(
    private val getComprasUseCase: GetComprasOperacionesUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ComprasUiState())
    val uiState: StateFlow<ComprasUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            getComprasUseCase().collectLatest { result ->
                when (result) {
                    is Resource.Success -> _uiState.update {
                        it.copy(isLoading = false, compras = result.data, error = null)
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                    Resource.Loading -> Unit
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComprasScreen(viewModel: ComprasViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    SimpleListScreen(
        title = "Compras",
        isLoading = uiState.isLoading,
        error = uiState.error,
        items = uiState.compras,
    ) { compra ->
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Compra #${compra.numero ?: 0} · ${compra.tipo}")
                Text("${compra.area} · ${compra.estado}")
                Text("${compra.solicitanteNombre} · ${compra.proveedorNombre ?: "Sin proveedor"}")
            }
        }
    }
}

data class CatalogoUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val productos: List<CatalogoProductoOperacion> = emptyList(),
)

@HiltViewModel
class CatalogoViewModel @Inject constructor(
    private val getCatalogoUseCase: GetCatalogoOperacionesUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CatalogoUiState())
    val uiState: StateFlow<CatalogoUiState> = _uiState.asStateFlow()

    fun load(query: String? = null) {
        viewModelScope.launch {
            getCatalogoUseCase(query = query).collectLatest { result ->
                when (result) {
                    is Resource.Success -> _uiState.update {
                        it.copy(isLoading = false, productos = result.data, error = null)
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                    Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                }
            }
        }
    }

    init {
        load()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CatalogoScreen(viewModel: CatalogoViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var query by remember { mutableStateOf("") }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Catalogo") }) },
    ) { padding ->
        if (uiState.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator() }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        viewModel.load(it)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Buscar producto") },
                )
            }
            uiState.error?.let { item { ErrorCard(it) } }
            items(uiState.productos) { producto ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(producto.nombre)
                        Text("${producto.marca ?: "-"} · ${producto.categoria ?: "-"}")
                        Text("Stock: ${producto.stock ?: 0.0} · Activo: ${if (producto.activo) "si" else "no"}")
                    }
                }
            }
        }
    }
}

data class MapaUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val clientes: List<ClienteMapaOperacion> = emptyList(),
)

@HiltViewModel
class MapaClientesViewModel @Inject constructor(
    private val getMapaUseCase: GetMapaClientesOperacionesUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MapaUiState())
    val uiState: StateFlow<MapaUiState> = _uiState.asStateFlow()

    fun load(query: String? = null) {
        viewModelScope.launch {
            getMapaUseCase(query).collectLatest { result ->
                when (result) {
                    is Resource.Success -> _uiState.update {
                        it.copy(isLoading = false, clientes = result.data, error = null)
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                    Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                }
            }
        }
    }

    init {
        load()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapaClientesScreen(viewModel: MapaClientesViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var query by remember { mutableStateOf("") }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Mapa clientes") }) },
    ) { padding ->
        if (uiState.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator() }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        viewModel.load(it)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Buscar cliente o localidad") },
                )
            }
            uiState.error?.let { item { ErrorCard(it) } }
            items(uiState.clientes) { cliente ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(cliente.razonSocial)
                        Text("${cliente.localidad ?: "-"} · ${cliente.provincia ?: "-"}")
                        Text("Coords: ${cliente.lat ?: 0.0}, ${cliente.lng ?: 0.0}")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> SimpleListScreen(
    title: String,
    isLoading: Boolean,
    error: String?,
    items: List<T>,
    row: @Composable (T) -> Unit,
) {
    Scaffold(
        topBar = { TopAppBar(title = { Text(title) }) },
    ) { padding ->
        if (isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator() }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            error?.let { item { ErrorCard(it) } }
            items(items) { row(it) }
        }
    }
}
