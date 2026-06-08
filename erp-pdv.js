document.addEventListener('DOMContentLoaded', () => {
    const phoneNumber = '5575998808146'; 
    const cards = document.querySelectorAll('.card');

    cards.forEach((card, index) => {
        setTimeout(() => card.classList.add('visible'), index * 240);
    });

    document.querySelectorAll('.contratar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const plan = btn.dataset.plan || btn.closest('.card')?.querySelector('h2 span')?.textContent?.trim() || '';
            const message = `Olá, tenho interesse neste plano (${plan}), gostaria de saber quais as condições para contratar.`;
            const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        });
    });

});
