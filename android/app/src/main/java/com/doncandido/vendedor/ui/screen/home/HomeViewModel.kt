package com.doncandido.vendedor.ui.screen.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.data.remote.AgenticApiService
import com.doncandido.vendedor.domain.model.Accion
import com.doncandido.vendedor.domain.model.Oportunidad
import com.doncandido.vendedor.domain.usecase.GetAccionesUseCase
import com.doncandido.vendedor.domain.usecase.GetOportunidadesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val email: String = "",
    val accionesPendientes: List<Accion> = emptyList(),
    val oportunidadesAbiertas: List<Oportunidad> = emptyList(),
    val isLoading: Boolean = true,
    val syncPending: Int = 0,
    val agenticAlerts: Int = 0,      // pending_approvals_count + executive_alerts_count
    val agenticBloqueados: Int = 0,  // blocked_sagas_count + failed_jobs_count
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    private val getAccionesUseCase: GetAccionesUseCase,
    private val getOportunidadesUseCase: GetOportunidadesUseCase,
    private val syncQueueDao: SyncQueueDao,
    private val agenticApiService: AgenticApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val email = sessionManager.userEmail.firstOrNull() ?: ""
            _uiState.update { it.copy(email = email) }
        }
        loadPendientes()
        loadOportunidadesAbiertas()
        observeSyncQueue()
        loadAgenticSummary()
    }

    private fun loadPendientes() {
        viewModelScope.launch {
            getAccionesUseCase(estado = "pendiente")
                .collectLatest { result ->
                    when (result) {
                        is Resource.Success -> _uiState.update {
                            it.copy(accionesPendientes = result.data.take(5), isLoading = false)
                        }
                        is Resource.Error -> _uiState.update { it.copy(isLoading = false) }
                        Resource.Loading -> Unit
                    }
                }
        }
    }

    private fun loadOportunidadesAbiertas() {
        viewModelScope.launch {
            getOportunidadesUseCase()
                .collectLatest { result ->
                    if (result is Resource.Success) {
                        val abiertas = result.data
                            .filter { op -> op.estadoId !in listOf("ganada", "perdida") }
                            .take(5)
                        _uiState.update { it.copy(oportunidadesAbiertas = abiertas) }
                    }
                }
        }
    }

    private fun observeSyncQueue() {
        viewModelScope.launch {
            val orgId = sessionManager.orgId.firstOrNull() ?: return@launch
            syncQueueDao.observePendingCount(orgId).collectLatest { count ->
                _uiState.update { it.copy(syncPending = count) }
            }
        }
    }

    private fun loadAgenticSummary() {
        viewModelScope.launch {
            try {
                val summary = agenticApiService.getSummary()
                _uiState.update {
                    it.copy(
                        agenticAlerts = summary.pendingApprovalsCount + summary.executiveAlertsCount,
                        agenticBloqueados = summary.blockedSagasCount + summary.failedJobsCount,
                    )
                }
            } catch (_: Exception) {
                // graceful degradation: endpoint unavailable → keep defaults (0)
            }
        }
    }
}
