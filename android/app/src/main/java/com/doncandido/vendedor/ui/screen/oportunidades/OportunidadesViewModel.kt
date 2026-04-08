package com.doncandido.vendedor.ui.screen.oportunidades

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Oportunidad
import com.doncandido.vendedor.domain.usecase.GetOportunidadesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OportunidadesUiState(
    val oportunidades: List<Oportunidad> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val filtroEstadoId: String? = null,
    val filtroResponsableId: String? = null,
    val isOffline: Boolean = false,
)

@HiltViewModel
class OportunidadesViewModel @Inject constructor(
    private val getOportunidadesUseCase: GetOportunidadesUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OportunidadesUiState())
    val uiState: StateFlow<OportunidadesUiState> = _uiState.asStateFlow()

    init { loadOportunidades() }

    private fun loadOportunidades() {
        viewModelScope.launch {
            val state = _uiState.value
            getOportunidadesUseCase(
                estadoId = state.filtroEstadoId,
                responsableId = state.filtroResponsableId,
            ).collectLatest { resource ->
                when (resource) {
                    is Resource.Loading -> _uiState.update {
                        it.copy(isLoading = it.oportunidades.isEmpty())
                    }
                    is Resource.Success -> _uiState.update {
                        it.copy(
                            oportunidades = resource.data,
                            isLoading = false,
                            isRefreshing = false,
                            error = null,
                        )
                    }
                    is Resource.Error -> _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            error = if (it.oportunidades.isEmpty()) resource.message else null,
                            isOffline = true,
                        )
                    }
                }
            }
        }
    }

    fun onFiltroEstado(estadoId: String?) {
        _uiState.update { it.copy(filtroEstadoId = estadoId) }
        loadOportunidades()
    }

    fun onRefresh() {
        _uiState.update { it.copy(isRefreshing = true) }
        loadOportunidades()
    }

    fun onErrorDismissed() {
        _uiState.update { it.copy(error = null) }
    }
}
