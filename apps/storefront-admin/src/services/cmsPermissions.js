const ROLE_FALLBACK = Object.freeze({
  owner: Object.freeze({ designWrite: true, contentWrite: true, domainsWrite: true, configRestore: true }),
  admin: Object.freeze({ designWrite: true, contentWrite: true, domainsWrite: true, configRestore: true }),
  editor: Object.freeze({ designWrite: false, contentWrite: true, domainsWrite: false, configRestore: false }),
  viewer: Object.freeze({ designWrite: false, contentWrite: false, domainsWrite: false, configRestore: false })
})

const DENIED = Object.freeze({ designWrite: false, contentWrite: false, domainsWrite: false, configRestore: false })

export function resolveStorefrontAdminPermissions(workspace) {
  const fromApi = workspace?.storefrontAdminPermissions
  if (
    typeof fromApi?.designWrite === 'boolean' &&
    typeof fromApi?.contentWrite === 'boolean' &&
    typeof fromApi?.domainsWrite === 'boolean' &&
    typeof fromApi?.configRestore === 'boolean'
  ) {
    return {
      designWrite: fromApi.designWrite,
      contentWrite: fromApi.contentWrite,
      domainsWrite: fromApi.domainsWrite,
      configRestore: fromApi.configRestore
    }
  }

  return { ...(ROLE_FALLBACK[String(workspace?.role || '')] || DENIED) }
}
