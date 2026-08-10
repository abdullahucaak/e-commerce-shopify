document.documentElement.classList.remove('no-js')
document.documentElement.classList.add('js')

const menuButton = document.querySelector('[data-menu-toggle]')
const mobileNavigation = document.getElementById('MobileNavigation')

menuButton?.addEventListener('click', () => {
  const willOpen = menuButton.getAttribute('aria-expanded') !== 'true'
  menuButton.setAttribute('aria-expanded', String(willOpen))
  mobileNavigation.hidden = !willOpen
  document.body.classList.toggle('menu-open', willOpen)
})

document.querySelectorAll('[data-sort-by]').forEach(select => {
  select.addEventListener('change', event => {
    const url = new URL(window.location.href)
    url.searchParams.set('sort_by', event.currentTarget.value)
    window.location.assign(url.toString())
  })
})

document.querySelectorAll('[data-product-section]').forEach(section => {
  const select = section.querySelector('[data-variant-select]')
  const price = section.querySelector('[data-product-price]')

  select?.addEventListener('change', event => {
    const option = event.currentTarget.selectedOptions[0]

    if (!option || !price) return

    const currentPrice = price.querySelector('span') || document.createElement('span')
    let comparePrice = price.querySelector('s')
    currentPrice.textContent = option.dataset.price

    if (!currentPrice.parentNode) price.append(currentPrice)

    if (option.dataset.comparePrice) {
      comparePrice ||= document.createElement('s')
      comparePrice.textContent = option.dataset.comparePrice
      if (!comparePrice.parentNode) price.append(comparePrice)
    } else {
      comparePrice?.remove()
    }

    const url = new URL(window.location.href)
    url.searchParams.set('variant', option.value)
    window.history.replaceState({}, '', url)
  })
})

document.querySelectorAll('[data-product-gallery]').forEach(gallery => {
  const mediaItems = gallery.querySelectorAll('[data-product-media]')
  const thumbnailButtons = gallery.querySelectorAll('[data-media-target]')

  const showMedia = targetId => {
    mediaItems.forEach(media => {
      const isActive = media.dataset.productMedia === targetId
      media.hidden = !isActive
      media.classList.toggle('is-active', isActive)
    })

    thumbnailButtons.forEach(button => {
      const isActive = button.dataset.mediaTarget === targetId
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  thumbnailButtons.forEach(button => {
    const selectMedia = () => showMedia(button.dataset.mediaTarget)
    button.addEventListener('click', selectMedia)
    button.addEventListener('mouseenter', selectMedia)
  })
})
