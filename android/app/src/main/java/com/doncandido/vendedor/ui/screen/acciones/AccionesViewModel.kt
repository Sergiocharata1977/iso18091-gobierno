package com.doncandido.vendedor.ui.screen.acciones

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.usecase.CrearAccionUseCase
import com.doncandido.vendedor.domain.usecase.GetAccionesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AccionesUiState(
    val acciones: List<Accion> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isOffline: Boolean = false,
    val error: String? = null,
    val filtroEstado: String? = null,  // null = todos
    val showCrearDialog: Boolean = false,
    val isCreando: Boolean = false,
    val creadaSuccess: Boolean = false,
)

@HiltViewModel
class AccionesViewModel @Inject constructor(
    private val getAccionesUseCase: GetAccionesUseCase,
    private val crearAccionUseCase: CrearAccionUseCase,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccionesUiState(isLoading = true))
    val uiState: StateFlow<AccionesUiState> = _uiState.asStateFlow()

    init {
        loadAcciones()
    }

    private fun loadAcciones() {
        viewModelScope.launch {
            getAccionesUseCase(estado = _uiState.value.filtroEstado)
                .collectLatest { result ->
                    when (result) {
                        is Resource.Success -> _uiState.update {
                            it.copy(
                                acciones = result.data,
                                isLoading = false,
                                isRefreshing = false,
                                isOffline = false,
                                error = null,
                            )
                        }
                        is Resource.Error -> _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                isOffline = result.message?.contains("offline", ignoreCase = true) == true,
                                error = result.message,
                            )
                        }
                        Resource.Loading -> _uiState.update {
                            it.copy(isLoading = it.acciones.isEmpty())
                        }
                    }
                }
        }
    }

    fun onRefresh() {
        _uiState.update { it.copy(isRefreshing = true) }
        loadAcciones()
    }

    fun onFiltroEstado(estado: String?) {
        _uiState.update { it.copy(filtroEstado = estado, isLoading = true) }
        loadAcciones()
    }

    fun onToggleCrearDialog() {
        _uiState.update { it.copy(showCrearDialog = !it.showCrearDialog) }
    }

    fun onCrearAccion(
        tipo: String,
        canal: String,
        titulo: String,
        descripcion: String?,
        clienteId: String?,
        clienteNombre: String?,
        fechaProgramada: String?,
    ) {
        viewModelScope.launch {
            val userId = sessionManager.userId.firstOrNull() ?: return@launch
            _uiState.update { it.copy(isCreando = true) }
            val result = crearAccionUseCase(
                tipo = tipo,
                canal = canal,
                titulo = titulo,
                descripcion = descripcion,
                clienteId = clienteId,
                clienteNombre = clienteNombre,
                oportunidadId = null,
                oportunidadTitulo = null,
                vendedorId = userId,
                vendedorNombre = null,
                fechaProgramada = fechaProgramada,
            )
            when (result) {
                is Resource.Success -> _uiState.update {
                    it.copy(
                        isCreando = false,
                        showCrearDialog = false,
                        creadaSuccess = true,
                        acciones = listOf(result.data) + it.acciones,
                    )
                }
                is Resource.Error -> _uiState.update {
                    it.copy(isCreando = false, error = result.message)
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun onCreadaSuccessAcknowledged() {
        _uiState.update { it.copy(creadaSuccess = false) }
    }

    fun onErrorDismissed() {
        _uiState.update { it.copy(error = null) }
    }
}
