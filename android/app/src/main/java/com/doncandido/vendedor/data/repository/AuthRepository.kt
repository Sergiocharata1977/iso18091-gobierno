package com.doncandido.vendedor.data.repository

import com.doncandido.vendedor.core.common.Resource
import com.doncandido.vendedor.core.session.SessionManager
import com.doncandido.vendedor.data.remote.OperacionesApiService
import com.doncandido.vendedor.domain.model.Session
import com.doncandido.vendedor.domain.repository.IAuthRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val sessionManager: SessionManager,
    private val operacionesApiService: OperacionesApiService,
) : IAuthRepository {

    override val isLoggedIn: Flow<Boolean> = sessionManager.isLoggedIn

    override suspend fun login(email: String, password: String): Resource<Session> {
        return try {
            val result = firebaseAuth.signInWithEmailAndPassword(email, password).await()
            val user = result.user ?: return Resource.Error("No se pudo iniciar sesion.")
            val token = user.getIdToken(false).await().token
                ?: return Resource.Error("No se pudo obtener el token de autenticacion.")

            // Parse custom claims for orgId and role
            val claims = user.getIdToken(false).await().claims
            val orgId = claims["organization_id"] as? String ?: ""
            val role = claims["rol"] as? String ?: "operario"

            // Persist the token before bootstrap so the authenticated mobile
            // namespace can be called through the shared interceptor.
            sessionManager.saveSession(
                token = token,
                userId = user.uid,
                email = user.email ?: email,
                orgId = orgId,
                role = role,
            )

            val bootstrap = operacionesApiService.getBootstrap(
                organizationId = orgId.takeIf { it.isNotBlank() }
            ).data

            sessionManager.saveSession(
                token = token,
                userId = user.uid,
                email = user.email ?: email,
                orgId = orgId,
                role = role,
                bootstrap = bootstrap,
            )

            Resource.Success(
                Session(
                    userId = user.uid,
                    email = user.email ?: email,
                    orgId = orgId,
                    role = role,
                    firebaseToken = token,
                    organizationName = bootstrap.organization.name,
                    operationalProfile = bootstrap.operationalProfile.key,
                    enabledModules = bootstrap.modules.filter { it.enabled }.map { it.key },
                )
            )
        } catch (e: Exception) {
            sessionManager.clearSession()
            val message = when {
                e.message?.contains("INVALID_LOGIN_CREDENTIALS") == true ||
                e.message?.contains("wrong-password") == true ||
                e.message?.contains("user-not-found") == true ->
                    "Email o contrasena incorrectos."
                e.message?.contains("403") == true ||
                e.message?.contains("forbidden") == true ->
                    "La organizacion no tiene acceso al namespace operativo."
                e.message?.contains("too-many-requests") == true ->
                    "Demasiados intentos. Intenta mas tarde."
                e.message?.contains("network") == true ||
                e.message?.contains("timeout") == true ->
                    "Sin conexion. Verifica tu red."
                else -> "No se pudo iniciar sesion. Intenta de nuevo."
            }
            Resource.Error(message)
        }
    }

    override suspend fun logout() {
        firebaseAuth.signOut()
        sessionManager.clearSession()
    }

    override suspend fun refreshToken(): Resource<String> {
        return try {
            val user = firebaseAuth.currentUser
                ?: return Resource.Error("Sin sesion activa.")
            val token = user.getIdToken(true).await().token
                ?: return Resource.Error("No se pudo renovar el token.")
            sessionManager.updateToken(token)
            Resource.Success(token)
        } catch (e: Exception) {
            Resource.Error("No se pudo renovar la sesion.")
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthRepositoryModule {

    @Binds
    abstract fun bindAuthRepository(impl: AuthRepository): IAuthRepository
}

@Module
@InstallIn(SingletonComponent::class)
object FirebaseAuthModule {

    @dagger.Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()
}
