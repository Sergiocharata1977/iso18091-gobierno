package com.doncandido.vendedor.core.fcm

import android.util.Log
import com.doncandido.vendedor.core.sync.OperacionesSyncScheduler
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class OperationsFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var operacionesSyncScheduler: OperacionesSyncScheduler

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Nuevo token FCM recibido.")
        operacionesSyncScheduler.requestImmediateSync("fcm_token_refresh")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val channel = message.data["channel"]
        val action = message.data["action"]
        if (channel == "operaciones" || action == "sync_operaciones") {
            operacionesSyncScheduler.requestImmediateSync("push_operaciones")
        }
    }

    companion object {
        private const val TAG = "OperationsFCM"
    }
}
