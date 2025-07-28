let cart = [];

function addToCart(event) {
    const button = event.target;
    const card = button.closest('.item-card');

    const item = {
        id: card.getAttribute('data-id'),
        name: card.getAttribute('data-name'),
        price: parseFloat(card.getAttribute('data-price')),
        image: card.getAttribute('data-image'),
        quantity: 1
    };

    const existingItem = cart.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(item);
    }

    updateCart();
    M.toast({ html: `${item.name} added to cart!`, classes: 'rounded' });
}

function updateCart() {
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Update cart count in navbar if element exists
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    // Update cart modal if it exists
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty</p>';
            return;
        }

        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h6>${item.name}</h6>
          <p class="cart-item-price">$${item.price.toFixed(2)}</p>
          <div class="cart-quantity">
            <a class="decrease-quantity" data-id="${item.id}"><i class="material-icons tiny">remove</i></a>
            <input type="text" value="${item.quantity}" disabled>
            <a class="increase-quantity" data-id="${item.id}"><i class="material-icons tiny">add</i></a>
            <a class="remove-item right" data-id="${item.id}"><i class="material-icons tiny">delete</i></a>
          </div>
        </div>
      `;
            cartItemsContainer.appendChild(cartItemElement);
        });

        // Add event listeners to new elements
        document.querySelectorAll('.decrease-quantity').forEach(btn => {
            btn.addEventListener('click', decreaseQuantity);
        });
        document.querySelectorAll('.increase-quantity').forEach(btn => {
            btn.addEventListener('click', increaseQuantity);
        });
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', removeItem);
        });

        // Update total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cart-total').textContent = total.toFixed(2);
    }
}

// Quantity control functions
function decreaseQuantity(event) {
    const id = event.target.closest('a').getAttribute('data-id');
    const item = cart.find(item => item.id === id);

    if (item.quantity > 1) {
        item.quantity -= 1;
        updateCart();
    }
}

function increaseQuantity(event) {
    const id = event.target.closest('a').getAttribute('data-id');
    const item = cart.find(item => item.id === id);

    item.quantity += 1;
    updateCart();
}

function removeItem(event) {
    const id = event.target.closest('a').getAttribute('data-id');
    cart = cart.filter(item => item.id !== id);
    updateCart();
    if (cart.length === 0) {
        document.getElementById('cart-total').textContent = "0.00";
    }
}

// Initialize cart from localStorage when page loads
document.addEventListener('DOMContentLoaded', function () {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCart();
    }

    // Initialize modal if it exists
    if (document.querySelector('.modal')) {
        M.Modal.init(document.querySelectorAll('.modal'));
    }

    // Add event listeners to all "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', addToCart);
    });

    // Checkout button if it exists
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function () {
            if (cart.length === 0) {
                M.toast({ html: 'Your cart is empty!', classes: 'rounded' });
                return;
            }
            M.toast({ html: 'Proceeding to checkout!', classes: 'rounded' });
        });
    }
});