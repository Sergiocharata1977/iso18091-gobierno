package com.doncandido.vendedor.core.session

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.doncandido.vendedor.BuildConfig
import com.doncandido.vendedor.data.remote.dto.OperacionesBootstrapDto
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = "${BuildConfig.APPLICATION_ID}_${BuildConfig.APP_VARIANT}_session"
)

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private val KEY_FIREBASE_TOKEN = stringPreferencesKey("firebase_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        private val KEY_ORG_ID = stringPreferencesKey("org_id")
        private val KEY_USER_ROLE = stringPreferencesKey("user_role")
        private val KEY_ORG_NAME = stringPreferencesKey("org_name")
        private val KEY_OPERATIONAL_PROFILE = stringPreferencesKey("operational_profile")
        private val KEY_OPERATIONAL_PROFILE_LABEL = stringPreferencesKey("operational_profile_label")
        private val KEY_ENABLED_MODULES = stringPreferencesKey("enabled_modules")
        private val KEY_EFFECTIVE_ROLES = stringPreferencesKey("effective_roles")
        private val KEY_CAN_CONVERT_TO_CRM = stringPreferencesKey("can_convert_to_crm")
        private val KEY_CAN_MANAGE_ASSIGNMENTS = stringPreferencesKey("can_manage_assignments")
        private val KEY_CAN_MANAGE_PURCHASES = stringPreferencesKey("can_manage_purchases")
        private val KEY_FLAG_SOLICITUDES = stringPreferencesKey("flag_solicitudes")
        private val KEY_FLAG_EVIDENCIAS = stringPreferencesKey("flag_evidencias")
        private val KEY_FLAG_COMPRAS = stringPreferencesKey("flag_compras")
        private val KEY_FLAG_CATALOGO = stringPreferencesKey("flag_catalogo")
        private val KEY_FLAG_MAPA = stringPreferencesKey("flag_mapa")
        private val KEY_FLAG_CRM_HANDOFF = stringPreferencesKey("flag_crm_handoff")
        private val KEY_FLAG_OFFLINE_SYNC = stringPreferencesKey("flag_offline_sync")
        private val KEY_CRM_INTEGRATION_ACTIVE = stringPreferencesKey("crm_integration_active")
    }

    val firebaseToken: Flow<String?> = context.dataStore.data.map { it[KEY_FIREBASE_TOKEN] }
    val userId: Flow<String?> = context.dataStore.data.map { it[KEY_USER_ID] }
    val userEmail: Flow<String?> = context.dataStore.data.map { it[KEY_USER_EMAIL] }
    val orgId: Flow<String?> = context.dataStore.data.map { it[KEY_ORG_ID] }
    val userRole: Flow<String?> = context.dataStore.data.map { it[KEY_USER_ROLE] }
    val organizationName: Flow<String?> = context.dataStore.data.map { it[KEY_ORG_NAME] }
    val operationalProfile: Flow<String?> =
        context.dataStore.data.map { it[KEY_OPERATIONAL_PROFILE] }
    val operationalProfileLabel: Flow<String?> =
        context.dataStore.data.map { it[KEY_OPERATIONAL_PROFILE_LABEL] }
    val enabledModules: Flow<List<String>> = context.dataStore.data.map {
        decodeList(it[KEY_ENABLED_MODULES])
    }
    val effectiveRoles: Flow<List<String>> = context.dataStore.data.map {
        decodeList(it[KEY_EFFECTIVE_ROLES])
    }
    val canConvertToCrm: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_CAN_CONVERT_TO_CRM]?.toBooleanStrictOrNull() == true
    }
    val canManageAssignments: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_CAN_MANAGE_ASSIGNMENTS]?.toBooleanStrictOrNull() == true
    }
    val canManagePurchases: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_CAN_MANAGE_PURCHASES]?.toBooleanStrictOrNull() == true
    }
    val featureSolicitudes: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_SOLICITUDES]?.toBooleanStrictOrNull() == true
    }
    val featureEvidencias: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_EVIDENCIAS]?.toBooleanStrictOrNull() == true
    }
    val featureCompras: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_COMPRAS]?.toBooleanStrictOrNull() == true
    }
    val featureCatalogo: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_CATALOGO]?.toBooleanStrictOrNull() == true
    }
    val featureMapa: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_MAPA]?.toBooleanStrictOrNull() == true
    }
    val featureCrmHandoff: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_CRM_HANDOFF]?.toBooleanStrictOrNull() == true
    }
    val featureOfflineSync: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FLAG_OFFLINE_SYNC]?.toBooleanStrictOrNull() == true
    }
    val crmIntegrationActive: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_CRM_INTEGRATION_ACTIVE]?.toBooleanStrictOrNull() == true
    }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map {
        it[KEY_FIREBASE_TOKEN]?.isNotBlank() == true && it[KEY_USER_ID]?.isNotBlank() == true
    }

    suspend fun saveSession(
        token: String,
        userId: String,
        email: String,
        orgId: String,
        role: String,
        bootstrap: OperacionesBootstrapDto? = null,
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_FIREBASE_TOKEN] = token
            prefs[KEY_USER_ID] = userId
            prefs[KEY_USER_EMAIL] = email
            prefs[KEY_ORG_ID] = orgId
            prefs[KEY_USER_ROLE] = role
            applyBootstrap(prefs, bootstrap)
        }
    }

    suspend fun updateToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_FIREBASE_TOKEN] = token
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun getToken(): String? = firebaseToken.firstOrNull()

    private fun applyBootstrap(
        prefs: androidx.datastore.preferences.core.MutablePreferences,
        bootstrap: OperacionesBootstrapDto?,
    ) {
        if (bootstrap == null) return

        prefs[KEY_ORG_NAME] = bootstrap.organization.name
        prefs[KEY_OPERATIONAL_PROFILE] = bootstrap.operationalProfile.key
        prefs[KEY_OPERATIONAL_PROFILE_LABEL] = bootstrap.operationalProfile.label
        prefs[KEY_ENABLED_MODULES] = encodeList(
            bootstrap.modules.filter { it.enabled }.map { it.key }
        )
        prefs[KEY_EFFECTIVE_ROLES] = encodeList(bootstrap.roles.effectiveRoles)
        prefs[KEY_CAN_CONVERT_TO_CRM] =
            bootstrap.operationalProfile.canConvertToCrm.toString()
        prefs[KEY_CAN_MANAGE_ASSIGNMENTS] =
            bootstrap.operationalProfile.canManageAssignments.toString()
        prefs[KEY_CAN_MANAGE_PURCHASES] =
            bootstrap.operationalProfile.canManagePurchases.toString()
        prefs[KEY_FLAG_SOLICITUDES] = bootstrap.featureFlags.solicitudes.toString()
        prefs[KEY_FLAG_EVIDENCIAS] = bootstrap.featureFlags.evidencias.toString()
        prefs[KEY_FLAG_COMPRAS] = bootstrap.featureFlags.compras.toString()
        prefs[KEY_FLAG_CATALOGO] = bootstrap.featureFlags.catalogo.toString()
        prefs[KEY_FLAG_MAPA] = bootstrap.featureFlags.mapaClientes.toString()
        prefs[KEY_FLAG_CRM_HANDOFF] = bootstrap.featureFlags.crmHandoff.toString()
        prefs[KEY_FLAG_OFFLINE_SYNC] = bootstrap.featureFlags.offlineSync.toString()
        prefs[KEY_CRM_INTEGRATION_ACTIVE] = bootstrap.integrations.crm.active.toString()
    }

    private fun encodeList(values: List<String>): String =
        values.map { it.trim() }.filter { it.isNotEmpty() }.distinct().joinToString("|")

    private fun decodeList(value: String?): List<String> =
        value
            ?.split("|")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?.distinct()
            ?: emptyList()
}
