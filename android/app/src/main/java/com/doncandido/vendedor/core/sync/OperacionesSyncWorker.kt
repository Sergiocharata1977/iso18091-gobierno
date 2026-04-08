package com.doncandido.vendedor.core.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.WorkerParameters
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.data.local.entities.SyncQueueEntity
import com.doncandido.vendedor.data.remote.OperacionesApiService
import com.doncandido.vendedor.data.remote.dto.PatchSolicitudOperacionRequest
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.firstOrNull

@HiltWorker
class OperacionesSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val sessionManager: SessionManager,
    private val syncQueueDao: SyncQueueDao,
    private val operacionesApiService: OperacionesApiService,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val orgId = sessionManager.orgId.firstOrNull().orEmpty()
        if (orgId.isBlank()) return Result.success()

        val now = System.currentTimeMillis()
        val pendingItems = syncQueueDao.getPending(orgId, now)
        if (pendingItems.isEmpty()) return Result.success()

        var shouldRetry = false
        pendingItems.forEach { item ->
            val processedAt = System.currentTimeMillis()
            try {
                syncQueueDao.markProcessing(item.localId, processedAt)
                process(item)
                syncQueueDao.delete(item.localId)
            } catch (e: Exception) {
                val attemptsAfter = item.attempts + 1
                val isFinal = attemptsAfter >= MAX_RETRIES
                val nextStatus = if (isFinal) "failed" else "retry_wait"
                val backoffMs = minOf(BACKOFF_BASE_MS * (1L shl attemptsAfter), BACKOFF_MAX_MS)
                syncQueueDao.markAttemptResult(
                    localId = item.localId,
                    status = nextStatus,
                    error = e.message?.take(MAX_ERROR_LENGTH) ?: "sync_error",
                    nextAttemptAt = if (isFinal) null else processedAt + backoffMs,
                    httpStatus = null,
                    updatedAt = processedAt,
                )
                if (!isFinal) shouldRetry = true
            }
        }

        return if (shouldRetry) Result.retry() else Result.success()
    }

    private suspend fun process(item: SyncQueueEntity) {
        when (item.action) {
            ACTION_UPDATE_SOLICITUD -> {
                val solicitudId = item.entityId ?: error("Solicitud sin entityId.")
                val payload = parsePayload(item.payload)
                operacionesApiService.patchSolicitud(
                    id = solicitudId,
                    body = PatchSolicitudOperacionRequest(
                        estado = payload["estado"].blankAsNull(),
                        estadoOperativo = payload["estado_operativo"].blankAsNull(),
                        prioridad = payload["prioridad"].blankAsNull(),
                        ifUnmodifiedSince = payload["updated_at"].blankAsNull(),
                        clientRequestId = item.clientRequestId,
                        offlineAction = "sync_worker",
                        auditNote = payload["audit_note"].blankAsNull(),
                    ),
                )
            }

            else -> error("Accion de sync no soportada: ${item.action}")
        }
    }

    private fun parsePayload(payload: String): Map<String, String> =
        payload
            .split("|")
            .mapNotNull { entry ->
                val separatorIndex = entry.indexOf("=")
                if (separatorIndex <= 0) {
                    null
                } else {
                    val key = entry.substring(0, separatorIndex)
                    val value = entry.substring(separatorIndex + 1)
                    key to value
                }
            }
            .toMap()

    private fun String?.blankAsNull(): String? = this?.takeIf { it.isNotBlank() }

    companion object {
        private const val ACTION_UPDATE_SOLICITUD = "actualizar_solicitud_operacion"
        private const val MAX_RETRIES = 7
        private const val MAX_ERROR_LENGTH = 250
        private const val KEY_TRIGGER_REASON = "trigger_reason"
        private const val BACKOFF_BASE_MS = 30_000L   // 30 s
        private const val BACKOFF_MAX_MS = 3_600_000L // 1 h

        fun inputData(reason: String): Data =
            Data.Builder()
                .putString(KEY_TRIGGER_REASON, reason)
                .build()
    }
}
