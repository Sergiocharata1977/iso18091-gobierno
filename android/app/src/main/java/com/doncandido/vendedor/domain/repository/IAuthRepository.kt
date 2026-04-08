package com.doncandido.vendedor.domain.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Session
import kotlinx.coroutines.flow.Flow

interface IAuthRepository {
    val isLoggedIn: Flow<Boolean>
    suspend fun login(email: String, password: String): Resource<Session>
    suspend fun logout()
    suspend fun refreshToken(): Resource<String>
}
