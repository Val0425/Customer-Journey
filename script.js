class TableManager {
    constructor() {
        this.currentTableId = null;
        this.tables = []; // Data se cargará asíncronamente desde Firebase
        this.db = null;

        // =========================================================================
        // 🔑 CONFIGURACIÓN DE FIREBASE INYECTADA
        // =========================================================================
        const firebaseConfig = {
            apiKey: "AIzaSyBSPaon2DVP1OPZVRxC0ZIx7bydV8-ELXg",
            authDomain: "proyecto-cx--cjm.firebaseapp.com",
            projectId: "proyecto-cx--cjm",
            storageBucket: "proyecto-cx--cjm.firebasestorage.app",
            messagingSenderId: "153629939597",
            appId: "1:153629939597:web:bf702e3fc4802fcd7d0fc4",
            measurementId: "G-WX6HLYZX9G"
        };

        try {
            // Inicializa la app de Firebase (usando compat v9)
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            // Obtén la instancia de Firestore
            this.db = firebase.firestore();
            console.log("Conexión a Firebase Firestore establecida.");
        } catch (error) {
            console.error("Error al inicializar Firebase:", error);
            this.showNotification("Error: No se pudo conectar a Firebase. Revisa las credenciales.", 'error');
        }

        this.init();
    }

    async init() {
        this.setupEventListeners();
        // Primero asegurarnos de que las celdas editables tengan sub-cuadrados
        this.insertSubcellsToEditableCells();
        // Luego habilitar la edición en los sub-cuadrados
        this.makeEditableCells();
        this.setupInteractiveCells();
        this.setupEditableTitle();
        // Cargar tablas desde Firebase
        await this.loadAllTablesFromFirebase();
    }

    setupEventListeners() {
        // New table button
        document.getElementById('newTableBtn').addEventListener('click', () => {
            this.showNameModal('new');
        });

        // Save table button
        document.getElementById('saveTableBtn').addEventListener('click', () => {
            this.saveCurrentTable(); // Ahora es asíncrono
        });

        // View tables button
        document.getElementById('viewTablesBtn').addEventListener('click', () => {
            this.showTablesModal();
        });

        // Export PDF button
        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Name modal buttons
        document.getElementById('saveNameBtn').addEventListener('click', () => {
            this.handleNameSave(); // Ahora es asíncrono
        });

        document.getElementById('cancelNameBtn').addEventListener('click', () => {
            this.hideNameModal();
        });

        // Close tables modal
        document.getElementById('closeTablesModal').addEventListener('click', () => {
            this.hideTablesModal();
        });

        // Close modals on outside click
        document.getElementById('nameModal').addEventListener('click', (e) => {
            if (e.target.id === 'nameModal') this.hideNameModal();
        });

        document.getElementById('tablesModal').addEventListener('click', (e) => {
            if (e.target.id === 'tablesModal') this.hideTablesModal();
        });
    }

    makeEditableCells() {
        // Aplicar contentEditable y handlers a subcells si existen
        document.querySelectorAll('.cell.editable .subcell').forEach(sub => {
            sub.contentEditable = true;
            if (!sub.dataset._listenersAttached) {
                sub.addEventListener('blur', () => this.autoSave());
                sub.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sub.blur();
                    }
                });
                sub.dataset._listenersAttached = '1';
            }
        });

        // Para celdas editables que NO tengan subcells (filas excluidas), asegúrate de que la celda sea editable
        document.querySelectorAll('.cell.editable').forEach(cell => {
            if (!cell.querySelector('.subcells')) {
                if (!cell.dataset._cellListenersAttached) {
                    cell.contentEditable = true;
                    cell.addEventListener('blur', () => this.autoSave());
                    cell.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            cell.blur();
                        }
                    });
                    cell.dataset._cellListenersAttached = '1';
                }
            }
        });
    }

    setupInteractiveCells() {
        // Experience cells
        document.querySelectorAll('.experience-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                this.toggleExperienceCell(cell);
            });
        });

        // Mark cells
        document.querySelectorAll('.mark-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                this.toggleMarkCell(cell);
            });
        });
    }

    /**
     * Inserta 4 sub-cuadrados editables en cada celda `.editable`.
     * - Si la celda ya contiene texto, ese texto se mueve al primer subcuadro.
     * - Evita tocar celdas que sean `.experience-cell` o `.mark-cell`.
     */
    insertSubcellsToEditableCells() {
    // Insert subcells only for editable cells that belong to allowed rows.
    // Añadido 'Puntos de contacto' a la lista de filas excluidas por petición del usuario.
    const excludedRows = new Set(['Etapas', 'Nivel de Experiencia', 'Emociones', 'Verbatims', 'Puntos de contacto']);
        const container = document.querySelector('.container');
        if (!container) return;

        let currentRowLabel = '';
        Array.from(container.children).forEach(child => {
            if (child.classList.contains('row-label')) {
                currentRowLabel = child.textContent.trim();
                return;
            }

            if (child.classList && child.classList.contains('cell') && child.classList.contains('editable')) {
                // Skip interactive kinds
                if (child.classList.contains('experience-cell') || child.classList.contains('mark-cell')) return;

                const shouldExclude = excludedRows.has(currentRowLabel);

                const existing = child.querySelector('.subcells');

                if (shouldExclude) {
                    // If this cell already has subcells, convert back to a single editable region
                    if (existing) {
                        const firstText = (existing.querySelector('.subcell')?.textContent || '').trim();
                        child.innerHTML = '';
                        child.textContent = firstText; // put existing text back into the cell
                        // make the cell itself editable so behavior remains
                        child.contentEditable = true;
                        child.addEventListener('blur', () => this.autoSave());
                        child.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                child.blur();
                            }
                        });
                    } else {
                        // Ensure cell is editable (no subcells) for excluded rows
                        child.contentEditable = true;
                        child.addEventListener('blur', () => this.autoSave());
                        child.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                child.blur();
                            }
                        });
                    }

                    return;
                }

                // Allowed row: ensure has subcells
                if (existing) {
                    // nothing to do (but ensure the subcells have listeners)
                } else {
                    const rawText = (child.textContent || '').trim();
                    const containerDiv = document.createElement('div');
                    containerDiv.className = 'subcells';
                    for (let i = 0; i < 4; i++) {
                        const box = document.createElement('div');
                        box.className = 'subcell';
                        box.setAttribute('data-subcell-index', i);
                        box.contentEditable = true;
                        containerDiv.appendChild(box);
                    }
                    child.innerHTML = '';
                    child.appendChild(containerDiv);

                    if (rawText.length > 0) {
                        const first = containerDiv.querySelector('.subcell');
                        if (first) first.textContent = rawText;
                    }
                }

                // Wire listeners on subcells if present
                const finalContainer = child.querySelector('.subcells');
                if (finalContainer) {
                    finalContainer.querySelectorAll('.subcell').forEach(sub => {
                        sub.contentEditable = true;
                        // Avoid double-binding: remove existing simple handlers if any by cloning
                        // (Safer approach than tracking handlers). We'll replace the node with a clone without listeners.
                        // But cloning would remove contentEditable; instead, use a flag to avoid duplicate.
                        if (!sub.dataset._listenersAttached) {
                            sub.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sub.blur();
                                }
                            });
                            sub.addEventListener('blur', () => this.autoSave());
                            sub.dataset._listenersAttached = '1';
                        }
                    });
                }
            }
        });
    }

    toggleExperienceCell(cell) {
        const isSelected = cell.classList.contains('selected');

        // Clear other selections in the same column
        const col = cell.dataset.col;
        document.querySelectorAll(`[data-col="${col}"].experience-cell`).forEach(c => {
            c.classList.remove('selected');
            c.textContent = '';
        });

        if (!isSelected) {
            cell.classList.add('selected');
            cell.textContent = cell.dataset.emoji;
        }

        this.autoSave();
    }

    toggleMarkCell(cell) {
        cell.classList.toggle('marked');
        cell.textContent = cell.classList.contains('marked') ? '✓' : '';
        this.autoSave();
    }

    // =========================================================================
    // MÉTODOS DE FIREBASE (REEMPLAZANDO localStorage)
    // =========================================================================

    /**
     * Carga todas las tablas de Firestore.
     */
    async loadAllTablesFromFirebase() {
        if (!this.db) return;

        try {
            // Ordenar por la fecha de actualización más reciente
            const snapshot = await this.db.collection('customerJourneys').orderBy('updatedAt', 'desc').get();

            this.tables = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (this.tables.length > 0) {
                this.loadTable(this.tables[0].id);
            } else {
                // Si no hay tablas, crea una nueva y la guarda en Firebase
                await this.createNewTable("Tabla Sin Nombre");
                this.showNotification("Nueva sesión iniciada y conectada a Firebase.");
            }
        } catch (error) {
            console.error("Error al cargar tablas de Firebase:", error);
            this.showNotification("Error de sincronización: No se pudieron cargar las tablas.", 'error');
        }
    }

    /**
     * Crea una nueva tabla en Firestore.
     */
    async createNewTable(name = 'Tabla Sin Nombre') {
        if (!this.db) return;

        // Limpiar el estado visual actual para la nueva tabla
        this.loadTableData({ editableCells: {}, experienceCells: {}, markCells: {} });

        const newTableData = {
            name: name,
            data: this.getCurrentTableData(),
            schemaVersion: 2, // Explicit versioning to avoid migration issues
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const docRef = await this.db.collection('customerJourneys').add(newTableData);

            // Asumiendo que el campo 'data' y 'name' se guardaron correctamente.
            const newTable = {
                id: docRef.id,
                name: name,
                data: newTableData.data,
                // Las fechas serán timestamps locales para manejo inmediato en la UI.
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.tables.unshift(newTable); // Agregar al inicio (más reciente)
            this.currentTableId = docRef.id;
            this.updateCurrentTableName(name);
            this.showNotification(`Tabla "${name}" creada y sincronizada.`);
        } catch (error) {
            console.error("Error al crear nueva tabla en Firebase:", error);
            this.showNotification('Error al crear tabla en la nube.', 'error');
        }
    }

    /**
     * Guarda la tabla actual en Firestore (actualiza el documento).
     */
    async saveCurrentTable() {
        if (!this.db || !this.currentTableId) return;

        const table = this.tables.find(t => t.id === this.currentTableId);
        if (table) {
            const dataToUpdate = {
                data: this.getCurrentTableData(),
                schemaVersion: 2, // Explicit versioning
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                // Actualizar el documento en Firestore
                await this.db.collection('customerJourneys').doc(this.currentTableId).update(dataToUpdate);

                // Actualizar la hora de actualización en el array local (para UI)
                table.data = dataToUpdate.data;
                table.updatedAt = new Date().toISOString();

                this.showNotification('✅ Tabla sincronizada en Firebase');
            } catch (error) {
                console.error("Error al guardar en Firebase:", error);
                this.showNotification('❌ Error de sincronización. Intenta de nuevo.', 'error');
            }
        }
    }

    /**
     * Actualiza el nombre de la tabla en Firebase.
     */
    async updateTableNameInFirebase(tableId, newName) {
        if (!this.db || !tableId) return;

        try {
            await this.db.collection('customerJourneys').doc(tableId).update({
                name: newName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error al renombrar en Firebase:", error);
            this.showNotification('❌ Error al renombrar la tabla en la nube.', 'error');
            return false;
        }
    }

    /**
     * Elimina una tabla de Firestore.
     */
    async deleteTable(tableId) {
        if (!this.db) return;
        if (!confirm('¿Está seguro de que desea eliminar esta tabla de la NUBE? Esta acción es irreversible.')) return;

        try {
            // Eliminar de Firestore
            await this.db.collection('customerJourneys').doc(tableId).delete();

            // Eliminar del array local
            this.tables = this.tables.filter(t => t.id !== tableId);

            if (this.currentTableId === tableId) {
                if (this.tables.length > 0) {
                    this.loadTable(this.tables[0].id);
                } else {
                    await this.createNewTable("Nueva Tabla"); // Crear una nueva si no quedan
                }
            }

            this.renderTablesList();
            this.showNotification('Tabla eliminada exitosamente de Firebase');
        } catch (error) {
            console.error("Error al eliminar en Firebase:", error);
            this.showNotification('Error al eliminar tabla en la nube.', 'error');
        }
    }

    // =========================================================================
    // MÉTODOS EXISTENTES CON AJUSTES (USANDO ASYNC/AWAIT)
    // =========================================================================

    loadTable(tableId) {
        const table = this.tables.find(t => t.id === tableId);
        if (!table) return;

        this.currentTableId = tableId;
        this.updateCurrentTableName(table.name);
        // La estructura de datos (table.data) sigue siendo la misma, solo cambia la fuente.
        this.loadTableData(table.data);
    }

    getCurrentTableData() {
        const data = {
            editableCells: {},
            experienceCells: {},
            markCells: {}
        };

        // Save editable cells
        document.querySelectorAll('.editable').forEach((cell, index) => {
            data.editableCells[index] = cell.textContent;
        });

        // Save experience cells
        document.querySelectorAll('.experience-cell.selected').forEach(cell => {
            const col = cell.dataset.col;
            const emoji = cell.dataset.emoji;
            data.experienceCells[col] = emoji;
        });

        // Save mark cells
        // Use the global index among ALL .mark-cell elements so we can restore by position later.
        const allMarkCells = document.querySelectorAll('.mark-cell');
        allMarkCells.forEach((cell, index) => {
            if (cell.classList.contains('marked')) {
                data.markCells[index] = true;
            }
        });

        return data;
    }

    loadTableData(data) {
        // Clear current state
        const editableCells = document.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.textContent = '';
        });

        document.querySelectorAll('.experience-cell').forEach(cell => {
            cell.classList.remove('selected');
            cell.textContent = '';
        });

        document.querySelectorAll('.mark-cell').forEach(cell => {
            cell.classList.remove('marked');
            cell.textContent = '';
        });

        // Load editable cells
        // Detectar si es el esquema antiguo (menos celdas)
        const totalEditable = editableCells.length;
        const dataKeys = Object.keys(data.editableCells || {});
        let isOldSchema = false;

        // Mejora en la detección: Usar cantidad de celdas en lugar de contenido.
        // El esquema antiguo (7 columnas) tenía ~52 celdas editables.
        // El nuevo esquema (12 columnas) tiene > 100.
        // Si hay datos, pero son pocos (< 80), asumimos que es el esquema antiguo.
        // Check for explicit schema version first
        if (data.schemaVersion === 2) {
            isOldSchema = false;
        }
        // Fallback: Check heuristics if no version is present
        else if (dataKeys.length > 0 && dataKeys.length < 80) {
            isOldSchema = true;
            console.log("Detectado esquema antiguo por cantidad de celdas (" + dataKeys.length + "). Migrando...");
        }

        if (isOldSchema) {
            // Migración de datos on-the-fly
            const newEditableCells = {};
            Object.entries(data.editableCells).forEach(([key, content]) => {
                const oldIndex = parseInt(key);
                let newIndex = oldIndex;

                if (oldIndex === 0) newIndex = 0; // Afiliación -> Afiliación (Antes)
                else if (oldIndex === 1) newIndex = 4; // Relacionamiento -> Relacionamiento (Durante)
                else if (oldIndex === 2) newIndex = 8; // Pago -> Pago (Después)
                else if (oldIndex >= 3) {
                    // Mapeo de filas de 7 columnas a 12 columnas.
                    // Old structure: Row 0 (3 cells), Rows 1+ (7 cells each)
                    // New structure: Row 0 (12 cells), Rows 1+ (12 cells each)

                    // 1. Determinar en qué fila y columna estaba en el esquema antiguo
                    const relativeIndex = oldIndex - 3; // Indices 3+ son los de contenido
                    const rowNumber = Math.floor(relativeIndex / 7); // 0-based row index for content rows
                    const colNumber = relativeIndex % 7;

                    // 2. Calcular nuevo índice
                    // El nuevo contenido arranca en índice 12 (después de las 12 celdas de Etapas)
                    // Cada fila nueva tiene 12 columnas
                    newIndex = 12 + (rowNumber * 12) + colNumber;
                }
                newEditableCells[newIndex] = content;
            });

            // Renderizar datos migrados
            Object.entries(newEditableCells).forEach(([index, content]) => {
                if (editableCells[index]) editableCells[index].textContent = content;
            });

            // Forzar guardado del nuevo esquema para corregirlo en Firebase
            this.autoSave();

        } else {
            // Carga normal
            Object.entries(data.editableCells || {}).forEach(([index, content]) => {
                if (editableCells[index]) editableCells[index].textContent = content;
            });
        }

        // Load experience cells
        Object.entries(data.experienceCells || {}).forEach(([col, emoji]) => {
            // Ajustar columnas de experiencia si es necesario (1-7 -> map to 12?)
            // El usuario pidió 12 columnas también para sub-labels?
            // "cada etapa... se distribuyan en 4 columnas".
            // Los emojis están abajo. Si el HTML de emojis no cambió de 7 a 12, se rompe.
            // HTML de emojis data-col va hasta 12 ahora (lo hice en Step 30).
            // Old data col 1..7.
            // New data col 1..12.
            // Mapping: 1->1, 2->?, 3->?
            // Si el usuario tenía emojis, quedarán en las primeras 7 columnas. Es aceptable.
            const cell = document.querySelector(`[data-col="${col}"][data-emoji="${emoji}"].experience-cell`);
            if (cell) {
                cell.classList.add('selected');
                cell.textContent = emoji;
            }
        });

        // Load mark cells
        Object.entries(data.markCells || {}).forEach(([index, marked]) => {
            const cells = document.querySelectorAll('.mark-cell');
            if (cells[index] && marked) {
                cells[index].classList.add('marked');
                cells[index].textContent = '✓';
            }
        });

        // Después de cargar datos, asegurarse de que las celdas editables tengan 4 sub-cuadrados
        this.insertSubcellsToEditableCells();
        // Y volver a registrar los listeners en las subcells
        this.makeEditableCells();
    }

    autoSave() {
        if (this.currentTableId) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveCurrentTable(); // Llamada asíncrona a Firebase
            }, 1000);
        }
    }

    showNameModal(action, tableId = null) {
        this.nameModalAction = action;
        this.nameModalTableId = tableId;

        const input = document.getElementById('tableNameInput');
        if (action === 'rename' && tableId) {
            const table = this.tables.find(t => t.id === tableId);
            input.value = table ? table.name : '';
        } else {
            input.value = '';
        }

        document.getElementById('nameModal').style.display = 'block';
        input.focus();
    }

    hideNameModal() {
        document.getElementById('nameModal').style.display = 'none';
    }

    async handleNameSave() {
        const name = document.getElementById('tableNameInput').value.trim();
        if (!name) return;

        if (this.nameModalAction === 'new') {
            // El nombre se pasa a createNewTable, que maneja la sincronización
            await this.createNewTable(name);
        } else if (this.nameModalAction === 'rename' && this.nameModalTableId) {
            // Actualiza el nombre en Firebase y actualiza el array local si es exitoso
            const success = await this.updateTableNameInFirebase(this.nameModalTableId, name);
            if (success) {
                const table = this.tables.find(t => t.id === this.nameModalTableId);
                if (table) {
                    table.name = name;
                    if (this.currentTableId === this.nameModalTableId) {
                        this.updateCurrentTableName(name);
                    }
                    this.renderTablesList();
                }
            }
        }

        this.hideNameModal();
    }

    showTablesModal() {
        this.renderTablesList();
        document.getElementById('tablesModal').style.display = 'block';
    }

    hideTablesModal() {
        document.getElementById('tablesModal').style.display = 'none';
    }

    renderTablesList() {
        const container = document.getElementById('tablesList');

        if (this.tables.length === 0) {
            container.innerHTML = '<p>No hay tablas guardadas en Firebase.</p>';
            return;
        }

        container.innerHTML = this.tables.map(table => `
            <div class="table-item">
                <div class="table-info">
                    <div class="table-name">${table.name}</div>
                    <div class="table-date">
                        Actualizado: ${new Date(table.updatedAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="table-actions">
                    <button class="btn-primary btn-small" onclick="tableManager.loadTable('${table.id}'); tableManager.hideTablesModal();">
                        Cargar
                    </button>
                    <button class="btn-secondary btn-small" onclick="tableManager.showNameModal('rename', '${table.id}')">
                        Renombrar
                    </button>
                    <button class="btn-danger btn-small" onclick="tableManager.deleteTable('${table.id}')">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEditableTitle() {
        const titleElement = document.getElementById('currentTableName');

        titleElement.addEventListener('click', () => {
            this.startEditingTitle();
        });

        titleElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishEditingTitle();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditingTitle();
            }
        });

        titleElement.addEventListener('blur', () => {
            this.finishEditingTitle();
        });
    }

    startEditingTitle() {
        const titleElement = document.getElementById('currentTableName');
        const currentText = titleElement.textContent;

        // Store original text in case we need to cancel
        this.originalTitleText = currentText;

        // Make it editable
        titleElement.contentEditable = true;
        titleElement.classList.add('editing');
        titleElement.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    async finishEditingTitle() {
        const titleElement = document.getElementById('currentTableName');

        if (!titleElement.classList.contains('editing')) {
            return;
        }

        const newName = titleElement.textContent.trim();

        if (!newName || newName.length === 0) {
            titleElement.textContent = this.originalTitleText;
            this.cancelEditingTitle();
            return;
        }

        // Update the current table name
        if (this.currentTableId) {
            const success = await this.updateTableNameInFirebase(this.currentTableId, newName);
            if (success) {
                const table = this.tables.find(t => t.id === this.currentTableId);
                if (table) {
                    table.name = newName;
                    this.showNotification('Nombre de tabla actualizado y sincronizado');
                }
            } else {
                // Revertir el nombre si la sincronización falla
                titleElement.textContent = this.originalTitleText;
            }
        }

        // Clean up editing state
        titleElement.contentEditable = false;
        titleElement.classList.remove('editing');
        titleElement.blur();

        // Clear selection
        window.getSelection().removeAllRanges();
    }

    cancelEditingTitle() {
        const titleElement = document.getElementById('currentTableName');
        titleElement.textContent = this.originalTitleText;
        titleElement.contentEditable = false;
        titleElement.classList.remove('editing');
        titleElement.blur();
        window.getSelection().removeAllRanges();
    }

    updateCurrentTableName(name) {
        const titleElement = document.getElementById('currentTableName');
        titleElement.textContent = name;
        titleElement.title = 'Haz clic para editar';
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a3'); // A3 horizontal para mejor espacio

        const currentTable = this.tables.find(t => t.id === this.currentTableId);
        const tableName = currentTable ? currentTable.name : 'Tabla Sin Nombre';

        // Configuración
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const tableWidth = pageWidth - (margin * 2);

        // Dimensiones de la tabla
        const labelColumnWidth = 60; // Ancho para las etiquetas
        const dataColumnWidth = (tableWidth - labelColumnWidth) / 12; // 12 columnas de datos
        const rowHeight = 12;

        let yPosition = 15;

        // Encabezado del documento
        doc.setFillColor(0, 123, 255);
        doc.rect(0, 0, pageWidth, 25, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(tableName, margin, 15);

        doc.setFontSize(10);
        const now = new Date();
        doc.text(`Generado: ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES')}`,
            pageWidth - margin - 50, 20);

        yPosition = 35;
        doc.setTextColor(0, 0, 0);

        // Dibujar encabezados de fases (ANTES, DURANTE, DESPUÉS)
        this.drawPhaseHeaders(doc, yPosition, margin, labelColumnWidth, dataColumnWidth, rowHeight);
        yPosition += rowHeight;

        // Obtener todas las filas de la tabla
        const tableRows = this.getTableRows();

        // Dibujar cada fila
        tableRows.forEach(row => {
            // Verificar si necesitamos nueva página
            if (yPosition + rowHeight > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                // Redibujar encabezados en nueva página
                this.drawPhaseHeaders(doc, yPosition, margin, labelColumnWidth, dataColumnWidth, rowHeight);
                yPosition += rowHeight;
            }

            this.drawTableRow(doc, row, yPosition, margin, labelColumnWidth, dataColumnWidth, rowHeight);
            yPosition += rowHeight;
        });

        // Guardar PDF
        const fileName = `${tableName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        doc.save(fileName);
        this.showNotification('PDF exportado exitosamente');
    }

    drawPhaseHeaders(doc, yPosition, margin, labelColumnWidth, dataColumnWidth, rowHeight) {
        // Celda vacía para las etiquetas
        doc.setFillColor(255, 255, 255); // Blanco como en la web
        doc.rect(margin, yPosition, labelColumnWidth, rowHeight, 'FD');

        // Configurar estilo común para todos los encabezados (mismo color que en CSS)
        doc.setFillColor(222, 235, 255); // #DEEBFF del CSS
        doc.setTextColor(0, 82, 204); // #0052CC del CSS
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');

        // Encabezado ANTES (4 columnas)
        doc.rect(margin + labelColumnWidth, yPosition, dataColumnWidth * 4, rowHeight, 'FD');
        doc.text('ANTES', margin + labelColumnWidth + (dataColumnWidth * 2) - 10, yPosition + 8);

        // Encabezado DURANTE (4 columnas) - mismo color de fondo
        doc.rect(margin + labelColumnWidth + (dataColumnWidth * 4), yPosition, dataColumnWidth * 4, rowHeight, 'FD');
        doc.text('DURANTE', margin + labelColumnWidth + (dataColumnWidth * 6) - 12, yPosition + 8);

        // Encabezado DESPUÉS (4 columnas) - mismo color de fondo
        doc.rect(margin + labelColumnWidth + (dataColumnWidth * 8), yPosition, dataColumnWidth * 4, rowHeight, 'FD');
        doc.text('DESPUÉS', margin + labelColumnWidth + (dataColumnWidth * 10) - 12, yPosition + 8);
    }

    drawTableRow(doc, row, yPosition, margin, labelColumnWidth, dataColumnWidth, rowHeight) {
        // Dibujar etiqueta de la fila
        if (row.isSubLabel) {
            doc.setFillColor(250, 251, 252);
            doc.setTextColor(66, 82, 110);
            doc.setFontSize(8);
        } else {
            doc.setFillColor(240, 230, 230);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
        }

        doc.rect(margin, yPosition, labelColumnWidth, rowHeight, 'FD');
        doc.setFont(undefined, row.isSubLabel ? 'normal' : 'bold');

        // Ajustar texto de la etiqueta
        const labelLines = doc.splitTextToSize(row.label, labelColumnWidth - 4);
        doc.text(labelLines, margin + 2, yPosition + 7);

        // Dibujar celdas de datos
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');

        row.cells.forEach((cell, index) => {
            const cellX = margin + labelColumnWidth + (index * dataColumnWidth);
            const cellWidth = dataColumnWidth * (cell.colspan || 1);

            // Color de fondo según el tipo de celda
            if (cell.isSelected) {
                doc.setFillColor(227, 252, 239); // Verde claro para seleccionadas
            } else if (cell.isMarked) {
                doc.setFillColor(233, 231, 253); // Morado claro para marcadas
            } else {
                doc.setFillColor(255, 255, 255); // Blanco para normales
            }

            doc.rect(cellX, yPosition, cellWidth, rowHeight, 'FD');

            // Contenido de la celda
            if (cell.content) {
                const cellLines = doc.splitTextToSize(cell.content, cellWidth - 4);
                doc.text(cellLines, cellX + 2, yPosition + 7);
            }
        });
    }

    getTableRows() {
        const rows = [];
        const container = document.querySelector('.container');
        const elements = Array.from(container.children);

        let currentRow = null;

        elements.forEach(element => {
            if (element.classList.contains('row-label')) {
                // Si hay una fila anterior, agregarla
                if (currentRow) {
                    rows.push(currentRow);
                }

                // Crear nueva fila
                currentRow = {
                    label: element.textContent.trim(),
                    isSubLabel: element.classList.contains('sub-label'),
                    cells: []
                };
            } else if (element.classList.contains('cell') && currentRow) {
                // Agregar celda a la fila actual
                const cell = {
                    content: element.textContent.trim(),
                    colspan: parseInt(element.getAttribute('colspan')) || 1,
                    isSelected: element.classList.contains('selected'),
                    isMarked: element.classList.contains('marked')
                };

                currentRow.cells.push(cell);
            }
        });

        // Agregar la última fila
        if (currentRow) {
            rows.push(currentRow);
        }

        return this.processTableRows(rows);
    }

    processTableRows(rows) {
        // Procesar filas para manejar colspan y asegurar 12 columnas
        return rows.map(row => {
            const processedCells = [];
            let currentColumn = 0;

            row.cells.forEach(cell => {
                const colspan = cell.colspan || 1;

                // Agregar la celda
                processedCells.push({
                    ...cell,
                    startColumn: currentColumn,
                    endColumn: currentColumn + colspan - 1
                });

                // Agregar celdas vacías para el colspan si es mayor a 1
                for (let i = 1; i < colspan; i++) {
                    processedCells.push({
                        content: '',
                        isPlaceholder: true,
                        colspan: 1
                    });
                }

                currentColumn += colspan;
            });

            // Rellenar hasta 12 columnas si es necesario
            while (processedCells.length < 12) {
                processedCells.push({
                    content: '',
                    colspan: 1
                });
            }

            return {
                ...row,
                cells: processedCells.slice(0, 12) // Asegurar máximo 12 columnas
            };
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        let background = type === 'success' ? '#28a745' : '#dc3545';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${background};
            color: white;
            padding: 1rem;
            border-radius: 4px;
            z-index: 2000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Los métodos loadTables() y saveTables() originales (de localStorage) fueron eliminados.
}

// Initialize the table manager when the page loads
let tableManager;
document.addEventListener('DOMContentLoaded', () => {
    tableManager = new TableManager();
});
