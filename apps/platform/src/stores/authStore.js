import { defineStore } from 'pinia'
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase'

let authSubscription = null
let initializationPromise = null

function confirmationRedirectUrl() {
  const url = new URL('/login', window.location.origin)
  url.searchParams.set('confirmed', '1')
  return url.toString()
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    user: null,
    workspace: null,
    membershipRole: null,
    initialized: false,
    loading: false,
    error: ''
  }),

  getters: {
    isAuthenticated: state => Boolean(state.session && state.user),
    isConfigured: () => isSupabaseConfigured
  },

  actions: {
    async initialize() {
      if (this.initialized) return
      if (initializationPromise) return initializationPromise

      initializationPromise = (async () => {
        if (!isSupabaseConfigured) {
          this.initialized = true
          return
        }

        const client = getSupabaseClient()
        const { data, error } = await client.auth.getSession()
        if (error) throw error

        this.session = data.session
        this.user = data.session?.user || null

        if (!authSubscription) {
          const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
            this.session = session
            this.user = session?.user || null

            if (!session) {
              this.workspace = null
              this.membershipRole = null
            }
          })
          authSubscription = listener.subscription
        }

        if (this.user) await this.loadWorkspace()
        this.initialized = true
      })()

      try {
        await initializationPromise
      } finally {
        initializationPromise = null
      }
    },

    async loadWorkspace() {
      if (!this.user || !this.session?.access_token) return

      const platformApiUrl = (import.meta.env.VITE_PLATFORM_API_URL || '')
        .trim()
        .replace(/\/$/, '')
      const endpoint = new URL(`${platformApiUrl}/api/account`, window.location.origin)
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Account request failed (${response.status}).`)
      }

      const account = await response.json()
      const primaryWorkspace = account.workspaces?.[0] || null
      this.workspace = primaryWorkspace
      this.membershipRole = primaryWorkspace?.role || null
    },

    async signIn({ email, password }) {
      this.loading = true
      this.error = ''

      try {
        const client = getSupabaseClient()
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (error) throw error

        this.session = data.session
        this.user = data.user
        await this.loadWorkspace()
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async signUp({ businessName, email, password }) {
      this.loading = true
      this.error = ''

      try {
        const client = getSupabaseClient()
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              business_name: businessName.trim()
            },
            emailRedirectTo: confirmationRedirectUrl()
          }
        })
        if (error) throw error

        this.session = data.session
        this.user = data.user
        if (data.session) await this.loadWorkspace()
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async resendConfirmation(email) {
      this.loading = true
      this.error = ''

      try {
        const client = getSupabaseClient()
        const { error } = await client.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: confirmationRedirectUrl()
          }
        })
        if (error) throw error
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      this.loading = true
      this.error = ''

      try {
        const client = getSupabaseClient()
        const { error } = await client.auth.signOut()
        if (error) throw error

        this.session = null
        this.user = null
        this.workspace = null
        this.membershipRole = null
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
