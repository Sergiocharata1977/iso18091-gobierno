package com.doncandido.vendedor.ui.screen.perfil

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.domain.usecase.LogoutUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PerfilUiState(
    val email: String = "",
    val rol: String = "",
    val perfilOperativo: String = "",
    val orgId: String? = null,
    val orgName: String? = null,
    val isLoggingOut: Boolean = false,
)

@HiltViewModel
class PerfilViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    private val logoutUseCase: LogoutUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PerfilUiState())
    val uiState: StateFlow<PerfilUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                sessionManager.userEmail,
                sessionManager.userRole,
                sessionManager.orgId,
                sessionManager.organizationName,
                sessionManager.operationalProfileLabel,
            ) { userEmail, userRole, orgId, orgName, operationalProfileLabel ->
                PerfilUiState(
                    email = userEmail ?: "",
                    rol = userRole ?: "",
                    perfilOperativo = operationalProfileLabel ?: "",
                    orgId = orgId,
                    orgName = orgName,
                )
            }.collect { state ->
                _uiState.update { state }
            }
        }
    }

    fun onLogout(onDone: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingOut = true) }
            logoutUseCase()
            onDone()
        }
    }
}
