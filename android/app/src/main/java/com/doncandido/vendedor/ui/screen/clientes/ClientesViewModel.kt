package com.doncandido.vendedor.ui.screen.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.usecase.GetClientesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClientesUiState(
    val clientes: List<Cliente> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val query: String = "",
    val filtroResponsableId: String? = null,
    val isOffline: Boolean = false,
)

@OptIn(FlowPreview::class)
@HiltViewModel
class ClientesViewModel @Inject constructor(
    private val getClientesUseCase: GetClientesUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientesUiState())
    val uiState: StateFlow<ClientesUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")

    init {
        observeClientes()
    }

    private fun observeClientes() {
        viewModelScope.launch {
            _searchQuery
                .debounce(300)
                .distinctUntilChanged()
                .collectLatest { query ->
                    getClientesUseCase(
                        query = query.ifBlank { null },
                        responsableId = _uiState.value.filtroResponsableId,
                    ).collect { resource ->
                        when (resource) {
                            is Resource.Loading -> _uiState.update {
                                it.copy(isLoading = it.clientes.isEmpty())
                            }
                            is Resource.Success -> _uiState.update {
                                it.copy(
                                    clientes = resource.data,
                                    isLoading = false,
                                    isRefreshing = false,
                                    error = null,
                                )
                            }
                            is Resource.Error -> _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    isRefreshing = false,
                                    error = if (it.clientes.isEmpty()) resource.message else null,
                                    isOffline = resource.message.contains("net", ignoreCase = true) ||
                                        resource.message.contains("connect", ignoreCase = true),
                                )
                            }
                        }
                    }
                }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        _searchQuery.value = query
    }

    fun onRefresh() {
        _uiState.update { it.copy(isRefreshing = true) }
        _searchQuery.value = _uiState.value.query
    }

    fun onErrorDismissed() {
        _uiState.update { it.copy(error = null) }
    }
}
