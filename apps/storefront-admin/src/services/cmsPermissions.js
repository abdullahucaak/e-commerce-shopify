const ROLE_FALLBACK = Object.freeze({
  owner: Object.freeze({ designWrite: true, contentWrite: true, domainsWrite: true }),
  admin: Object.freeze({ designWrite: true, contentWrite: true, domainsWrite: true }),
  editor: Object.freeze({ designWrite: false, contentWrite: true, domainsWrite: false }),
  viewer: Object.freeze({ designWrite: false, contentWrite: false, domainsWrite: false })
})

const DENIED = Object.freeze({ designWrite: false, contentWrite: false, domainsWrite: false })

export function resolveStorefrontAdminPermissions(workspace) {
  const fromApi = workspace?.storefrontAdminPermissions
  if (
    typeof fromApi?.designWrite === 'boolean' &&
    typeof fromApi?.contentWrite === 'boolean' &&
    typeof fromApi?.domainsWrite === 'boolean'
  ) {
    return {
      designWrite: fromApi.designWrite,
      contentWrite: fromApi.contentWrite,
      domainsWrite: fromApi.domainsWrite
    }
  }

  return { ...(ROLE_FALLBACK[String(workspace?.role || '')] || DENIED) }
}
