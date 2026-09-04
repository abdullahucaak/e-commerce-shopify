import { defineStore } from 'pinia'
import { supabase } from '../services/supabase.js'
import { requestPasswordRecovery } from '../services/passwordRecovery.js'
import { apiUrl } from '../services/apiUrl.js'

export const useAccountStore = defineStore('account', {
  state: () => ({ session: null, user: null, workspace: null, ready: false }),
  getters: { authenticated: state => Boolean(state.session?.access_token) },
  actions: {
    async initialize() {
      if (this.ready) return
      if (!supabase) throw new Error('supabase_not_configured')
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      this.session = data.session
      this.user = data.session?.user || null
      if (this.session) {
        try {
          await this.loadAccount()
        } catch (error) {
          if (error.status !== 401) throw error
          await supabase.auth.signOut({ scope: 'local' })
          this.session = null
          this.user = null
          this.workspace = null
        }
      }
      this.ready = true
    },
    async loadAccount() {
      const response = await fetch(apiUrl('/api/account'), {
        headers: { Authorization: `Bearer ${this.session.access_token}` }
      })
      if (!response.ok) {
        const error = new Error('account_unavailable')
        error.status = response.status
        throw error
      }
      const account = await response.json()
      this.workspace = account.workspaces?.[0] || null
    },
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.session = data.session
      this.user = data.user
      await this.loadAccount()
    },
    async signUp(businessName, email, password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`
        }
      })
      if (error) throw error
      this.session = data.session
      this.user = data.user
      if (data.session) await this.loadAccount()
      return data
    },
    async requestPasswordReset(email) {
      if (!supabase) throw new Error('supabase_not_configured')
      await requestPasswordRecovery(supabase, email)
    },
    async updatePassword(password) {
      if (!supabase) throw new Error('supabase_not_configured')
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      this.user = data.user
      return data
    },
    async signOut() {
      await supabase.auth.signOut()
      this.$reset()
      this.ready = true
    }
  }
})
