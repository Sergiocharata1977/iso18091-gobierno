package com.doncandido.vendedor.domain.usecase

import com.doncandido.vendedor.domain.repository.IAuthRepository
import javax.inject.Inject

class LogoutUseCase @Inject constructor(
    private val authRepository: IAuthRepository,
) {
    suspend operator fun invoke() = authRepository.logout()
}
