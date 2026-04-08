package com.doncandido.vendedor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.doncandido.vendedor.BuildConfig
import com.doncandido.vendedor.ui.navigation.CrmNativeApp
import com.doncandido.vendedor.ui.navigation.GovNativeApp
import com.doncandido.vendedor.ui.navigation.OperacionesNativeApp
import com.doncandido.vendedor.ui.theme.CrmNativeTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CrmNativeTheme {
                when (BuildConfig.APP_VARIANT) {
                    "government" -> GovNativeApp()
                    "operaciones" -> OperacionesNativeApp()
                    else -> CrmNativeApp()
                }
            }
        }
    }
}
