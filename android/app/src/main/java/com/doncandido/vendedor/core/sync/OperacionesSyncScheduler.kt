package com.doncandido.vendedor.core.sync

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OperacionesSyncScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val workManager: WorkManager
        get() = WorkManager.getInstance(context)

    fun schedulePeriodicSync() {
        val request = PeriodicWorkRequestBuilder<OperacionesSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(syncConstraints())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    fun requestImmediateSync(reason: String) {
        val request = OneTimeWorkRequestBuilder<OperacionesSyncWorker>()
            .setConstraints(syncConstraints())
            .setInputData(OperacionesSyncWorker.inputData(reason))
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniqueWork(
            IMMEDIATE_SYNC_WORK_NAME,
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request,
        )
    }

    private fun syncConstraints(): Constraints =
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

    companion object {
        const val PERIODIC_SYNC_WORK_NAME = "operaciones_periodic_sync"
        const val IMMEDIATE_SYNC_WORK_NAME = "operaciones_immediate_sync"
    }
}
