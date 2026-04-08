package com.doncandido.vendedor.ui.screen.oportunidades

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.KanbanEstado
import com.doncandido.vendedor.domain.model.Oportunidad
import com.doncandido.vendedor.domain.usecase.CambiarEtapaUseCase
import com.doncandido.vendedor.domain.usecase.GetOportunidadDetailUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OportunidadDetailUiState(
    val oportunidad: Oportunidad? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isCambiandoEtapa: Boolean = false,
    val etapaCambiadaSuccess: Boolean = false,
    val conflictError: Boolean = false,
    val showEtapaSelector: Boolean = false,
)

@HiltViewModel
class OportunidadDetailViewModel @Inject constructor(
    private val getOportunidadDetailUseCase: GetOportunidadDetailUseCase,
    private val cambiarEtapaUseCase: CambiarEtapaUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val oportunidadId: String = checkNotNull(savedStateHandle["oportunidadId"])

    private val _uiState = MutableStateFlow(OportunidadDetailUiState(isLoading = true))
    val uiState: StateFlow<OportunidadDetailUiState> = _uiState.asStateFlow()

    init { loadOportunidad() }

    private fun loadOportunidad() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = getOportunidadDetailUseCase(oportunidadId)) {
                is Resource.Success -> _uiState.update {
                    it.copy(oportunidad = result.data, isLoading = false, error = null)
                }
                is Resource.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun onCambiarEtapa(estado: KanbanEstado) {
        val current = _uiState.value.oportunidad ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isCambiandoEtapa = true, showEtapaSelector = false, conflictError = false) }
            when (val result = cambiarEtapaUseCase(
                oportunidadId = oportunidadId,
                nuevoEstadoId = estado.id,
                nuevoEstadoNombre = estado.nombre,
                nuevoEstadoColor = estado.color,
                updatedAt = current.updatedAt,
            )) {
                is Resource.Success -> _uiState.update {
                    it.copy(
                        oportunidad = result.data.copy(historialEstados = current.historialEstados),
                        isCambiandoEtapa = false,
                        etapaCambiadaSuccess = true,
                    )
                }
                is Resource.Error -> {
                    val isConflict = result.message == "conflict"
                    _uiState.update {
                        it.copy(
                            isCambiandoEtapa = false,
                            conflictError = isConflict,
                            error = if (isConflict) null else result.message,
                        )
                    }
                    if (isConflict) loadOportunidad()
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun onToggleEtapaSelector() {
        _uiState.update { it.copy(showEtapaSelector = !it.showEtapaSelector) }
    }

    fun onEtapaCambiadaAcknowledged() {
        _uiState.update { it.copy(etapaCambiadaSuccess = false) }
    }

    fun onErrorDismissed() {
        _uiState.update { it.copy(error = null, conflictError = false) }
    }
}
