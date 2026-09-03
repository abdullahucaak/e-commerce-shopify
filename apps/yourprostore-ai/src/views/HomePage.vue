<template>
  <main class="landing-page">
    <nav class="landing-nav">
      <RouterLink class="landing-brand" to="/">YourProStore</RouterLink>
      <div class="landing-actions">
        <RouterLink class="text-link" to="/login">Log in</RouterLink>
        <RouterLink class="button-link" to="/login?mode=register">Build your store</RouterLink>
      </div>
    </nav>
    <section class="hero">
      <p class="eyebrow">Set up your Shopify store with ease</p>
      <h1>Build your professional storefront step by step.</h1>
      <p class="hero-copy">Connect your Shopify store, choose your industry, and prepare a storefront that fits your brand.</p>
      <RouterLink class="button-link hero-button" to="/login?mode=register">Start building your store</RouterLink>
      <p class="hero-note">You will create your account during setup.</p>
    </section>
  </main>
</template>
