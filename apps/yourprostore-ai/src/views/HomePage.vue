<template>
  <main class="landing-page">
    <nav class="landing-nav">
      <RouterLink class="landing-brand" to="/">YourProStore</RouterLink>
      <div class="landing-actions">
        <RouterLink class="text-link" to="/login">Giriş yap</RouterLink>
        <RouterLink class="button-link" to="/login?mode=register">Mağazanı kur</RouterLink>
      </div>
    </nav>
    <section class="hero">
      <p class="eyebrow">Shopify mağazanı kolayca hazırla</p>
      <h1>Profesyonel mağazanı adım adım kur.</h1>
      <p class="hero-copy">Shopify mağazanı bağla, sektörünü seç ve markana uygun vitrini kısa sürede yayına hazırla.</p>
      <RouterLink class="button-link hero-button" to="/login?mode=register">Mağazanı kurmaya başla</RouterLink>
      <p class="hero-note">Hesabını kurulum sırasında oluşturacaksın.</p>
    </section>
  </main>
</template>
