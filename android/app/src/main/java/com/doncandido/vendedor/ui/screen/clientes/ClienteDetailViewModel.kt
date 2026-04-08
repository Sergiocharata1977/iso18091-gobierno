package com.doncandido.vendedor.ui.screen.clientes

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Cliente
import com.doncandido.vendedor.domain.usecase.AgregarNotaUseCase
import com.doncandido.vendedor.domain.usecase.GetClienteDetailUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClienteDetailUiState(
    val cliente: Cliente? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val notaInput: String = "",
    val isSavingNota: Boolean = false,
    val notaSavedSuccess: Boolean = false,
    val conflictError: Boolean = false,
)

@HiltViewModel
class ClienteDetailViewModel @Inject constructor(
    private val getClienteDetailUseCase: GetClienteDetailUseCase,
    private val agregarNotaUseCase: AgregarNotaUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val clienteId: String = checkNotNull(savedStateHandle["clienteId"])

    private val _uiState = MutableStateFlow(ClienteDetailUiState(isLoading = true))
    val uiState: StateFlow<ClienteDetailUiState> = _uiState.asStateFlow()

    init {
        loadCliente()
    }

    private fun loadCliente() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = getClienteDetailUseCase(clienteId)) {
                is Resource.Success -> _uiState.update {
                    it.copy(cliente = result.data, isLoading = false, error = null)
                }
                is Resource.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun onNotaChange(value: String) {
        _uiState.update { it.copy(notaInput = value) }
    }

    fun onGuardarNota() {
        val state = _uiState.value
        if (state.isSavingNota || state.notaInput.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingNota = true, conflictError = false) }
            when (val result = agregarNotaUseCase(clienteId, state.notaInput, state.cliente?.updatedAt)) {
                is Resource.Success -> _uiState.update {
                    it.copy(
                        cliente = result.data,
                        isSavingNota = false,
                        notaInput = "",
                        notaSavedSuccess = true,
                    )
                }
                is Resource.Error -> {
                    val isConflict = result.message == "conflict"
                    _uiState.update {
                        it.copy(
                            isSavingNota = false,
                            conflictError = isConflict,
                            error = if (isConflict) null else result.message,
                        )
                    }
                    if (isConflict) loadCliente() // refresh stale data
                }
                Resource.Loading -> Unit
            }
        }
    }

    fun onNotaSavedAcknowledged() {
        _uiState.update { it.copy(notaSavedSuccess = false) }
    }

    fun onErrorDismissed() {
        _uiState.update { it.copy(error = null, conflictError = false) }
    }
}
