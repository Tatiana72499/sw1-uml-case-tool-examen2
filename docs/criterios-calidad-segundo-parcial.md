# Criterios de calidad y mejoras del segundo parcial

## Alcance

Este documento establece los criterios de aceptación para la herramienta CASE UML web y su colaboración con IA. La fuente de verdad del diagrama es el modelo canónico; todas las entradas (edición manual, IA, voz, fotografía e XMI) deben convertirse en operaciones semánticas validadas.

## CF-01 Edición directa de clases UML
- El usuario puede crear y editar nombre, condición abstracta, apariencia, atributos, métodos y parámetros desde la tarjeta de la clase, sin depender del inspector lateral.
- El cambio de nombre está disponible mediante un control visible y doble clic; se aplica al modelo canónico con RENAME_CLASS y muestra errores de validación junto al campo.
- Los atributos permiten editar nombre, tipo, visibilidad, estático, constante, valor inicial y clave primaria.
- Los métodos permiten editar nombre, tipo de retorno, visibilidad, estático y parámetros desde la tarjeta.
- Guardar aplica operaciones UML válidas y las distribuye a los colaboradores; cancelar descarta el borrador.
- Campos obligatorios, nombres duplicados y conflictos se informan junto al elemento.

## CF-02 Facilidad de uso del editor
- Las barras de herramientas e inspector se pueden plegar y recuperar en escritorio y móvil.
- El lienzo usa el espacio liberado inmediatamente y los controles tienen etiquetas accesibles.
- Arrastrar una clase requiere un movimiento inicial pequeño, mantiene el puntero capturado hasta soltar y muestra el movimiento antes de guardar.
- El editor da feedback de guardado, error, conexión y modo de solo lectura.
- Las acciones frecuentes son alcanzables con teclado y áreas táctiles adecuadas.

## CF-03 Importación de imagen desde chat
- El chat ofrece acceso a cámara/selección de imagen y reutiliza el flujo existente de importación UML.
- Antes de aplicar, se informa que la imagen puede reemplazar o modificar el diagrama y se requiere confirmación explícita.
- La imagen y el resultado pasan las validaciones del servidor y se traducen al modelo canónico.
- El servidor autoritativo publica el nuevo estado a los integrantes conectados del proyecto.

## CF-04 Chat de proyecto e IA concurrente
- Varios usuarios autenticados pueden enviar mensajes al chat grupal simultáneamente.
- El servidor identifica al autor, valida membresía y persiste cada mensaje con identificador idempotente.
- Las respuestas de IA se generan en el servidor y se transmiten a todos los miembros conectados por WebSocket.
- La generación se encola según la capacidad de inferencia configurada; el servicio local puede procesar en serie y la interfaz informa espera, error o saturación.
- Los mensajes privados no se transmiten al grupo.

## CF-05 IA con contexto y criterios UML
- La IA usa el alcance elegido (diagrama o proyecto), memoria permitida y conocimiento técnico UML 2.5+.
- Debe distinguir hechos del modelo, inferencias y preguntas pendientes; no inventa clases, relaciones ni requisitos.
- Las sugerencias cubren estructura, nombres, tipos, responsabilidades, relaciones, multiplicidades, cohesión, acoplamiento y consistencia.
- Las propuestas de cambio son explicables, revisables y requieren validación/confirmación antes de aplicarse.
- El comportamiento se logra mediante instrucciones, contexto recuperado y conocimiento versionado; no implica reentrenar los pesos del modelo.

## CF-06 Respuesta de IA por voz
- Cada respuesta de IA puede leerse mediante síntesis de voz del navegador cuando esté disponible; las consultas dictadas al asistente reproducen la respuesta recibida.
- El usuario puede detener la lectura y recibe una indicación accesible de disponibilidad.
- El texto de la respuesta sigue disponible y la función no altera el contenido del chat.

## NFR-01 Rendimiento
- La UI debe seguir interactiva mientras se solicita análisis o inferencia.
- Los límites de contexto, cola y tiempo de espera son configurables y acordes al modelo/recursos del despliegue.
- El rendimiento se mide en el hardware de despliegue; no se garantiza una latencia fija para inferencia local.

## NFR-02 Seguridad y privacidad
- La autorización se verifica en el servidor para proyecto, diagrama, chat e importaciones.
- Secretos de proveedores permanecen en servidor/gestor de secretos y nunca en el bundle web ni en Git.
- Conversaciones privadas, de proyecto y memorias conservan su ámbito de acceso.

## NFR-03 Confiabilidad y colaboración
- Las operaciones UML semánticas incluyen identificador, diagrama, autor, versión base, tipo y payload; el servidor valida versión y semántica, mantiene el estado autoritativo y comunica los cambios.
- El movimiento del canvas usa vistas previas efímeras por WebSocket y persiste la posición final en viewState sin incrementar versión ni crear historial. Al reconectar, se sincroniza el estado visual actual.
- Las reconexiones y errores no deben borrar borradores del usuario.

## Verificación

Para cada criterio se debe verificar aceptación funcional, accesibilidad básica, autorización, estados de error, integración colaborativa y compatibilidad con despliegue web. La IA debe evaluarse con diagramas de distintos tamaños y casos UML válidos e inválidos; su salida es asistencia y requiere revisión humana antes de aplicar cambios.

## Estado de implementación

Registrar por criterio: Pendiente, En desarrollo, Implementado o Verificado; incluir versión, escenario, evidencia, resultado y responsable. No marcar como verificado hasta probarlo con al menos dos cuentas conectadas y el backend de despliegue.

## CF-07 Integridad de claves y asociaciones muchos a muchos
- Cada clase admite como máximo un atributo marcado como clave primaria; el editor lo impide de inmediato y el servidor vuelve a validar toda operación, incluida la entrada de IA o importaciones.
- Una relación UML de asociación con multiplicidad de muchos en ambos extremos se conserva como asociación en el modelo canónico y, al generar el backend, produce una entidad intermedia con dos referencias obligatorias y restricción única para el par de referencias.
- La entidad intermedia generada se incluye en el esquema de ejecución y artefactos del backend; no se inserta como clase visible en el diagrama canónico.
- Una clase de asociación UML explícitamente vinculada a la relación sirve como entidad intermedia y evita generar otra duplicada.
- No se permite modelar una composición muchos a muchos; debe usarse asociación para esa cardinalidad.

## CF-08 Edición de cardinalidad desde el diagrama
- En asociaciones, cada etiqueta de extremo es interactiva y abre un control en el lienzo para cambiar esa cardinalidad sin depender del inspector. Agregación y composición no muestran ni exponen controles de cardinalidad en el editor.
- El control permite 1..1, 0..1, 0..*, 1..* y multiplicidades personalizadas; el guardado usa la operación semántica existente, valida en servidor y se sincroniza con los colaboradores.
- El control se puede usar con teclado, detener propagación del arrastre y comunicar guardado, error y cancelación.

## CF-09 Chat de IA como mentor técnico
- El chat privado y el grupal permiten pedir validaciones, sugerencias de mejora y propuestas de cambios con lenguaje natural; en el chat grupal la consulta se invoca con @ia.
- La respuesta de validación prioriza hallazgos por severidad e incluye evidencia del modelo; las mejoras ofrecen alternativas concretas y tradeoffs; las propuestas detallan estado actual, cambio sugerido, impacto y riesgos.
- La IA enseña y explica el razonamiento técnico de forma resumida, solicita contexto de negocio cuando haga falta y distingue hechos, inferencias y supuestos.
- Una propuesta textual no modifica el modelo canónico. Para aplicarla se usa el flujo existente de propuesta, revisión y confirmación.

## CF-10 Resiliencia de operaciones colaborativas
- Ante conflicto de versión el editor obtiene el estado autoritativo, actualiza la versión local y vuelve a habilitar la colaboración.
- Los cambios idempotentes de abstracción pueden reintentarse una vez con la última versión; los demás conflictos explican que debe revisarse y reintentarse la edición.
- Los rechazos WebSocket muestran su causa (versión, permisos o validación) en lugar de ocultarla tras un mensaje genérico.

## CF-11 Umbral de pruebas por funcionalidad
- Cada funcionalidad modificada requiere una matriz de al menos 100 casos significativos entre escenarios positivos, negativos, límites, autorización, concurrencia y recuperación.
- Los casos se ejecutan y reportan; no se acepta rellenar el conteo con duplicados sin valor ni declarar pruebas no ejecutadas como aprobadas.
- Si no se completan los 100 casos en una iteración, se registra el subconjunto ejecutado y se deja pendiente la verificación completa.

## CF-12 Asociación muchos a muchos con clase intermedia visible
- Al guardar una asociación UML con multiplicidad de muchos en ambos extremos, el editor crea una clase intermedia visible como clase de asociación y la vincula a la relación mediante una operación semántica validada.
- El nombre de la clase intermedia no colisiona con las clases existentes; si la relación ya tiene clase de asociación, no se duplica.
- Las asociaciones muchos a muchos existentes sin clase intermedia muestran una acción explícita para crearla.
- La clase intermedia se comparte con los colaboradores y se utiliza como entidad puente al generar Spring Boot.

## CF-13 Cardinalidades solo en relaciones que las usan
- El canvas muestra cardinalidades para asociación, agregación y composición, y las oculta para herencia y dependencia.
- La herramienta no inventa multiplicidades para tipos de relación que no las admiten; las propiedades de cardinalidad solo aparecen cuando el tipo las soporta.

## CF-14 Verificación de capacidades de IA
- Las pruebas cubren el chat privado, @ia en grupo, análisis, sugerencias, propuestas revisables, voz e importación/actualización desde imagen, incluyendo errores de modelo ausente, proveedor fuera de línea, timeout y salida inválida.
- No se cuentan como resultados de una instancia las pruebas de otra modalidad; se registran ejecuciones del modelo real por separado de pruebas con proveedor simulado.

## CF-15 Importación XMI desde Enterprise Architect
- El acceso «Importar diagrama» abre el flujo de importación, no la lista general de proyectos.
- Se aceptan exportaciones UML/XMI `.xmi` y `.xml`; no se aceptan archivos de proyecto nativos `.qea` o `.eap` como si fueran XMI.
- El usuario elige un proyecto editable y puede crear un diagrama nuevo o seleccionar uno existente; reemplazar requiere confirmación explícita.
- Antes de guardar se muestra una vista previa con clases, atributos, métodos, relaciones, clases de asociación y avisos del parser.
- El modelo XMI se valida en servidor y se guarda en el modelo canónico; el flujo conserva autorización y control de versión.
- Se comprueban exportaciones Enterprise Architect para clases vacías, tipos de datos, operaciones, asociaciones, multiplicidades, agregación, composición, herencia, dependencia y clases de asociación.