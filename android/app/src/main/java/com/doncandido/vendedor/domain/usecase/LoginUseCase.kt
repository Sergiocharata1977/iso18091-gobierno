package com.doncandido.vendedor.domain.usecase

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.domain.model.Session
import com.doncandido.vendedor.domain.repository.IAuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: IAuthRepository,
) {
    suspend operator fun invoke(email: String, password: String): Resource<Session> {
        if (email.isBlank()) return Resource.Error("El email es requerido.")
        if (password.isBlank()) return Resource.Error("La contrasena es requerida.")
        return authRepository.login(email.trim(), password)
    }
}
