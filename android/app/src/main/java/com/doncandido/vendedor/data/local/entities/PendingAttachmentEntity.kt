package com.doncandido.vendedor.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_attachments")
data class PendingAttachmentEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val ownerEntityType: String,
    val ownerLocalId: String? = null,
    val ownerRemoteId: String? = null,
    val fileName: String,
    val mimeType: String,
    val localUri: String,
    val fileSizeBytes: Long,
    val checksumSha256: String? = null,
    val captureSource: String,
    val transferState: String = "pending",
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)
