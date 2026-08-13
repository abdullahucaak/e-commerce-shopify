import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STOREFRONT_CONTENT,
  normalizeContentSettings
} from './content-config.mjs'

test('accepts the default storefront content within layout limits', () => {
  assert.deepEqual(
    normalizeContentSettings(DEFAULT_STOREFRONT_CONTENT),
    DEFAULT_STOREFRONT_CONTENT
  )
})

test('rejects content that can overflow constrained storefront areas', () => {
  assert.throws(
    () => normalizeContentSettings({
      ...DEFAULT_STOREFRONT_CONTENT,
      home: { ...DEFAULT_STOREFRONT_CONTENT.home, heroTitle: 'x'.repeat(33) }
    }),
    /invalid_content_settings/
  )
})

test('allows at most three valid footer email addresses', () => {
  assert.throws(
    () => normalizeContentSettings({
      ...DEFAULT_STOREFRONT_CONTENT,
      footer: {
        ...DEFAULT_STOREFRONT_CONTENT.footer,
        emails: ['one@example.com', 'two@example.com', 'three@example.com', 'four@example.com']
      }
    }),
    /invalid_content_settings/
  )
})

test('only accepts matching Facebook and Instagram profile hosts', () => {
  assert.throws(
    () => normalizeContentSettings({
      ...DEFAULT_STOREFRONT_CONTENT,
      footer: {
        ...DEFAULT_STOREFRONT_CONTENT.footer,
        social: {
          facebookUrl: 'https://example.com/fake-facebook',
          instagramUrl: ''
        }
      }
    }),
    /invalid_content_settings/
  )
})
