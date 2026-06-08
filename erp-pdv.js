document.addEventListener('DOMContentLoaded', () => {
    const phoneNumber = '5575998808146'; 

    const cards = document.querySelectorAll('.card');

    cards.forEach((card, index) => {
        setTimeout(() => card.classList.add('visible'), index * 240);
    });
    // modal elements
    const modal = document.getElementById('modal-contratar');
    const modalPlanName = document.getElementById('modal-plan-name');
    const modalPlanInput = document.getElementById('modal-plan');
    const form = document.getElementById('form-contratar');
    const btnClose = modal.querySelector('.modal-close');

    function openModal(plan){
        modalPlanName.textContent = plan;
        modalPlanInput.value = plan;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden','false');
        document.getElementById('cnpj').focus();
    }

    function closeModal(){
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden','true');
    }

    document.querySelectorAll('.contratar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const plan = btn.dataset.plan || btn.closest('.card')?.querySelector('h2 span')?.textContent?.trim() || '';
            openModal(plan);
        });
    });

    btnClose.addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const cnpj = document.getElementById('cnpj').value.trim();
        const email = document.getElementById('email').value.trim();
        const segmento = document.getElementById('segmento').value.trim();
        const cidade = document.getElementById('cidade').value.trim();
        const estado = document.getElementById('estado').value.trim();
        const plan = modalPlanInput.value || '';

        if(!cnpj || !email || !segmento || !cidade || !estado){
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const message = `Olá, tenho interesse no plano (${plan}).%0A%0ACNPJ: ${cnpj}%0AEmail: ${email}%0ASegmento: ${segmento}%0ACidade: ${cidade}%0AEstado: ${estado}%0A%0AGostaria de saber quais as condições para contratação.`;
        const url = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(url, '_blank');
        closeModal();
    });

});
