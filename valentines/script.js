document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('gallery-container');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    const modalMessage = document.getElementById('modal-message');
    const closeButton = document.querySelector('.close-button');

    const memories = [
        { image: 'img/first1.JPG', message: 'One of the first pictures that we took :D' },
        { image: 'img/first.JPG', message: 'I just wanted you to know that I love you <3' },
        { image: 'img/third.JPG', message: 'I would eat boba out of your huge ass HAHA' },
        { image: 'img/cuatro.JPG', message: 'Same day, giving you a smooch' },
        { image: 'img/second.JPG', message: '<3<3' },
        { image: 'img/IMG_7799.jpg', message: 'My favorite person to be weird with.' },
        { image: 'img/IMG_7619.jpg', message: "You're the only person I'd share my Korean Chicken with. maybe" },
        { image: 'img/IMG_7436.jpg', message: 'Look at you, being all cute and stuff my latina mami Hihihi.' },
        { image: 'img/IMG_7078.jpg', message: "Mimimimimimi" },
        { image: 'img/IMG_2681.jpg', message: "I'm so happy to be with you my love" },
        { image: 'img/IMG_0850.jpg', message: "The most beautiful person I have ever met" },
        { image: 'img/de676cf5-f470-4013-b0f1-baee1e066b41.JPG', message: 'Stole my heart and kidnapped me since our first date' },
        { image: 'img/0f83fbdc-4e5e-44ea-8c53-3395e5da51a7.JPG', message: "Still can't believe I'm this lucky." },
        { image: 'img/5944d50b-abfd-4fd2-b7c0-26d9426b4ae0.JPG', message: "Thank your for the past months my baby <3." },
        { image: 'img/96837d56-d1af-4230-9a67-68dd2059ae44.JPG', message: "Mi amorrrrrrrrrrrrr" },
        { image: 'img/ac58af3f-56c7-45f1-a38e-63f12feaed6f.JPG', message: "You make me smile everyday. And I love how you make me feel so special." },
        { image: 'img/d1a9b094-f28a-42fa-af22-8c8f09c8c72a.JPG', message: "If you were a vegetable, you'd be a cutecumber" },
        { image: 'img/da999285-3535-45d2-9c95-430854d9c898.JPG', message: "You're the reason I'm so happy." },
        { image: 'img/ed9d3f43-f338-4bdc-a745-82143ddcce48.JPG', message: "Relationship status: Currently in love with my favorite person." }
    ];

    const bouncers = [];
    const speed = 1.5;

    function initializeBouncers() {
        const containerWidth = galleryContainer.offsetWidth;
        const containerHeight = galleryContainer.offsetHeight;

        memories.forEach(memory => {
            const card = document.createElement('div');
            card.classList.add('card');
            
            const img = document.createElement('img');
            img.src = memory.image;
            img.alt = memory.message.substring(0, 30);
            
            const cover = document.createElement('div');
            cover.classList.add('cover');
            cover.innerHTML = '<span>Click Me!</span>';
            
            card.appendChild(img);
            card.appendChild(cover);
            galleryContainer.appendChild(card);

            const cardWidth = card.offsetWidth;
            const cardHeight = card.offsetHeight;
            
            let dx = (Math.random() - 0.5) * speed * 2;
            let dy = (Math.random() - 0.5) * speed * 2;
            // Ensure it's not too slow
            if (Math.abs(dx) < 0.5) dx = dx < 0 ? -0.5 : 0.5;
            if (Math.abs(dy) < 0.5) dy = dy < 0 ? -0.5 : 0.5;

            bouncers.push({
                element: card,
                x: Math.random() * (containerWidth - cardWidth),
                y: Math.random() * (containerHeight - cardHeight),
                dx: dx,
                dy: dy,
                rotation: -15 + (Math.random() * 30)
            });

            card.addEventListener('click', () => {
                card.classList.add('opened');
                modalImage.src = memory.image;
                modalMessage.textContent = memory.message;
                modal.style.display = 'block';
            });
        });
    }

    function animate() {
        const containerWidth = galleryContainer.offsetWidth;
        const containerHeight = galleryContainer.offsetHeight;

        bouncers.forEach(bouncer => {
            // Move the bouncer
            bouncer.x += bouncer.dx;
            bouncer.y += bouncer.dy;

            // Wall collision detection
            if (bouncer.x <= 0 || bouncer.x + bouncer.element.offsetWidth >= containerWidth) {
                bouncer.dx *= -1;
            }
            if (bouncer.y <= 0 || bouncer.y + bouncer.element.offsetHeight >= containerHeight) {
                bouncer.dy *= -1;
            }
            
            // Apply the transform
            bouncer.element.style.transform = `translate(${bouncer.x}px, ${bouncer.y}px) rotate(${bouncer.rotation}deg)`;
        });

        requestAnimationFrame(animate);
    }

    // Modal close logic
    const closeModal = () => modal.style.display = 'none';
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Start everything
    initializeBouncers();
    animate();
});

