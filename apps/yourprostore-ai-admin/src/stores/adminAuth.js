import { defineStore } from 'pinia'
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase.js'
import { fetchAdminSession, resolveAdminAuthStep } from '../services/adminSession.js'
import { requestAdminPasswordRecovery } from '../services/passwordRecovery.js'

let initializationPromise = null

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    session: null,
    user: null,
    admin: null,
    assurance: null,
    factors: [],
    enrollment: null,
    initialized: false,
    loading: false,
    error: ''
  }),
  getters: {
    authenticated: state => Boolean(state.session?.access_token),
    authorized: state => Boolean(state.admin),
    requiresMfa: state => Boolean(state.session) && state.assurance?.currentLevel !== 'aal2',
    configured: () => isSupabaseConfigured
  },
  actions: {
    async initialize() {
      if (this.initialized) return
      if (initializationPromise) return initializationPromise
      initializationPromise = (async () => {
        if (!isSupabaseConfigured) { this.initialized = true; return }
        const client = getSupabaseClient()
        const { data, error } = await client.auth.getSession()
        if (error) throw error
        this.session = data.session
        this.user = data.session?.user || null
        if (this.session) await this.refreshAssurance()
        if (resolveAdminAuthStep(this) === 'authorize') await this.loadAdminSession()
        this.initialized = true
      })()
      try { await initializationPromise } finally { initializationPromise = null }
    },
    async signIn(email, password) {
      this.loading = true
      this.error = ''
      try {
        const client = getSupabaseClient()
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        this.session = data.session
        this.user = data.user
        await this.refreshAssurance()
        if (!this.requiresMfa) await this.loadAdminSession()
      } catch (error) {
        this.error = error.message
        throw error
      } finally { this.loading = false }
    },
    async requestPasswordReset(email) {
      if (!isSupabaseConfigured) throw new Error('supabase_not_configured')
      return requestAdminPasswordRecovery(getSupabaseClient(), email)
    },
    async updateRecoveredPassword(password) {
      if (!isSupabaseConfigured) throw new Error('supabase_not_configured')
      const client = getSupabaseClient()
      const { error } = await client.auth.updateUser({ password })
      if (error) throw error
      await client.auth.signOut()
      this.$reset()
      this.initialized = true
    },
    async refreshAssurance() {
      const client = getSupabaseClient()
      const [{ data: assurance, error: assuranceError }, { data: factorData, error: factorError }] = await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors()
      ])
      if (assuranceError) throw assuranceError
      if (factorError) throw factorError
      this.assurance = assurance
      this.factors = factorData?.totp?.filter(factor => factor.status === 'verified') || []
    },
    async enrollTotp() {
      const { data, error } = await getSupabaseClient().auth.mfa.enroll({
        factorType: 'totp', friendlyName: 'YourProStore Platform Admin'
      })
      if (error) throw error
      this.enrollment = data
      return data
    },
    async verifyTotp(code) {
      const factorId = this.enrollment?.id || this.factors[0]?.id
      if (!factorId || !/^\d{6}$/.test(String(code))) throw new Error('invalid_mfa_code')
      const client = getSupabaseClient()
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: String(code) })
      if (error) throw error
      const { data: sessionData, error: sessionError } = await client.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) throw new Error('admin_session_unavailable')
      this.session = sessionData.session
      this.user = sessionData.session.user
      this.enrollment = null
      await this.refreshAssurance()
      await this.loadAdminSession()
    },
    async loadAdminSession() {
      this.admin = await fetchAdminSession({
        apiUrl: import.meta.env.VITE_API_URL || '',
        accessToken: this.session.access_token
      })
    },
    async signOut() {
      await getSupabaseClient().auth.signOut()
      this.$reset()
      this.initialized = true
    }
  }
})
