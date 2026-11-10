document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL ---
    let grupos = JSON.parse(localStorage.getItem('ecolba_grupos_ciencia')) || []; 
    
    let liderTemporal = null;
    let integrantesTemporales = [];
    let temaTemporal = null;
    let categoriaTemporal = null;
    let grupoEditandoId = null; 

    const categoriasProyecto = [
        "Maqueta o experimento", "Video con escenografía", "Obra de teatro", "Canción y coreografía", 
        "Diseño", "Exhibición de deportes", "Baile", "Prevención de accidentes", "Proyecto lúdico", 
        "Tecnología o ingeniería", "Matemáticas"
    ];

    // --- REFERENCIAS DOM ---
    const formGrupo = document.getElementById('form-grupo');
    const selectGradoLider = document.getElementById('select-grado-lider');
    const buscadorLider = document.getElementById('buscador-lider');
    const sugerenciasLider = document.getElementById('sugerencias-lider');
    const liderSeleccionado = document.getElementById('lider-seleccionado');
    const buscadorEstudiante = document.getElementById('buscador-estudiante');
    const listaSugerencias = document.getElementById('lista-sugerencias');
    const contenedorIntegrantes = document.getElementById('integrantes-seleccionados');
    
    const displayCategoria = document.getElementById('display-categoria');
    const btnSortearCategoria = document.getElementById('btn-sortear-categoria');
    const displayTema = document.getElementById('display-tema');
    const btnSortearTema = document.getElementById('btn-sortear-tema');
    const btnSorteoGeneral = document.getElementById('btn-sorteo-general');

    const contenedorGrupos = document.getElementById('contenedor-grupos');
    const buscadorGrupos = document.getElementById('buscador-grupos');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const historialGlobal = document.getElementById('historial-global');
    const toastContainer = document.getElementById('toast-container');

    const modalEditar = document.getElementById('modal-editar');
    const closeModal = document.getElementById('close-modal');
    const modalGrupoNombre = document.getElementById('modal-grupo-nombre');
    const modalIntegrantesLista = document.getElementById('modal-integrantes-lista');
    const buscadorModal = document.getElementById('buscador-modal');
    const sugerenciasModal = document.getElementById('sugerencias-modal');
    const btnGuardarEdicion = document.getElementById('btn-guardar-edicion');
    const modalHistorialLista = document.getElementById('modal-historial-lista');

    // --- PERSISTENCIA ---
    function guardarDatos() {
        localStorage.setItem('ecolba_grupos_ciencia', JSON.stringify(grupos));
    }

    // --- NOTIFICACIONES ---
    function mostrarToast(mensaje, tipo = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.innerHTML = tipo === 'success' ? `✅ ${mensaje}` : `⚠️ ${mensaje}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // --- UTILIDADES DE GRADO ---
    // Extrae el grado base de un curso (ej: "7-01" -> "7")
    function obtenerGradoBase(curso) {
        if (!curso || curso === "Todos") return null;
        return curso.split('-')[0]; 
    }

    function verificarDisponibilidad(estudianteId) {
        if (liderTemporal && liderTemporal.id === estudianteId) return "Es el líder actual";
        if (integrantesTemporales.some(i => i.id === estudianteId)) return "Ya está en la lista temporal";
        for (let g of grupos) {
            if (g.lider.id === estudianteId) return `Líder del grupo #${g.numeroGrupo}`;
            if (g.integrantes.some(i => i.id === estudianteId)) return `Integrante del grupo #${g.numeroGrupo}`;
        }
        return null;
    }

    // --- SELECTOR DE CURSO ---
    selectGradoLider.addEventListener('change', (e) => {
        const curso = e.target.value;
        
        buscadorLider.disabled = false;
        buscadorLider.placeholder = `🔍 Buscar líder en el curso ${curso}...`;
        
        if (liderTemporal) { liderTemporal = null; renderLider(); }
        if (integrantesTemporales.length > 0) {
            integrantesTemporales = [];
            renderIntegrantesTemporales();
            mostrarToast("Integrantes removidos porque cambió el curso.", "error");
        }

        // Habilitar sorteo de tema (comparación directa con el grado numérico)
        const gradoBase = obtenerGradoBase(curso);
        const temasFiltrados = window.temasDB.filter(t => t.grado === gradoBase);
        
        if (temasFiltrados.length === 0) {
            btnSortearTema.disabled = true;
            mostrarToast(`No hay temas cargados para ${gradoBase}º grado.`, "error");
        } else {
            btnSortearTema.disabled = false;
        }

        if (temaTemporal) {
            temaTemporal = null;
            displayTema.textContent = "Presiona para sortear";
            displayTema.classList.remove('activo');
        }
    });

    // --- BÚSQUEDA DE ESTUDIANTES (EXACTA POR CURSO) ---
    function buscarEstudiantes(query) {
        const cursoSeleccionado = selectGradoLider.value;
        if (!cursoSeleccionado) return [];
        
        let resultados = window.estudiantesDB.filter(e => e.grado === cursoSeleccionado);

        if (query) {
            const q = query.toLowerCase();
            resultados = resultados.filter(e => 
                e.nombre.toLowerCase().includes(q) || 
                e.apellido.toLowerCase().includes(q)
            );
        }
        return resultados.slice(0, 20);
    }

    function renderSugerencias(query, listaEl, alSeleccionar, resultados) {
        listaEl.innerHTML = '';
        
        if (resultados.length === 0) { 
            if (query) {
                const li = document.createElement('li');
                li.textContent = "No se encontraron estudiantes en este curso.";
                li.style.color = "var(--text-secondary)";
                li.style.fontStyle = "italic";
                listaEl.appendChild(li);
                listaEl.classList.add('active');
            } else {
                listaEl.classList.remove('active'); 
            }
            return; 
        }
        
        resultados.forEach(item => {
            const li = document.createElement('li');
            const motivoBloqueo = verificarDisponibilidad(item.id);
            
            if (motivoBloqueo) {
                li.innerHTML = `${item.nombre} ${item.apellido} <span style="font-size:0.8rem; color:#c62828;">(Ocupado)</span>`;
                li.className = 'agotado';
                li.onclick = () => mostrarToast(`Ya está en el sistema (${motivoBloqueo}).`, "error");
            } else {
                li.textContent = `${item.nombre} ${item.apellido} (${item.grado})`;
                li.onclick = () => { alSeleccionar(item); listaEl.classList.remove('active'); };
            }
            listaEl.appendChild(li);
        });
        listaEl.classList.add('active');
    }

    // --- LÍDER ---
    buscadorLider.addEventListener('input', (e) => {
        const resultados = buscarEstudiantes(e.target.value);
        renderSugerencias(e.target.value, sugerenciasLider, (est) => {
            liderTemporal = est;
            buscadorLider.value = '';
            renderLider();
        }, resultados);
    });

    function renderLider() {
        liderSeleccionado.innerHTML = '';
        if (liderTemporal) {
            const div = document.createElement('div');
            div.className = 'tag-especial';
            div.innerHTML = `
                <span>👑 ${liderTemporal.nombre} ${liderTemporal.apellido} (${liderTemporal.grado})</span>
                <span class="remove-btn" onclick="removerLider()">×</span>
            `;
            liderSeleccionado.appendChild(div);
        }
    }
    window.removerLider = () => { liderTemporal = null; renderLider(); };

    // --- INTEGRANTES ---
    buscadorEstudiante.addEventListener('input', (e) => {
        if (!selectGradoLider.value) {
            mostrarToast("Primero selecciona el curso del grupo.", "error");
            return;
        }
        const resultados = buscarEstudiantes(e.target.value);
        renderSugerencias(e.target.value, listaSugerencias, agregarIntegranteTemporal, resultados);
    });

    function agregarIntegranteTemporal(estudiante) {
        if (verificarDisponibilidad(estudiante.id)) return mostrarToast("Este estudiante ya está ocupado.", "error");
        integrantesTemporales.push(estudiante);
        buscadorEstudiante.value = '';
        renderIntegrantesTemporales();
    }

    function renderIntegrantesTemporales() {
        contenedorIntegrantes.innerHTML = '';
        if (integrantesTemporales.length === 0) {
            contenedorIntegrantes.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; margin-top: 0.5rem;">Aún no has añadido integrantes extra.</p>';
        }
        integrantesTemporales.forEach((est, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag-integrante';
            tag.innerHTML = `${est.nombre} ${est.apellido} <span class="remove-btn" data-index="${index}">×</span>`;
            contenedorIntegrantes.appendChild(tag);
        });
        document.querySelectorAll('#integrantes-seleccionados .remove-btn').forEach(btn => {
            btn.onclick = (e) => {
                integrantesTemporales.splice(parseInt(e.target.dataset.index), 1);
                renderIntegrantesTemporales();
            };
        });
    }

    document.addEventListener('click', (e) => {
        const conts = [buscadorLider, sugerenciasLider, buscadorEstudiante, listaSugerencias, buscadorModal, sugerenciasModal];
        if (!conts.some(el => el.contains(e.target))) {
            document.querySelectorAll('.sugerencias-list').forEach(l => l.classList.remove('active'));
        }
    });

    // --- SORTEOS ---
    btnSortearCategoria.addEventListener('click', () => {
        if (categoriaTemporal) return mostrarToast("La categoría ya fue sorteada.", "error");
        let contador = 0;
        displayCategoria.textContent = "Sorteando...";
        displayCategoria.classList.remove('activo');
        const interval = setInterval(() => {
            displayCategoria.textContent = categoriasProyecto[Math.floor(Math.random() * categoriasProyecto.length)];
            contador++;
            if (contador > 15) {
                clearInterval(interval);
                categoriaTemporal = categoriasProyecto[Math.floor(Math.random() * categoriasProyecto.length)];
                displayCategoria.innerHTML = `<span>${categoriaTemporal}</span>`;
                displayCategoria.classList.add('activo');
                btnSortearCategoria.disabled = true;
            }
        }, 80);
    });

    btnSortearTema.addEventListener('click', () => {
        if (temaTemporal) return mostrarToast("El tema ya fue sorteado.", "error");
        const curso = selectGradoLider.value;
        if (!curso) return mostrarToast("Primero selecciona el curso del líder.", "error");
        
        const gradoBase = obtenerGradoBase(curso);
        // FILTRO DIRECTO CON EL GRADO NUMÉRICO
        const temasDisponibles = window.temasDB.filter(t => t.grado === gradoBase);
        
        if (temasDisponibles.length === 0) return mostrarToast("No hay temas para este grado.", "error");

        let contador = 0;
        displayTema.textContent = "Sorteando...";
        displayTema.classList.remove('activo');
        const interval = setInterval(() => {
            displayTema.textContent = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)].tema;
            contador++;
            if (contador > 15) {
                clearInterval(interval);
                temaTemporal = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)];
                displayTema.innerHTML = `<span class="badge-materia">${temaTemporal.materia} - ${temaTemporal.grado}º</span><span>${temaTemporal.tema}</span>`;
                displayTema.classList.add('activo');
                btnSortearTema.disabled = true;
            }
        }, 80);
    });

    btnSorteoGeneral.addEventListener('click', () => {
        if (categoriaTemporal || temaTemporal) return mostrarToast("Ya hay un sorteo en curso.", "error");
        
        categoriaTemporal = categoriasProyecto[Math.floor(Math.random() * categoriasProyecto.length)];
        displayCategoria.innerHTML = `<span>${categoriaTemporal}</span>`;
        displayCategoria.classList.add('activo');
        btnSortearCategoria.disabled = true;

        const curso = selectGradoLider.value;
        if (curso) {
            const gradoBase = obtenerGradoBase(curso);
            const temasDisponibles = window.temasDB.filter(t => t.grado === gradoBase);
            if (temasDisponibles.length > 0) {
                temaTemporal = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)];
                displayTema.innerHTML = `<span class="badge-materia">${temaTemporal.materia} - ${temaTemporal.grado}º</span><span>${temaTemporal.tema}</span>`;
                displayTema.classList.add('activo');
                btnSortearTema.disabled = true;
            }
        } else {
            mostrarToast("Categoría sorteada. Selecciona curso para el tema.", "error");
        }
    });

    // --- CREACIÓN DE GRUPO ---
    formGrupo.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectGradoLider.value) return mostrarToast("Debes seleccionar el curso del grupo.", "error");
        if (!liderTemporal) return mostrarToast("Debes seleccionar un Líder.", "error");
        if (!temaTemporal) return mostrarToast("Debes sortear un tema.", "error");
        if (!categoriaTemporal) return mostrarToast("Debes sortear una categoría.", "error");

        const numeroGrupo = grupos.length + 1;
        grupos.push({
            id: Date.now().toString(),
            numeroGrupo: numeroGrupo,
            categoria: categoriaTemporal,
            lider: liderTemporal,
            tema: temaTemporal,
            integrantes: [...integrantesTemporales],
            historial: [{ fecha: new Date().toLocaleString(), accion: "Grupo Creado", detalle: `Líder: ${liderTemporal.nombre}.` }]
        });

        guardarDatos(); 
        
        formGrupo.reset();
        selectGradoLider.value = "";
        buscadorLider.disabled = true;
        buscadorLider.placeholder = "🔍 Primero selecciona el curso y luego busca...";
        liderTemporal = null; integrantesTemporales = []; temaTemporal = null; categoriaTemporal = null;
        
        displayCategoria.textContent = "Presiona para sortear"; displayCategoria.classList.remove('activo'); btnSortearCategoria.disabled = false;
        displayTema.textContent = "Presiona para sortear"; displayTema.classList.remove('activo'); btnSortearTema.disabled = true;

        renderLider(); renderIntegrantesTemporales(); actualizarUI();
        mostrarToast(`Grupo #${numeroGrupo} creado y guardado.`);
    });

    // --- RENDERIZADO Y FILTROS ---
    function actualizarUI() {
        const filtroTexto = buscadorGrupos.value.toLowerCase();
        const filtroCat = filtroCategoria.value;

        const gruposFiltrados = grupos.filter(g => {
            const coincideTexto = `Grupo #${g.numeroGrupo}`.toLowerCase().includes(filtroTexto) || 
                                  `${g.lider.nombre} ${g.lider.apellido}`.toLowerCase().includes(filtroTexto) ||
                                  g.integrantes.some(i => `${i.nombre} ${i.apellido}`.toLowerCase().includes(filtroTexto));
            const coincideCat = filtroCat === "" || g.categoria === filtroCat;
            return coincideTexto && coincideCat;
        });

        contenedorGrupos.innerHTML = '';
        if (gruposFiltrados.length === 0) {
            contenedorGrupos.innerHTML = '<p class="empty-state">No se encontraron grupos.</p>';
        } else {
            gruposFiltrados.forEach(grupo => {
                const card = document.createElement('div');
                card.className = 'grupo-card';
                const listaIntegrantes = grupo.integrantes.length === 0 
                    ? '<li style="color: #ef9a9a; font-style: italic;">No hay integrantes extra.</li>'
                    : grupo.integrantes.map(i => `<li>${i.nombre} ${i.apellido}</li>`).join('');

                card.innerHTML = `
                    <h3>Grupo #${grupo.numeroGrupo}</h3>
                    <p><strong>Cat:</strong> ${grupo.categoria}</p>
                    <p><strong>👑 Líder:</strong> ${grupo.lider.nombre} ${grupo.lider.apellido} (${grupo.lider.grado})</p>
                    <div class="tag-tema asignado">🎯 ${grupo.tema.tema}</div>
                    <ul>
                        <li style="color: var(--text-main); font-weight: 800; border: none; margin-bottom: 5px;">Integrantes (${grupo.integrantes.length + 1}):</li>
                        ${listaIntegrantes}
                    </ul>
                    <button class="btn-edit" onclick="abrirModalEdicion('${grupo.id}')">Añadir / Administrar Integrantes</button>
                `;
                contenedorGrupos.appendChild(card);
            });
        }
        renderHistorialGlobal();
    }

    buscadorGrupos.addEventListener('input', actualizarUI);
    filtroCategoria.addEventListener('change', actualizarUI);

    // --- MODAL ---
    window.abrirModalEdicion = (id) => {
        const grupo = grupos.find(g => g.id === id);
        if (!grupo) return;
        grupoEditandoId = id;
        modalGrupoNombre.textContent = `Grupo #${grupo.numeroGrupo} - Líder: ${grupo.lider.nombre}`;
        renderModalIntegrantes(grupo);
        renderHistorialModal(grupo);
        switchTab('tab-integrantes');
        modalEditar.classList.remove('hidden');
        buscadorModal.value = '';
    };

    window.switchTab = (tabId) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`btn-${tabId}`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    };

    closeModal.onclick = () => { modalEditar.classList.add('hidden'); grupoEditandoId = null; };
    btnGuardarEdicion.onclick = () => { modalEditar.classList.add('hidden'); mostrarToast("Ventana cerrada."); };

    function renderModalIntegrantes(grupo) {
        modalIntegrantesLista.innerHTML = '';
        if (grupo.integrantes.length === 0) {
            modalIntegrantesLista.innerHTML = '<p class="empty-state" style="padding: 1rem 0;">Sin integrantes extra aún.</p>';
        }
        grupo.integrantes.forEach((est, index) => {
            const div = document.createElement('div');
            div.className = 'tag-integrante';
            div.style = 'margin-bottom: 0.5rem; width: 100%; justify-content: space-between; display: flex; background: #fbfbfd; padding: 0.8rem; border-radius: 12px;';
            div.innerHTML = `
                <span>${est.nombre} ${est.apellido} (${est.grado})</span>
                <span class="remove-btn" style="font-size:1.2rem; cursor:pointer; color: #ff3b30;" title="Retirar" data-index="${index}">×</span>
            `;
            modalIntegrantesLista.appendChild(div);
        });
        modalIntegrantesLista.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.index);
                const est = grupo.integrantes[idx];
                const motivo = prompt(`¿Por qué retiras a ${est.nombre}?`);
                if (motivo === null) return;
                grupo.integrantes.splice(idx, 1);
                grupo.historial.push({ fecha: new Date().toLocaleString(), accion: "Integrante Retirado", detalle: `${est.nombre} - Motivo: ${motivo || 'No especificado'}` });
                guardarDatos();
                renderModalIntegrantes(grupo); renderHistorialModal(grupo); actualizarUI();
                mostrarToast("Integrante removido.");
            };
        });
    }

    buscadorModal.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let resultados = window.estudiantesDB.filter(e => 
            e.nombre.toLowerCase().includes(query) || 
            e.apellido.toLowerCase().includes(query)
        ).slice(0, 20);

        renderSugerencias(e.target.value, sugerenciasModal, (estudiante) => {
            const grupo = grupos.find(g => g.id === grupoEditandoId);
            const motivoBloqueo = verificarDisponibilidad(estudiante.id);
            if (motivoBloqueo) return mostrarToast(`Ya está registrado (${motivoBloqueo}).`, "error");
            if (estudiante.id === grupo.lider.id) return mostrarToast("Esta persona es el líder.", "error");
            grupo.integrantes.push(estudiante);
            grupo.historial.push({ fecha: new Date().toLocaleString(), accion: "Integrante Añadido", detalle: `Se añadió a ${estudiante.nombre} ${estudiante.apellido}` });
            guardarDatos(); 
            buscadorModal.value = ''; sugerenciasModal.classList.remove('active');
            renderModalIntegrantes(grupo); renderHistorialModal(grupo); actualizarUI();
            mostrarToast("Integrante añadido y guardado.");
        }, resultados);
    });

    // --- HISTORIAL ---
    function renderHistorialModal(grupo) {
        modalHistorialLista.innerHTML = '';
        if (grupo.historial.length === 0) return modalHistorialLista.innerHTML = '<p class="empty-state">Sin movimientos.</p>';
        [...grupo.historial].reverse().forEach(h => {
            const div = document.createElement('div');
            div.className = 'historial-item';
            div.innerHTML = `<span class="fecha">${h.fecha}</span><strong>${h.accion}:</strong> ${h.detalle}`;
            modalHistorialLista.appendChild(div);
        });
    }

    function renderHistorialGlobal() {
        let movimientos = [];
        grupos.forEach(g => g.historial.forEach(h => movimientos.push({ ...h, grupo: `Grupo #${g.numeroGrupo}` })));
        movimientos.reverse();
        historialGlobal.innerHTML = '';
        if (movimientos.length === 0) return historialGlobal.innerHTML = '<p class="empty-state">No hay movimientos globales.</p>';
        movimientos.slice(0, 20).forEach(h => {
            const div = document.createElement('div');
            div.className = 'historial-item';
            div.innerHTML = `<span class="fecha">${h.fecha} - <strong>${h.grupo}</strong></span><strong>${h.accion}:</strong> ${h.detalle}`;
            historialGlobal.appendChild(div);
        });
    }

    // ==========================================
    // EXPORTACIONES
    // ==========================================

    window.exportarExcel = () => {
        if (grupos.length === 0) return mostrarToast("No hay grupos para exportar.", "error");
        const data = grupos.map(g => ({
            "Grupo": `Grupo #${g.numeroGrupo}`,
            "Categoría": g.categoria,
            "Líder (Cabeza de Grupo)": `${g.lider.nombre} ${g.lider.apellido}`,
            "Curso del Líder": g.lider.grado,
            "Tema Asignado": g.tema.tema,
            "Materia": g.tema.materia,
            "Integrantes Adicionales": g.integrantes.length > 0 ? g.integrantes.map(i => `${i.nombre} ${i.apellido} (${i.grado})`).join(' | ') : "Sin asignar"
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 60 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grupos Ciencia 2027");
        XLSX.writeFile(wb, "Reporte_Dia_Ciencia_ECOLBA2027.xlsx");
        mostrarToast("Excel descargado correctamente.");
    };

    window.exportarWord = () => {
        if (grupos.length === 0) return mostrarToast("No hay grupos para exportar.", "error");

        let htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Reporte Día de la Ciencia</title>
                <style>
                    body { font-family: 'Calibri', 'Arial', sans-serif; color: #333; line-height: 1.4; }
                    .header { text-align: center; border-bottom: 3px solid #1d1d1f; padding-bottom: 15px; margin-bottom: 30px; }
                    .header h1 { color: #1d1d1f; font-size: 26px; margin: 0; }
                    .header p { color: #666; font-size: 12px; margin-top: 5px; }
                    .grupo-card { border: 1px solid #d2d2d7; border-radius: 10px; padding: 20px; margin-bottom: 25px; background-color: #fbfbfd; page-break-inside: avoid; }
                    .grupo-card h2 { color: #1d1d1f; font-size: 18px; margin-top: 0; border-bottom: 1px solid #e8e8ed; padding-bottom: 8px; }
                    .info-row { margin-bottom: 8px; font-size: 14px; }
                    .info-row strong { color: #1d1d1f; }
                    .tag-tema { display: inline-block; background: #e8e8ed; color: #1d1d1f; padding: 5px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; margin: 10px 0; }
                    .lider-section { background: #e8f5e9; padding: 10px; border-radius: 6px; margin: 15px 0 10px 0; border-left: 4px solid #34c759; }
                    .lider-section strong { color: #2e7d32; }
                    ul { margin: 5px 0 15px 0; padding-left: 25px; font-size: 13px; }
                    li { margin-bottom: 4px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Reporte Día de la Ciencia - ECOLBA 2027</h1>
                    <p>Generado el: ${new Date().toLocaleDateString()}</p>
                </div>
        `;

        grupos.forEach(g => {
            let integrantesHTML = '';
            if (g.integrantes.length === 0) {
                integrantesHTML = '<li style="color: #999; font-style: italic;">Sin integrantes adicionales</li>';
            } else {
                g.integrantes.forEach(i => {
                    integrantesHTML += `<li>${i.nombre} ${i.apellido} (${i.grado})</li>`;
                });
            }

            htmlContent += `
                <div class="grupo-card">
                    <h2>Grupo #${g.numeroGrupo}</h2>
                    <div class="info-row"><strong>Categoría:</strong> ${g.categoria}</div>
                    <div class="tag-tema">🎯 Tema: ${g.tema.tema} (${g.tema.materia})</div>
                    
                    <div class="lider-section">
                        <div class="info-row"><strong>👑 Cabeza de Grupo (Líder):</strong></div>
                        <div style="font-size: 14px; font-weight: bold;">${g.lider.nombre} ${g.lider.apellido} (${g.lider.grado})</div>
                    </div>

                    <div class="info-row"><strong>Integrantes del equipo:</strong></div>
                    <ul>${integrantesHTML}</ul>
                </div>
            `;
        });

        htmlContent += `</body></html>`;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Reporte_Dia_Ciencia_ECOLBA2027.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarToast("Word descargado correctamente.");
    };

    window.exportarPDF = () => {
        if (grupos.length === 0) return mostrarToast("No hay grupos para exportar.", "error");
        const template = document.getElementById('pdf-template');
        let html = `
            <div class="pdf-report-container">
                <div class="pdf-header">
                    <h1>Reporte Día de la Ciencia</h1>
                    <p>ECOLBA 2027 - Generado el: ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="pdf-grid">
        `;
        grupos.forEach(g => {
            const integrantesHtml = g.integrantes.length > 0 
                ? g.integrantes.map(i => `<li>${i.nombre} ${i.apellido} (${i.grado})</li>`).join('')
                : '<li style="color: #999; font-style: italic;">Sin integrantes adicionales</li>';
            html += `
                <div class="pdf-card">
                    <h3>Grupo #${g.numeroGrupo}</h3>
                    <div class="pdf-info"><strong>Categoría:</strong> ${g.categoria}</div>
                    <div class="pdf-info"><strong>Tema:</strong> ${g.tema.tema}</div>
                    <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                        <div class="pdf-info"><strong>👑 Cabeza de Grupo:</strong></div>
                        <ul style="list-style: none; padding-left: 0;">
                            <li><strong>${g.lider.nombre} ${g.lider.apellido}</strong> (${g.lider.grado})</li>
                        </ul>
                        <div class="pdf-info"><strong>Integrantes:</strong></div>
                        <ul>${integrantesHtml}</ul>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
        template.innerHTML = html;
        template.style.display = 'block';
        const opt = { margin: [10, 10, 10, 10], filename: 'Reporte_Dia_Ciencia_ECOLBA2027.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
        html2pdf().set(opt).from(template).save().then(() => {
            template.style.display = 'none'; template.innerHTML = '';
            mostrarToast("PDF descargado correctamente.");
        });
    };

    // --- INICIALIZACIÓN ---
    actualizarUI();
});