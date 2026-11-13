!INC Local Scripts.EAConstants-JScript

/*
 * UMLink - CU20 Consultar a la IA como asistente técnico y mentor
 * Enterprise Architect - JScript
 *
 * Crea una versión corregida del diagrama de comunicación para la consulta privada a la IA.
 * El actor representa a cualquiera de los miembros autorizados A1, A2 o A3.
 * El flujo de invocación grupal con @IA se documenta aparte en CU22.
 * No borra ni modifica diagramas existentes.
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

function buscarPaquete(paquetes, texto)
{
	var i;
	var paquete;
	var resultado;
	var objetivo = normalizar(texto);

	for (i = 0; i < paquetes.Count; i++)
	{
		paquete = paquetes.GetAt(i);
		if (normalizar(paquete.Name).indexOf(objetivo) >= 0)
			return paquete;

		resultado = buscarPaquete(paquete.Packages, texto);
		if (resultado != null)
			return resultado;
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

function obtenerElemento(paquete, codigo, nombre, tipo, estereotipo)
{
	var i;
	var elemento;
	var nombreCompleto = codigo + " - " + nombre;

	for (i = 0; i < paquete.Elements.Count; i++)
	{
		elemento = paquete.Elements.GetAt(i);
		if (elemento.Name == nombreCompleto && elemento.Type == tipo)
			return elemento;
	}

	elemento = paquete.Elements.AddNew(nombreCompleto, tipo);
	if (estereotipo != "")
		elemento.Stereotype = estereotipo;
	if (!elemento.Update())
		throw new Error("No se pudo crear '" + nombreCompleto + "': " + elemento.GetLastError());
	paquete.Elements.Refresh();
	return elemento;
}

function colocarElemento(diagrama, elemento, x, y, ancho, alto)
{
	// EA recibe coordenadas positivas y las convierte al sistema interno del diagrama.
	var geometria = "l=" + x + ";r=" + (x + ancho) + ";t=" + y + ";b=" + (y + alto) + ";";
	var objeto = diagrama.DiagramObjects.AddNew(geometria, "");
	objeto.ElementID = elemento.ElementID;
	if (!objeto.Update())
		throw new Error("No se pudo colocar '" + elemento.Name + "' en el diagrama.");
}

function obtenerAsociacion(origen, destino, diagrama)
{
	var i;
	var conector;

	for (i = 0; i < origen.Connectors.Count; i++)
	{
		conector = origen.Connectors.GetAt(i);
		if (conector.Type == "Association" &&
			((conector.ClientID == origen.ElementID && conector.SupplierID == destino.ElementID) ||
			 (conector.ClientID == destino.ElementID && conector.SupplierID == origen.ElementID)) &&
			conector.DiagramID == diagrama.DiagramID)
			return conector;
	}
	for (i = 0; i < destino.Connectors.Count; i++)
	{
		conector = destino.Connectors.GetAt(i);
		if (conector.Type == "Association" &&
			((conector.ClientID == origen.ElementID && conector.SupplierID == destino.ElementID) ||
			 (conector.ClientID == destino.ElementID && conector.SupplierID == origen.ElementID)) &&
			conector.DiagramID == diagrama.DiagramID)
			return conector;
	}

	conector = origen.Connectors.AddNew("", "Association");
	conector.SupplierID = destino.ElementID;
	conector.DiagramID = diagrama.DiagramID;
	if (!conector.Update())
		throw new Error("No se pudo crear la asociación entre '" + origen.Name + "' y '" + destino.Name + "': " + conector.GetLastError());
	origen.Connectors.Refresh();
	return conector;
}

function crearMensaje(origen, destino, diagrama, secuencia, texto, retorno)
{
	var asociacion = obtenerAsociacion(origen, destino, diagrama);
	var mensaje = origen.Connectors.AddNew(secuencia + ": " + texto, "Collaboration");
	mensaje.SupplierID = destino.ElementID;
	mensaje.DiagramID = diagrama.DiagramID;
	mensaje.Properties("IsReturn").Value = retorno;
	if (!mensaje.Update())
		throw new Error("No se pudo crear el mensaje '" + secuencia + " " + texto + "': " + mensaje.GetLastError());
	// En EA el mensaje es un connector Collaboration asociado a la Association
	// desde ClientEnd.Aggregation. Un connector Sequence agrega la notación de
	// línea de vida de un diagrama de secuencia, que fue la causa del resultado anterior.
	mensaje.ClientEnd.Aggregation = asociacion.ConnectorID;
	if (!mensaje.ClientEnd.Update())
		throw new Error("No se pudo vincular el mensaje con su asociación.");
	origen.Connectors.Refresh();
}

function agregarInteraccion(origen, destino, diagrama, secuencia, texto, retorno)
{
	// EA requiere primero una asociación entre los objetos y luego los mensajes.
	obtenerAsociacion(origen, destino, diagrama);
	crearMensaje(origen, destino, diagrama, secuencia, texto, retorno);
}

function generar()
{
	var paquete = buscarPaquete(Repository.Models, "Inteligencia Artificial e Interoperabilidad");
	var nombreDiagrama = "CU20 - Consultar a la IA como asistente técnico y mentor - Comunicación corregida";
	var diagrama;
	var elementos = [];
	var participantes = [
		["Miembro del proyecto (A1/A2/A3)", "Actor", "", 35, 215, 145, 65],
		["Interfaz de chat privado", "Object", "boundary", 220, 215, 165, 65],
		["AiChatController", "Object", "control", 440, 215, 145, 65],
		["AiChatService", "Object", "control", 650, 215, 140, 65],
		["AiConversationRepository", "Object", "entity", 650, 75, 170, 65],
		["AiMessageRepository", "Object", "entity", 900, 350, 165, 65],
		["AiOrchestrator", "Object", "control", 900, 215, 145, 65],
		["AiFactualQueryService", "Object", "control", 900, 75, 180, 65],
		["AiContextService", "Object", "control", 1130, 215, 150, 65],
		["Proveedor Ollama (ChatClient)", "Object", "", 1350, 215, 180, 65],
		["AiResponsePersistenceService", "Object", "control", 1130, 350, 190, 65],
		["CollaborationBroadcastService", "Object", "control", 1350, 350, 190, 65]
	];
	var interacciones = [
		[0, 1, "1", "Escribir pregunta", false],
		[1, 2, "1.1", "Enviar pregunta privada", false],
		[2, 3, "1.2", "Validar acceso y registrar solicitud", false],
		[3, 4, "1.2.1", "Buscar/crear conversación", false],
		[4, 3, "1.2.2", "Devolver conversación", true],
		[3, 5, "1.3", "Guardar mensaje del integrante", false],
		[3, 6, "2", "Encolar generación al confirmar transacción", false],
		[6, 7, "2.1", "Consultar datos UML para responder", false],
		[7, 6, "2.1.1", "Devolver respuesta factual si corresponde", true],
		[6, 8, "2.2", "Construir contexto autorizado", false],
		[8, 6, "2.2.1", "Devolver contexto técnico", true],
		[6, 9, "2.3", "Solicitar respuesta al modelo", false],
		[9, 6, "2.3.1", "Devolver respuesta generada", true],
		[6, 10, "3", "Guardar respuesta de la IA", false],
		[10, 5, "3.1", "Persistir respuesta vinculada a la pregunta", false],
		[10, 11, "3.2", "Difundir respuesta privada", false],
		[11, 1, "3.3", "Mostrar respuesta", false]
	];
	var i;
	var p;
	var it;

	if (paquete == null)
	{
		Session.Prompt("No encontré el paquete 'Inteligencia Artificial e Interoperabilidad'. Revisa su nombre en el Browser.", 0);
		return;
	}

	diagrama = buscarDiagrama(paquete, nombreDiagrama);
	if (diagrama != null)
	{
		Session.Prompt("El diagrama ya existe y no se modificó:\n" + nombreDiagrama, 0);
		return;
	}

	// EA representa los diagramas de comunicación mediante el tipo Analysis.
	diagrama = paquete.Diagrams.AddNew(nombreDiagrama, "Analysis");
	if (!diagrama.Update())
		throw new Error("No se pudo crear el diagrama: " + diagrama.GetLastError());

	for (i = 0; i < participantes.length; i++)
	{
		p = participantes[i];
		elementos[i] = obtenerElemento(paquete, "CU20", p[0], p[1], p[2]);
		colocarElemento(diagrama, elementos[i], p[3], p[4], p[5], p[6]);
	}

	for (i = 0; i < interacciones.length; i++)
	{
		it = interacciones[i];
		agregarInteraccion(elementos[it[0]], elementos[it[1]], diagrama, it[2], it[3], it[4]);
	}

	diagrama.DiagramObjects.Refresh();
	diagrama.DiagramLinks.Refresh();
	paquete.Elements.Refresh();
	paquete.Diagrams.Refresh();
	Repository.RefreshModelView(paquete.PackageID);
	Repository.OpenDiagram(diagrama.DiagramID);
	Session.Prompt("Diagrama de comunicación CU20 creado en:\n" + paquete.Name, 0);
}

function main()
{
	try
	{
		generar();
	}
	catch (e)
	{
		Session.Prompt("Error al generar el diagrama CU20:\n" + e.message, 0);
	}
}

main();
