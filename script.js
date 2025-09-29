document.addEventListener('DOMContentLoaded', () => {

    // --- Celdas Editables ---
    document.querySelectorAll('.editable').forEach(cell => {
        cell.setAttribute('contenteditable', 'true');
    });

    // --- Celdas de Experiencia (Emojis) ---
    const experienceCells = document.querySelectorAll('.experience-cell');
    experienceCells.forEach(cell => {
        cell.addEventListener('click', () => {
            const currentColumn = cell.dataset.col;
            const emoji = cell.dataset.emoji;
            const isSelected = cell.classList.contains('selected');

            // 1. Limpiar todas las celdas de la misma columna
            experienceCells.forEach(c => {
                if (c.dataset.col === currentColumn) {
                    c.classList.remove('selected');
                    c.innerText = '';
                }
            });

            // 2. Si la celda no estaba seleccionada, seleccionarla
            if (!isSelected) {
                cell.classList.add('selected');
                cell.innerText = emoji;
            }
        });
    });

    // --- Celdas con Marca (Esfuerzo y Canales) ---
    const markCells = document.querySelectorAll('.mark-cell');
    markCells.forEach(cell => {
        cell.addEventListener('click', () => {
            // Simplemente añade o quita la clase 'selected'
            cell.classList.toggle('selected');
        });
    });

});