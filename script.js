const gridContainer = document.getElementById('pokedex-grid');
const searchInput = document.getElementById('search-input');
const statusText = document.getElementById('loading-status');
const tooltip = document.getElementById('poke-tooltip');

const generations = [
    { name: "Gen 1 (Kanto)", offset: 0, limit: 151 },
    { name: "Gen 2 (Johto)", offset: 151, limit: 100 },
    { name: "Gen 3 (Hoenn)", offset: 251, limit: 135 },
    { name: "Gen 4 (Sinnoh)", offset: 386, limit: 107 },
    { name: "Gen 5 (Unova)", offset: 493, limit: 156 },
    { name: "Gen 6 (Kalos)", offset: 649, limit: 72 },
    { name: "Gen 7 (Alola)", offset: 721, limit: 88 },
    { name: "Gen 8 (Galar)", offset: 809, limit: 96 },
    { name: "Gen 9 (Paldea)", offset: 905, limit: 120 } 
];

let allPokemonData = [];
let isSearchMode = false;
let hoverTimeout; // Para abrir
let closeTimeout; // Para cerrar (El puente)

// INICIALIZACIÓN
async function init() {
    for (const gen of generations) {
        await loadGeneration(gen);
    }
    statusText.innerText = "";
}

async function loadGeneration(genInfo) {
    statusText.innerText = `Cargando ${genInfo.name}...`;
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${genInfo.limit}&offset=${genInfo.offset}`);
        const data = await response.json();
        
        const promises = data.results.map(async (pokemon) => {
            const res = await fetch(pokemon.url);
            return res.json();
        });

        const results = await Promise.all(promises);
        allPokemonData = [...allPokemonData, ...results];

        if (!isSearchMode) renderPokemon(results, false);
        else performSearch(searchInput.value);

    } catch (error) {
        console.error(`Error cargando ${genInfo.name}:`, error);
    }
}

// RENDERIZADO
function renderPokemon(pokemonList, clearGrid = false) {
    if (clearGrid) gridContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    pokemonList.forEach(poke => {
        const card = document.createElement('div');
        card.classList.add('poke-card');
        
        // EVENTOS INTERACTIVOS (Lógica Puente)
        
        // 1. Entrar a la tarjeta
        card.addEventListener('mouseenter', () => {
            clearTimeout(closeTimeout); // Si volví a entrar rápido, no cierres
            hoverTimeout = setTimeout(() => {
                showTooltip(poke, card);
            }, 800); // 0.8s para mostrar
        });

        // 2. Salir de la tarjeta
        card.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout); // Cancelar apertura si salí antes de tiempo
            // Esperar 300ms antes de cerrar para dar tiempo a llegar al tooltip
            closeTimeout = setTimeout(() => {
                hideTooltip();
            }, 300);
        });

        // Contenido Tarjeta
        const pokeId = poke.id.toString().padStart(3, '0');
        const nameCapitalized = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);
        const image = poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default;
        const typesHtml = poke.types.map(t => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join('');

        card.innerHTML = `
            <span class="poke-id">#${pokeId}</span>
            <div class="poke-img-container">
                <img src="${image}" alt="${nameCapitalized}" class="poke-img" loading="lazy">
            </div>
            <h5 class="poke-name">${nameCapitalized}</h5>
            <div class="types-container">${typesHtml}</div>
        `;

        fragment.appendChild(card);
    });
    gridContainer.appendChild(fragment);
}

// LÓGICA DEL TOOLTIP
function showTooltip(pokemon, cardElement) {
    const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const img = pokemon.sprites.front_default; 
    
    // Habilidades (Wrap)
    const abilitiesHtml = pokemon.abilities.map(a => 
        `<span class="ability-badge">${a.ability.name.replace(/-/g, ' ')}</span>`
    ).join('');

    // Tipos
    const typesHtml = pokemon.types.map(t => 
        `<span class="badge rounded-pill type-${t.type.name} me-1 fs-6">${t.type.name}</span>`
    ).join('');

    // Stats con 8 Colores
    let statsHtml = '';
    pokemon.stats.forEach(s => {
        const statName = s.stat.name
            .replace('special-attack', 'Sp.Atk')
            .replace('special-defense', 'Sp.Def')
            .replace('attack', 'Atk')
            .replace('defense', 'Def')
            .replace('speed', 'Spd')
            .replace('hp', 'HP');
            
        const val = s.base_stat;
        const percent = Math.min((val / 255) * 100, 100);
        
        // Lógica de 8 Tiers de color
        let tierClass = 'bar-tier-1'; // < 30
        if (val >= 30) tierClass = 'bar-tier-2';
        if (val >= 60) tierClass = 'bar-tier-3';
        if (val >= 90) tierClass = 'bar-tier-4';
        if (val >= 110) tierClass = 'bar-tier-5';
        if (val >= 130) tierClass = 'bar-tier-6';
        if (val >= 150) tierClass = 'bar-tier-7';
        if (val >= 200) tierClass = 'bar-tier-8'; // Dios

        statsHtml += `
            <div class="mini-stat-row">
                <span class="mini-stat-name">${statName}</span>
                <div class="mini-bar-bg">
                    <div class="mini-bar-fill ${tierClass}" style="width: ${percent}%"></div>
                </div>
                <span class="stat-num">${val}</span>
            </div>
        `;
    });

    tooltip.innerHTML = `
        <div class="tooltip-header">
            <img src="${img}" class="tooltip-img" alt="${name}">
            <div>
                <h3 class="tooltip-title">${name}</h3>
                <div class="mt-2">${typesHtml}</div>
            </div>
        </div>
        
        <div class="tooltip-abilities">
            ${abilitiesHtml}
        </div>

        <div class="tooltip-stats">
            ${statsHtml}
        </div>
    `;

    positionTooltip(cardElement);
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
}

function positionTooltip(cardElement) {
    const rect = cardElement.getBoundingClientRect();
    const tooltipWidth = 320; 
    const gap = 10;

    let leftPos = rect.right + gap;
    if (leftPos + tooltipWidth > window.innerWidth) {
        leftPos = rect.left - tooltipWidth - gap;
    }

    let topPos = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2);
    // Corrección para que no se salga por arriba
    if (topPos < 10) topPos = 10;
    
    tooltip.style.left = leftPos + 'px';
    tooltip.style.top = topPos + 'px';
}

function hideTooltip() {
    tooltip.style.opacity = '0';
    setTimeout(() => {
        // Solo ocultar display:none si realmente se fue, para permitir animación
        if(tooltip.style.opacity === '0') tooltip.style.display = 'none';
    }, 200);
}

// EVENTOS DEL PROPIO TOOLTIP (Para mantenerlo abierto)
tooltip.addEventListener('mouseenter', () => {
    clearTimeout(closeTimeout); // ¡Estoy dentro del tooltip! No lo cierres.
});

tooltip.addEventListener('mouseleave', () => {
    hideTooltip(); // Ahora sí, chau.
});

// Búsqueda
function performSearch(term) {
    const searchTerm = term.toLowerCase();
    if (searchTerm.length > 0) {
        isSearchMode = true;
        const filtered = allPokemonData.filter(poke => poke.name.includes(searchTerm) || poke.id.toString().includes(searchTerm));
        renderPokemon(filtered, true);
    } else {
        isSearchMode = false;
        renderPokemon(allPokemonData, true);
    }
}
searchInput.addEventListener('input', (e) => performSearch(e.target.value));

init();