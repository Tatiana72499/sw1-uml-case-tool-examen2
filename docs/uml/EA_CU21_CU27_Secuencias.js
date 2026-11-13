/*
 * UMLink - Diagramas de secuencia CU21-CU27
 * Enterprise Architect - JScript
 *
 * Crea CU21 en "Paquete 5 - Colaboracion en Tiempo Real".
 * Crea CU22-CU27 en "Paquete 3 - Inteligencia Artificial e Interoperabilidad".
 * No borra ni modifica diagramas existentes. Si ya existe uno de los diagramas
 * con el nombre definido abajo, ese caso se omite para evitar duplicados.
 */

function normalizar(texto)
{
    return String(texto).toLowerCase()
        .replace(/[áàä]/g, "a")
        .replace(/[éèë]/g, "e")
        .replace(/[íìï]/g, "i")
        .replace(/[óòö]/g, "o")
        .replace(/[úùü]/g, "u")
        .replace(/ñ/g, "n");
}

function buscarPaquetePorPrefijo(paquetes, prefijo)
{
    var i;
    var paquete;
    var encontrado;
    var objetivo = normalizar(prefijo);

    for (i = 0; i < paquetes.Count; i++)
    {
        paquete = paquetes.GetAt(i);

        if (normalizar(paquete.Name).indexOf(objetivo) == 0)
            return paquete;

        encontrado = buscarPaquetePorPrefijo(paquete.Packages, prefijo);
        if (encontrado != null)
            return encontrado;
    }

    return null;
}

function buscarPaquetePorTexto(paquetes, texto)
{
    var i;
    var paquete;
    var encontrado;
    var objetivo = normalizar(texto);

    for (i = 0; i < paquetes.Count; i++)
    {
        paquete = paquetes.GetAt(i);

        if (normalizar(paquete.Name).indexOf(objetivo) >= 0)
            return paquete;

        encontrado = buscarPaquetePorTexto(paquete.Packages, texto);
        if (encontrado != null)
            return encontrado;
    }

    return null;
}

function buscarDiagrama(paquete, nombre)
{
    var i;
    var diagrama;

    for (i = 0; i < paquete.Diagrams.Count; i++)
    {
        diagrama = paquete.Diagrams.GetAt(i);
        if (diagrama.Name == nombre)
            return diagrama;
    }

    return null;
}

function obtenerParticipante(paquete, nombre, tipo, estereotipo)
{
    var i;
    var elemento;

    for (i = 0; i < paquete.Elements.Count; i++)
    {
        elemento = paquete.Elements.GetAt(i);
        if (elemento.Name == nombre && elemento.Type == tipo)
            return elemento;
    }

    elemento = paquete.Elements.AddNew(nombre, tipo);
    if (estereotipo != "")
        elemento.Stereotype = estereotipo;

    if (!elemento.Update())
        throw new Error("No se pudo crear " + nombre + ": " + elemento.GetLastError());

    paquete.Elements.Refresh();
    return elemento;
}

function colocarParticipante(diagrama, elemento, x, ancho, alto)
{
    // AddNew recibe Top/Bottom positivos; EA los guarda como coordenadas negativas.
    var top = 40;
    var posicion = "l=" + x + ";r=" + (x + ancho) +
        ";t=" + top + ";b=" + (top + alto) + ";";
    var objeto = diagrama.DiagramObjects.AddNew(posicion, "");

    objeto.ElementID = elemento.ElementID;
    if (!objeto.Update())
        throw new Error("No se pudo colocar " + elemento.Name + " en el diagrama.");
}

function crearMensaje(diagrama, origen, destino, texto, numero, esRetorno)
{
    var conector = origen.Connectors.AddNew(texto, "Sequence");

    // El origen queda fijado por origen.Connectors; SupplierID es el destino.
    conector.SupplierID = destino.ElementID;
    conector.DiagramID = diagrama.DiagramID;
    conector.SequenceNo = numero;
    conector.Properties("IsReturn").Value = esRetorno;

    if (!conector.Update())
        throw new Error("No se pudo crear el mensaje '" + texto + "': " + conector.GetLastError());

    origen.Connectors.Refresh();
}

function generarDiagrama(paquete, codigo, titulo, participantes, mensajes)
{
    var nombreDiagrama = codigo + " - " + titulo + " - Secuencia v2";
    var diagrama = buscarDiagrama(paquete, nombreDiagrama);
    var elementos = [];
    var i;
    var participante;
    var elemento;
    var mensaje;

    if (diagrama != null)
    {
        Session.Output("Omitido; ya existe: " + nombreDiagrama);
        return diagrama;
    }

    diagrama = paquete.Diagrams.AddNew(nombreDiagrama, "Sequence");
    if (!diagrama.Update())
        throw new Error("No se pudo crear " + nombreDiagrama + ": " + diagrama.GetLastError());

    for (i = 0; i < participantes.length; i++)
    {
        participante = participantes[i];
        elemento = obtenerParticipante(
            paquete,
            codigo + " - " + participante[0],
            participante[1],
            participante[2]
        );
        elementos[i] = elemento;
        colocarParticipante(diagrama, elemento, 30 + (i * 210), 175, 70);
    }

    for (i = 0; i < mensajes.length; i++)
    {
        mensaje = mensajes[i];
        crearMensaje(
            diagrama,
            elementos[mensaje[0]],
            elementos[mensaje[1]],
            mensaje[2],
            i + 1,
            mensaje[3]
        );
    }

    diagrama.DiagramObjects.Refresh();
    diagrama.DiagramLinks.Refresh();

    if (!diagrama.Update())
        throw new Error("No se pudo guardar " + nombreDiagrama + ": " + diagrama.GetLastError());

    paquete.Elements.Refresh();
    paquete.Diagrams.Refresh();
    Session.Output("Creado: " + nombreDiagrama);
    return diagrama;
}

function main()
{
    var paqueteIA = buscarPaquetePorPrefijo(
        Repository.Models,
        "Paquete 3 - Inteligencia Artificial e Interoperabilidad"
    );
    var paqueteColaboracion = buscarPaquetePorPrefijo(
        Repository.Models,
        "Paquete 5 - Colaboracion en Tiempo Real"
    );

    // Admite también paquetes con el nombre funcional sin el prefijo "Paquete N".
    if (paqueteIA == null)
        paqueteIA = buscarPaquetePorTexto(Repository.Models, "Inteligencia Artificial e Interoperabilidad");
    if (paqueteColaboracion == null)
        paqueteColaboracion = buscarPaquetePorTexto(Repository.Models, "Colaboracion en Tiempo Real");

    if (paqueteIA == null || paqueteColaboracion == null)
    {
        Session.Prompt(
            "No encontre los paquetes de IA y/o Colaboracion. Revisa sus nombres en el Browser.",
            0
        );
        return;
    }

    try
    {
        // CU21 - Chat grupal identificado
        generarDiagrama(
            paqueteColaboracion,
            "CU21",
            "Participar en el chat grupal",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU chat grupal", "Object", "boundary"],
                ["CollaborationWebSocketHandler", "Object", "control"],
                ["AiChatService", "Object", "control"],
                ["ProjectAccessService", "Object", "control"],
                ["AiConversationRepository", "Object", "entity"],
                ["AiMessageRepository", "Object", "entity"],
                ["CollaborationBroadcastService", "Object", "control"],
                ["Otro miembro conectado", "Actor", ""]
            ],
            [
                [0,1,"abrirChatGrupal()",false],
                [1,2,"CHAT_SUBSCRIBE(projectId, conversationId)",false],
                [2,4,"requireMember(projectId, userId)",false],
                [4,2,"membresia validada",true],
                [2,3,"requireConversationAccess()",false],
                [3,5,"findById(conversationId)",false],
                [5,3,"conversacion grupal",true],
                [2,7,"addProject(session)",false],
                [2,1,"CHAT_PROJECT_SUBSCRIBED",true],
                [0,1,"enviarMensaje(texto)",false],
                [1,2,"CHAT_MESSAGE_SEND",false],
                [2,3,"saveGroupMessage()",false],
                [3,4,"validar miembro del proyecto",false],
                [4,3,"miembro autorizado",true],
                [3,6,"guardar mensaje con autor autenticado",false],
                [6,3,"mensaje guardado",true],
                [3,2,"mensaje persistido",true],
                [2,7,"broadcastProjectMessage()",false],
                [7,8,"CHAT_MESSAGE_CREATED",false],
                [8,0,"mostrar mensaje y autor",false]
            ]
        );

        // CU22 - Invocar IA desde el chat grupal con @IA
        generarDiagrama(
            paqueteIA,
            "CU22",
            "Invocar la IA desde el chat grupal",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU chat grupal", "Object", "boundary"],
                ["CollaborationWebSocketHandler", "Object", "control"],
                ["AiChatService", "Object", "control"],
                ["AiConversationRepository", "Object", "entity"],
                ["AiMessageRepository", "Object", "entity"],
                ["AiOrchestrator", "Object", "control"],
                ["AiFactualQueryService", "Object", "control"],
                ["AiContextService", "Object", "control"],
                ["Spring AI ChatClient / Ollama", "Object", "entity"],
                ["AiResponsePersistenceService", "Object", "control"],
                ["CollaborationBroadcastService", "Object", "control"]
            ],
            [
                [0,1,"enviar pregunta con @IA",false],
                [1,2,"CHAT_MESSAGE_SEND",false],
                [2,3,"saveGroupMessage()",false],
                [3,4,"actualizar conversacion",false],
                [4,3,"conversacion actualizada",true],
                [3,5,"guardar mensaje del usuario",false],
                [5,3,"mensaje guardado",true],
                [3,6,"solicitar generacion despues del commit",false],
                [2,11,"difundir mensaje del usuario",false],
                [11,0,"mostrar pregunta grupal",false],
                [6,7,"intentar consulta factual",false],
                [7,6,"sin respuesta factual; continuar con modelo",true],
                [6,8,"buildProjectContext()",false],
                [8,6,"contexto autorizado",true],
                [6,9,"generar respuesta contextualizada",false],
                [9,6,"respuesta del modelo",true],
                [6,10,"persistir respuesta de IA",false],
                [10,5,"guardar mensaje de IA",false],
                [5,10,"respuesta guardada",true],
                [10,6,"mensaje de IA persistido",true],
                [6,11,"difundir respuesta al grupo",false],
                [11,0,"mostrar respuesta de SW1 IA",false]
            ]
        );

        // CU23 - Conversacion privada con IA
        generarDiagrama(
            paqueteIA,
            "CU23",
            "Consultar la IA en conversacion privada",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU chat privado", "Object", "boundary"],
                ["AiChatController", "Object", "control"],
                ["AiChatService", "Object", "control"],
                ["AiConversationRepository", "Object", "entity"],
                ["AiMessageRepository", "Object", "entity"],
                ["AiOrchestrator", "Object", "control"],
                ["AiFactualQueryService", "Object", "control"],
                ["AiContextService", "Object", "control"],
                ["Spring AI ChatClient / Ollama", "Object", "entity"],
                ["AiResponsePersistenceService", "Object", "control"],
                ["CollaborationBroadcastService", "Object", "control"]
            ],
            [
                [0,1,"enviar pregunta privada",false],
                [1,2,"POST /private-chat/{id}/messages",false],
                [2,3,"requireConversationAccess()",false],
                [3,4,"findById(conversationId)",false],
                [4,3,"conversacion y propietario validados",true],
                [2,3,"sendPrivateMessage()",false],
                [3,4,"actualizar conversacion",false],
                [4,3,"actualizacion guardada",true],
                [3,5,"guardar mensaje del usuario",false],
                [5,3,"mensaje persistido",true],
                [3,6,"solicitar generacion despues del commit",false],
                [2,1,"HTTP 201 - pregunta guardada",true],
                [6,7,"intentar consulta factual",false],
                [7,6,"sin respuesta factual; continuar con modelo",true],
                [6,8,"buildProjectContext()",false],
                [8,6,"contexto privado autorizado",true],
                [6,9,"generar respuesta contextualizada",false],
                [9,6,"respuesta del modelo",true],
                [6,10,"persistir respuesta de IA",false],
                [10,5,"guardar respuesta",false],
                [5,10,"respuesta persistida",true],
                [10,6,"respuesta disponible",true],
                [6,11,"broadcastPrivateMessage()",false],
                [11,1,"CHAT_AI_MESSAGE_CREATED",false],
                [1,0,"mostrar respuesta privada",false]
            ]
        );

        // CU24 - Administrar memoria tecnica
        generarDiagrama(
            paqueteIA,
            "CU24",
            "Gestionar memoria tecnica del asistente",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU memoria IA", "Object", "boundary"],
                ["AiMemoryController", "Object", "control"],
                ["AiMemoryService", "Object", "control"],
                ["ProjectAccessService", "Object", "control"],
                ["AiMemoryRepository", "Object", "entity"],
                ["CollaborationBroadcastService", "Object", "control"]
            ],
            [
                [0,1,"abrir gestion de memoria",false],
                [1,2,"GET /ai/memory?scope=...",false],
                [2,3,"list(projectId,userId,scope)",false],
                [3,4,"requireMember()",false],
                [4,3,"membresia validada",true],
                [3,5,"buscar recuerdos activos del alcance",false],
                [5,3,"recuerdos encontrados",true],
                [3,2,"devolver recuerdos autorizados",true],
                [2,1,"mostrar recuerdos",true],
                [0,1,"crear, editar o eliminar recuerdo",false],
                [1,2,"POST, PUT o DELETE /ai/memory",false],
                [2,3,"validar alcance y contenido",false],
                [3,4,"validar rol para memoria compartida",false],
                [4,3,"operacion autorizada",true],
                [3,5,"persistir cambio de memoria",false],
                [5,3,"cambio guardado",true],
                [3,6,"difundir cambio si es memoria del proyecto",false],
                [3,2,"devolver resultado",true],
                [2,1,"mostrar confirmacion",true]
            ]
        );

        // CU25 - Analizar un diagrama UML
        generarDiagrama(
            paqueteIA,
            "CU25",
            "Analizar diagrama UML y consultar hallazgos",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU editor UML", "Object", "boundary"],
                ["AiAnalysisController", "Object", "control"],
                ["AiAnalysisService", "Object", "control"],
                ["AiAnalysisContextService", "Object", "control"],
                ["ProjectAccessService", "Object", "control"],
                ["ProjectRepository", "Object", "entity"],
                ["DiagramRepository", "Object", "entity"],
                ["AiMemoryService y UmlKnowledgeService", "Object", "control"],
                ["AiOrchestrator / Ollama", "Object", "control"]
            ],
            [
                [0,1,"solicitar analisis del diagrama",false],
                [1,2,"POST /ai/analyze?diagramId=...",false],
                [2,3,"analyze(projectId,userId,diagramId)",false],
                [3,4,"prepare(projectId,userId,diagramId)",false],
                [4,5,"requireMember()",false],
                [5,4,"acceso autorizado",true],
                [4,6,"obtener proyecto",false],
                [6,4,"datos del proyecto",true],
                [4,7,"obtener diagrama y modelo canonico",false],
                [7,4,"modelo UML persistido",true],
                [4,8,"agregar memorias y conocimiento UML",false],
                [8,4,"contexto de analisis preparado",true],
                [4,3,"contexto validado",true],
                [3,9,"submitPrompt() para analizar el modelo",false],
                [9,3,"respuesta estructurada del modelo",true],
                [3,2,"validar y devolver hallazgos",true],
                [2,1,"mostrar resumen, severidad y recomendaciones",true]
            ]
        );

        // CU26 - Sugerencias opcionales
        generarDiagrama(
            paqueteIA,
            "CU26",
            "Obtener sugerencias de mejora opcionales",
            [
                ["Miembro del proyecto", "Actor", ""],
                ["IU editor UML", "Object", "boundary"],
                ["AiSuggestionController", "Object", "control"],
                ["AiSuggestionService", "Object", "control"],
                ["AiAnalysisContextService", "Object", "control"],
                ["AiOrchestrator / Ollama", "Object", "control"],
                ["AiSuggestionSemanticValidator", "Object", "control"]
            ],
            [
                [0,1,"solicitar sugerencias",false],
                [1,2,"POST /ai/suggestions",false],
                [2,3,"suggest(projectId,userId,diagramId)",false],
                [3,4,"prepare() y obtener contexto UML autorizado",false],
                [4,3,"prompt y referencias de elementos",true],
                [3,5,"submitPrompt() para generar sugerencias",false],
                [5,3,"respuesta JSON del modelo",true],
                [3,6,"validar categorias, elementos y limite de sugerencias",false],
                [6,3,"sugerencias validas",true],
                [3,2,"devolver maximo tres sugerencias",true],
                [2,1,"mostrar sugerencias sin cambiar el diagrama",true],
                [0,1,"descartar sugerencias",false],
                [1,0,"confirmar descarte",true]
            ]
        );

        // CU27 - Proponer y aplicar cambios UML confirmados por el usuario
        generarDiagrama(
            paqueteIA,
            "CU27",
            "Preparar y aplicar propuestas de cambio UML",
            [
                ["Propietario o editor", "Actor", ""],
                ["IU editor UML", "Object", "boundary"],
                ["AiChangeProposalController", "Object", "control"],
                ["AiChangeProposalService", "Object", "control"],
                ["AiChangeProposalContextService", "Object", "control"],
                ["DiagramRepository", "Object", "entity"],
                ["ProjectAccessService", "Object", "control"],
                ["AiOrchestrator / Ollama", "Object", "control"],
                ["AiChangeProposalApplyService", "Object", "control"],
                ["PersistentDiagramOperationService", "Object", "control"],
                ["AiChangeProposalApplicationRepository", "Object", "entity"],
                ["CollaborationBroadcastService", "Object", "control"]
            ],
            [
                [0,1,"solicitar propuestas de cambio",false],
                [1,2,"POST /ai/change-proposals",false],
                [2,3,"propose(projectId,userId,diagramId,request)",false],
                [3,4,"capturar modelo y version actuales",false],
                [4,6,"validar acceso al proyecto",false],
                [6,4,"acceso autorizado",true],
                [4,5,"obtener diagrama y modelo persistido",false],
                [5,4,"snapshot del diagrama",true],
                [4,3,"prompt con instrucciones y snapshot",true],
                [3,7,"submitPrompt() para preparar propuestas",false],
                [7,3,"propuestas estructuradas",true],
                [3,2,"validar propuestas y version",true],
                [2,1,"mostrar vista previa editable",true],
                [0,1,"seleccionar y confirmar operaciones",false],
                [1,2,"POST /ai/change-proposals/apply",false],
                [2,8,"apply(projectId,userId,request)",false],
                [8,6,"validar rol OWNER o EDITOR",false],
                [6,8,"permiso validado",true],
                [8,9,"ejecutar operaciones UML validadas",false],
                [9,10,"guardar aplicacion idempotente",false],
                [10,9,"aplicacion registrada",true],
                [9,11,"difundir operaciones y nuevo estado",false],
                [8,2,"resultado y nueva version",true],
                [2,1,"actualizar diagrama",true]
            ]
        );

        Repository.RefreshModelView(paqueteIA.PackageID);
        Repository.RefreshModelView(paqueteColaboracion.PackageID);

        Session.Prompt(
            "Proceso terminado. Revisa la salida de Scripting para ver los diagramas creados u omitidos.",
            0
        );
    }
    catch (e)
    {
        Session.Prompt("Error: " + e.message, 0);
        Session.Output("Error detallado: " + e.message);
    }
}

main();
