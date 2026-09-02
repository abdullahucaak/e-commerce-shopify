const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze({
    designWrite: true,
    contentWrite: true,
    domainsWrite: true,
    configRestore: true,
    assetFolders: Object.freeze(['logos', 'hero', 'about'])
  }),
  admin: Object.freeze({
    designWrite: true,
    contentWrite: true,
    domainsWrite: true,
    configRestore: true,
    assetFolders: Object.freeze(['logos', 'hero', 'about'])
  }),
  editor: Object.freeze({
    designWrite: false,
    contentWrite: true,
    domainsWrite: false,
    configRestore: false,
    assetFolders: Object.freeze(['hero', 'about'])
  }),
  viewer: Object.freeze({
    designWrite: false,
    contentWrite: false,
    domainsWrite: false,
    configRestore: false,
    assetFolders: Object.freeze([])
  })
})

const DENIED_PERMISSIONS = Object.freeze({
  designWrite: false,
  contentWrite: false,
  domainsWrite: false,
  configRestore: false,
  assetFolders: Object.freeze([])
})

export function storefrontAdminPermissions(role) {
  const permissions = ROLE_PERMISSIONS[String(role || '')] || DENIED_PERMISSIONS
  return {
    designWrite: permissions.designWrite,
    contentWrite: permissions.contentWrite,
    domainsWrite: permissions.domainsWrite,
    configRestore: permissions.configRestore,
    assetFolders: [...permissions.assetFolders]
  }
}

export function assertStorefrontAdminPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[String(role || '')]
  if (!permissions || permissions[permission] !== true) {
    throw new Error('storefront_write_denied')
  }
}
