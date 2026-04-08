package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.doncandido.vendedor.data.local.entities.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Insert
    suspend fun enqueue(item: SyncQueueEntity): Long

    @Query(
        """
        SELECT * FROM sync_queue
        WHERE organizationId = :orgId
          AND status IN ('pending', 'retry_wait')
          AND (nextAttemptAt IS NULL OR nextAttemptAt <= :now)
          AND dependsOnQueueId IS NULL
        ORDER BY createdAt ASC
        """
    )
    suspend fun getPending(orgId: String, now: Long): List<SyncQueueEntity>

    @Query(
        """
        SELECT COUNT(*) FROM sync_queue
        WHERE organizationId = :orgId
          AND status IN ('pending', 'retry_wait', 'failed', 'conflict', 'blocked')
        """
    )
    fun observePendingCount(orgId: String): Flow<Int>

    @Query(
        """
        UPDATE sync_queue
        SET status = 'processing', lastError = null, updatedAt = :updatedAt
        WHERE localId = :localId
        """
    )
    suspend fun markProcessing(localId: Long, updatedAt: Long)

    @Query(
        """
        UPDATE sync_queue
        SET status = :status,
            attempts = attempts + 1,
            lastError = :error,
            nextAttemptAt = :nextAttemptAt,
            lastHttpStatus = :httpStatus,
            updatedAt = :updatedAt
        WHERE localId = :localId
        """
    )
    suspend fun markAttemptResult(
        localId: Long,
        status: String,
        error: String? = null,
        nextAttemptAt: Long?,
        httpStatus: Int?,
        updatedAt: Long,
    )

    @Query("DELETE FROM sync_queue WHERE localId = :localId")
    suspend fun delete(localId: Long)

    @Query("DELETE FROM sync_queue WHERE organizationId = :orgId AND status = 'pending' AND clientRequestId = :clientRequestId")
    suspend fun deleteByRequestId(orgId: String, clientRequestId: String)
}
