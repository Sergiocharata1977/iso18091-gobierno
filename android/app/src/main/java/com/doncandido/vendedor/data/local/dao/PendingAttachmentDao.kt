package com.doncandido.vendedor.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.doncandido.vendedor.data.local.entities.PendingAttachmentEntity

@Dao
interface PendingAttachmentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: PendingAttachmentEntity)

    @Query(
        """
        SELECT * FROM pending_attachments
        WHERE organizationId = :orgId AND transferState IN ('pending', 'failed', 'ready', 'uploading')
        ORDER BY createdAt ASC
        """
    )
    suspend fun getOpenItems(orgId: String): List<PendingAttachmentEntity>

    @Query("DELETE FROM pending_attachments WHERE id = :id")
    suspend fun delete(id: String)
}
