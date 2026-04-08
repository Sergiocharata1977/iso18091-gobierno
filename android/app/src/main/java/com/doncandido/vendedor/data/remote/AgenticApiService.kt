package com.doncandido.vendedor.data.remote

import com.doncandido.vendedor.data.remote.dto.AgenticSummaryDto
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.http.GET
import javax.inject.Singleton

interface AgenticApiService {
    @GET("api/agentic-center/summary")
    suspend fun getSummary(): AgenticSummaryDto
}

@Module
@InstallIn(SingletonComponent::class)
object AgenticApiModule {

    @Provides
    @Singleton
    fun provideAgenticApiService(retrofit: Retrofit): AgenticApiService =
        retrofit.create(AgenticApiService::class.java)
}
