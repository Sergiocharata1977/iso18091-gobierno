package com.doncandido.vendedor.data.remote.dto

import com.google.gson.annotations.SerializedName

data class MobileListResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<T>,
    @SerializedName("meta") val meta: MobileMeta,
)

data class MobileSingleResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T,
    @SerializedName("meta") val meta: MobileMeta,
)

data class MobileMeta(
    @SerializedName("api_version") val apiVersion: String?,
    @SerializedName("generated_at") val generatedAt: String?,
    @SerializedName("organization_id") val organizationId: String?,
    @SerializedName("item_count") val itemCount: Int?,
    @SerializedName("limit") val limit: Int?,
    @SerializedName("next_cursor") val nextCursor: String?,
    @SerializedName("has_more") val hasMore: Boolean?,
    @SerializedName("cursor_applied") val cursorApplied: String?,
    @SerializedName("updated_after") val updatedAfter: String?,
)

data class MobileModuleDto(
    @SerializedName("key") val key: String,
    @SerializedName("enabled") val enabled: Boolean,
)
