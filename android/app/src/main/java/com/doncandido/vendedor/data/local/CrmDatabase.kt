package com.doncandido.vendedor.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.doncandido.vendedor.BuildConfig
import com.doncandido.vendedor.data.local.dao.AccionDao
import com.doncandido.vendedor.data.local.dao.CatalogoProductoDao
import com.doncandido.vendedor.data.local.dao.ClienteDao
import com.doncandido.vendedor.data.local.dao.CompraOperacionDao
import com.doncandido.vendedor.data.local.dao.MapaClienteDao
import com.doncandido.vendedor.data.local.dao.OportunidadDao
import com.doncandido.vendedor.data.local.dao.SolicitudEvidenciaDao
import com.doncandido.vendedor.data.local.dao.SolicitudOperacionDao
import com.doncandido.vendedor.data.local.dao.PendingAttachmentDao
import com.doncandido.vendedor.data.local.dao.SyncQueueDao
import com.doncandido.vendedor.data.local.entities.AccionEntity
import com.doncandido.vendedor.data.local.entities.CatalogoProductoEntity
import com.doncandido.vendedor.data.local.entities.ClienteEntity
import com.doncandido.vendedor.data.local.entities.CompraOperacionEntity
import com.doncandido.vendedor.data.local.entities.MapaClienteEntity
import com.doncandido.vendedor.data.local.entities.OportunidadEntity
import com.doncandido.vendedor.data.local.entities.SolicitudEvidenciaEntity
import com.doncandido.vendedor.data.local.entities.SolicitudOperacionEntity
import com.doncandido.vendedor.data.local.entities.PendingAttachmentEntity
import com.doncandido.vendedor.data.local.entities.SyncQueueEntity
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Database(
    entities = [
        ClienteEntity::class,
        OportunidadEntity::class,
        AccionEntity::class,
        SyncQueueEntity::class,
        SolicitudOperacionEntity::class,
        SolicitudEvidenciaEntity::class,
        CompraOperacionEntity::class,
        CatalogoProductoEntity::class,
        MapaClienteEntity::class,
        PendingAttachmentEntity::class,
    ],
    version = 4,
    exportSchema = false,
)
abstract class CrmDatabase : RoomDatabase() {
    abstract fun clienteDao(): ClienteDao
    abstract fun oportunidadDao(): OportunidadDao
    abstract fun accionDao(): AccionDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun solicitudOperacionDao(): SolicitudOperacionDao
    abstract fun solicitudEvidenciaDao(): SolicitudEvidenciaDao
    abstract fun compraOperacionDao(): CompraOperacionDao
    abstract fun catalogoProductoDao(): CatalogoProductoDao
    abstract fun mapaClienteDao(): MapaClienteDao
    abstract fun pendingAttachmentDao(): PendingAttachmentDao
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): CrmDatabase =
        Room.databaseBuilder(
            context,
            CrmDatabase::class.java,
            "${BuildConfig.APP_VARIANT}_native.db"
        )
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideClienteDao(db: CrmDatabase): ClienteDao = db.clienteDao()

    @Provides
    fun provideOportunidadDao(db: CrmDatabase): OportunidadDao = db.oportunidadDao()

    @Provides
    fun provideAccionDao(db: CrmDatabase): AccionDao = db.accionDao()

    @Provides
    fun provideSyncQueueDao(db: CrmDatabase): SyncQueueDao = db.syncQueueDao()

    @Provides
    fun provideSolicitudOperacionDao(db: CrmDatabase): SolicitudOperacionDao =
        db.solicitudOperacionDao()

    @Provides
    fun provideSolicitudEvidenciaDao(db: CrmDatabase): SolicitudEvidenciaDao =
        db.solicitudEvidenciaDao()

    @Provides
    fun provideCompraOperacionDao(db: CrmDatabase): CompraOperacionDao =
        db.compraOperacionDao()

    @Provides
    fun provideCatalogoProductoDao(db: CrmDatabase): CatalogoProductoDao =
        db.catalogoProductoDao()

    @Provides
    fun provideMapaClienteDao(db: CrmDatabase): MapaClienteDao = db.mapaClienteDao()

    @Provides
    fun providePendingAttachmentDao(db: CrmDatabase): PendingAttachmentDao =
        db.pendingAttachmentDao()
}
