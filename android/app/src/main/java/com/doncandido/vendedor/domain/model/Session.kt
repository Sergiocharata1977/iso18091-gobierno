package com.doncandido.vendedor.domain.model

data class Session(
    val userId: String,
    val email: String,
    val orgId: String,
    val role: String,
    val firebaseToken: String,
    val organizationName: String? = null,
    val operationalProfile: String? = null,
    val enabledModules: List<String> = emptyList(),
)
