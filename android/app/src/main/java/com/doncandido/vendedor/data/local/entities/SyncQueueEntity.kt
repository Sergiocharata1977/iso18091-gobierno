package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val action: String,
    val entityType: String,
    val entityId: String?,
    val payload: String,
    val clientRequestId: String,
    val organizationId: String,
    val operation: String = action,
    val entityLocalId: String? = null,
    val entityRemoteId: String? = entityId,
    val payloadJson: String? = null,
    val requiresNetworkType: String = "connected",
    val dependsOnQueueId: Long? = null,
    val status: String = "pending",
    val attempts: Int = 0,
    val maxAttempts: Int = 7,
    val nextAttemptAt: Long = System.currentTimeMillis(),
    val lastHttpStatus: Int? = null,
    val lastError: String? = null,
    val versionTokenSent: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)
