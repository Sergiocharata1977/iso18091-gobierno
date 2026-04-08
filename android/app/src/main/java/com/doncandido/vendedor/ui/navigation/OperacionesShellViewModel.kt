package com.doncandido.vendedor.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.session.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OperacionesShellUiState(
    val organizationName: String = "Operaciones",
    val enabledModules: Set<String> = emptySet(),
)

@HiltViewModel
class OperacionesShellViewModel @Inject constructor(
    private val sessionManager: SessionManager,
) : ViewModel() {
    private val _uiState = MutableStateFlow(OperacionesShellUiState())
    val uiState: StateFlow<OperacionesShellUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                sessionManager.organizationName,
                sessionManager.enabledModules,
            ) { organizationName, enabledModules ->
                OperacionesShellUiState(
                    organizationName = organizationName ?: "Operaciones",
                    enabledModules = enabledModules.toSet(),
                )
            }.collect { state ->
                _uiState.update { state }
            }
        }
    }
}
