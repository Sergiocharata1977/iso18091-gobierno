package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class AgenticSummaryDto(
    @SerializedName("pending_approvals_count") val pendingApprovalsCount: Int = 0,
    @SerializedName("blocked_sagas_count") val blockedSagasCount: Int = 0,
    @SerializedName("failed_jobs_count") val failedJobsCount: Int = 0,
    @SerializedName("executive_alerts_count") val executiveAlertsCount: Int = 0,
)
