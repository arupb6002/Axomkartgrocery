// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    
    // Cart count badge (sync with grocery page if desired)
    updateCartBadge();
    
    // Add click handlers to all product cards
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent if clicking on nested elements
            if(e.target.closest('.product-card')) {
                // Add subtle animation
                card.style.transform = 'scale(0.97)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
                // Navigation handled by onclick attribute
            }
        });
    });
    
    // Sticky header effect on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 20) {
            header.style.padding = '10px 20px';
            header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        } else {
            header.style.padding = '14px 20px';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)';
        }
    });
    
    // Essentials banner click handler
    const essentialsBanner = document.querySelector('.essentials-banner');
    if(essentialsBanner) {
        essentialsBanner.addEventListener('click', () => {
            window.location.href = '/grocery/grocery.html';
        });
    }
    
    // Smooth scroll to top when footer logo clicked
    const footerLogo = document.querySelector('.footer-logo');
    if(footerLogo) {
        footerLogo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Add hover effect to view all buttons
    const viewAllBtns = document.querySelectorAll('.view-all-btn');
    viewAllBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.02)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
    });
    
    // Dynamic scrolling alert - pause on hover
    const alertText = document.querySelector('.alert-text');
    if(alertText) {
        alertText.addEventListener('mouseenter', () => {
            alertText.style.animationPlayState = 'paused';
        });
        alertText.addEventListener('mouseleave', () => {
            alertText.style.animationPlayState = 'running';
        });
    }
});

// Function to update cart badge (optional - reads from localStorage if you implement)
function updateCartBadge() {

    try {

        const savedCart = localStorage.getItem('axomkart_cart');

        if(savedCart) {

            const parsed = JSON.parse(savedCart);

            const THIRTY_MIN = 30 * 60 * 1000;

            if(Date.now() - parsed.savedAt > THIRTY_MIN) {

                localStorage.removeItem("axomkart_cart");

                return;
            }

            const cart = parsed.cart || {};

            let totalItems = 0;

            for(let item in cart) {

                totalItems += cart[item].qty || 0;
            }

            const badge = document.querySelector('.cart-badge');

            if(badge && totalItems > 0) {

                badge.textContent = totalItems;

                badge.style.display = 'inline-block';

            } else if(badge) {

                badge.textContent = '0';
            }
        }

    } catch(e) {

        console.log("Cart sync not active");
    }
}


    

// Optional: Listen for storage changes (if cart updates from grocery page)
window.addEventListener('storage', (e) => {
    if(e.key === 'axomkart_cart') {
        updateCartBadge();
    }
});

// Add some GSAP-like simple animations using Intersection Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Animate category blocks on scroll
document.querySelectorAll('.category-block, .essentials-banner').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// ================= HOME CART POPUP =================

const cartIcon = document.querySelector('.cart-icon');

if(cartIcon){

    cartIcon.addEventListener('click', (e) => {

        e.preventDefault();

        openHomeCartPopup();
    });
}

function openHomeCartPopup() {

    const savedCart = localStorage.getItem('axomkart_cart');

    if(!savedCart){

        window.location.href='/grocery/grocery.html';

        return;
    }

    const parsed = JSON.parse(savedCart);

    const cart = parsed.cart || {};

    const popup = document.getElementById('home-cart-popup');

    const list = document.getElementById('popup-cart-list');

    const totalPrice = document.getElementById('popup-total-price');

    let html = '';

    let total = 0;

    let items = 0;

    for(let item in cart){

        const qty = cart[item].qty;

        const price = cart[item].price * qty;

        total += price;

        items += qty;

        html += `
            <div class="popup-cart-item">

                <div>
                    <strong>${item}</strong><br>
                    <small>Qty: ${qty}</small>
                </div>

                <div style="display:flex;align-items:center;gap:10px;">

                    <span>₹${price}</span>

                    <button
                        class="popup-remove"
                        onclick="removeHomeCartItem('${item}')"
                    >
                        ×
                    </button>

                </div>

            </div>
        `;
    }

    if(items <= 0){

        window.location.href='/grocery/grocery.html';

        return;
    }

    list.innerHTML = html;

    totalPrice.innerText = total;

    popup.style.display = 'flex';
}

function removeHomeCartItem(name){

    const savedCart = localStorage.getItem('axomkart_cart');

    if(!savedCart) return;

    const parsed = JSON.parse(savedCart);

    const cart = parsed.cart || {};

    delete cart[name];

    localStorage.setItem('axomkart_cart', JSON.stringify({
        cart: cart,
        savedAt: Date.now()
    }));

    updateCartBadge();

    openHomeCartPopup();
}

document.getElementById('close-home-cart')?.addEventListener('click', () => {

    document.getElementById('home-cart-popup').style.display = 'none';
});

document.getElementById('home-cart-popup')?.addEventListener('click', (e) => {

    if(e.target.id === 'home-cart-popup'){

        e.target.style.display = 'none';
    }
});
const navBtns=document.querySelectorAll('.nav-btn'),
navInd=document.querySelector('.nav-indicator');

navBtns.forEach((btn,i)=>{

btn.addEventListener('click',()=>{

document.querySelector('.nav-btn.active')
?.classList.remove('active');

btn.classList.add('active');

navInd.style.left=`${i*33.33}%`;

});
});

let lastScroll=0;

window.addEventListener('scroll',()=>{

const nav=document.querySelector('.btm-nav'),
curr=window.pageYOffset;

if(curr>lastScroll && curr>80){

nav.style.transform='translateY(90px)';

}else{

nav.style.transform='translateY(0)';
}

lastScroll=curr;
});