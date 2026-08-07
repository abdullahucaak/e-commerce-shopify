<template>
    <nav class="dashboard-nav">
        <div class="logo">
            <div class="logo-container">
                <div class="orbit">
                    <div class="circle c1"></div>
                    <div class="circle c2"></div>
                    <div class="circle c3"></div>
                    <div class="circle c4"></div>
                </div>
                <BrandLogo class="logo" />
            </div>
        </div>
        <div class="nav-links">
            <RouterLink to="/cms/dashboard" class="nav-link" active-class="active">
                <i class="fas fa-home"></i> Ana Sayfa
            </RouterLink>
            <RouterLink to="/cms/products" class="nav-link" active-class="active">
                <i class="fas fa-box"></i> Ürünler
            </RouterLink>
            <RouterLink to="/cms/completed-orders" class="nav-link" active-class="active">
                <i class="fas fa-shopping-cart"></i> Siparişler
            </RouterLink>
            <button @click="handleLogout" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i> Çıkış Yap
            </button>
        </div>
    </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'

const router = useRouter()

const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    router.push('/cms/login')
}
</script>

<style scoped>
.logo-container {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto;
}

.orbit {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 140px;
    height: 140px;
    border-radius: 50%;
    animation: orbit 8s linear infinite;
    margin-top: 30px;
}

.circle {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
}

.c1 { top: 0; left: 50%; transform: translateX(-50%); }
.c2 { right: 0; top: 50%; transform: translateY(-50%); }
.c3 { bottom: 0; left: 50%; transform: translateX(-50%); }
.c4 { left: 0; top: 50%; transform: translateY(-50%); }

@keyframes orbit {
    from {
        transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}

span.logo {
    position: relative;
    border-radius: 50%;
    animation: logoFloat 3s ease-in-out infinite;
    transition: transform 0.3s ease;
    margin-top: 50px;
    z-index: 1;
}

span.logo:hover {
    transform: scale(1.1) rotate(5deg);
}

@keyframes logoFloat {
    0% {
        transform: translateY(0px);
        box-shadow: 0 5px 15px 0px rgba(0,0,0,0.2);
    }
    50% {
        transform: translateY(-10px);
        box-shadow: 0 15px 25px 0px rgba(0,0,0,0.1);
    }
    100% {
        transform: translateY(0px);
        box-shadow: 0 5px 15px 0px rgba(0,0,0,0.2);
    }
}

.dashboard-nav {
    background-color: var(--color-brand-secondary);
    color: white;
    padding: 2rem;
}

.logo {
    text-align: center;
    margin-bottom: 2rem;
}

.logo .brand-logo {
    width: 120px;
}

.nav-links {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 75px;
}

.nav-link {
    color: white;
    text-decoration: none;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.nav-link:hover, .nav-link.active {
    background-color: rgba(255, 255, 255, 0.1);
}

.nav-link i {
    margin-right: 0.5rem;
}

.logout-btn {
    margin-top: auto;
    background: none;
    border: none;
    color: white;
    padding: 0.75rem 1rem;
    cursor: pointer;
    text-align: left;
    font-size: var(--font-size-body);
}

.logout-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
    .dashboard-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 0.75rem;
        z-index: 100;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        background-color: var(--color-brand-secondary);
    }
    
    .logo {
        display: none;
    }
    
    .nav-links {
        flex-direction: row;
        justify-content: space-around;
        margin: 0;
        gap: 0.5rem;
    }
    
    .nav-link {
        padding: 0.5rem;
        font-size: var(--font-size-body-sm);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        border-radius: 8px;
    }
    
    .nav-link i {
        margin: 0;
        font-size: var(--font-size-heading-sm);
    }
    
    .nav-link span {
        font-size: var(--font-size-xs);
    }

    .logout-btn {
        margin: 0;
        padding: 0.5rem;
        font-size: var(--font-size-body-sm);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        border-radius: 8px;
    }

    .logout-btn i {
        margin: 0;
        font-size: var(--font-size-heading-sm);
    }
}

@media (max-width: 480px) {
    .nav-link span, .logout-btn span {
        display: none;
    }

    .nav-link i, .logout-btn i {
        font-size: 1.4rem;
    }

    .nav-link, .logout-btn {
        padding: 0.75rem;
    }
}
</style>
