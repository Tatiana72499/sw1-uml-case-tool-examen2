Este es un proyecto de SW1.

No cambiar tecnologías sin autorización.

El modelo canónico es la fuente de verdad semántica.

No generar Java directamente con IA.

Todo cambio UML debe convertirse a operaciones válidas.

Toda relación debe validarse antes de generar Spring.

Spring generado:
Entity
Repository
Service
Controller
DTO únicamente si corresponde.

N:M se normaliza mediante entidad puente.

Dependency no genera FK.

La colaboración usa WebSocket, operaciones atómicas,
versionado y servidor autoritativo.

Después de modificar código:
compilar y ejecutar las pruebas correspondientes.
La aplicación principal y el backend Spring Boot generado son dos sistemas distintos.

No confundir:
1. Backend de la herramienta CASE.
2. Backend Spring Boot generado desde UML.

Toda entrada UML debe terminar en el mismo modelo canónico:
- Manual
- IA texto
- Voz
- Fotografía
- XMI

La IA no modifica directamente el estado visual del editor.
Debe producir operaciones semánticas que se aplican al modelo canónico.

La colaboración debe permitir edición concurrente real.
No sincronizar reemplazando el JSON completo del diagrama en cada cambio.

Toda operación semántica versionada debe contemplar:
- operationId
- diagramId
- userId
- baseVersion
- tipo de operación
- payload

Política de verificación solicitada por el equipo:
- Para cada funcionalidad modificada, preparar una matriz de al menos 100 casos de prueba significativos que cubra éxito, errores, límites, permisos, concurrencia y recuperación; usar pruebas parametrizadas cuando sea apropiado.
- Ejecutar y reportar el resultado real de cada caso. No simular ni afirmar que se ejecutaron 100 pruebas si no se hizo.
- Si el costo o la infraestructura impide completar los 100 casos en una iteración, ejecutar el subconjunto enfocado disponible, registrar el faltante y no marcar la funcionalidad como verificada.

El movimiento del canvas se sincroniza por WebSocket como vista previa y se persiste al soltar en viewState, sin incrementar versión ni registrar historial. El servidor es la autoridad final del estado colaborativo.

Nunca guardar claves API, contraseñas reales o secretos en Git.

Antes de implementar una nueva funcionalidad:
1. Revisar arquitectura existente.
2. Explicar qué archivos se modificarán.
3. Mantener compatibilidad con el modelo canónico.

Después de implementar:
1. Compilar.
2. Ejecutar pruebas.
3. Reportar archivos modificados.
4. Reportar errores pendientes.
5. Informar cuántos casos se ejecutaron respecto de los 100 requeridos por funcionalidad y cuáles quedaron pendientes.
Interacción y usabilidad del editor:
- La tarjeta UML debe permitir crear y modificar nombre, abstracción, apariencia, atributos, métodos y parámetros sin obligar al usuario a usar el inspector.
- El inspector puede mantenerse como alternativa, pero no debe ser el único camino para ninguna propiedad editable de una clase.
- Todos los cambios siguen las operaciones semánticas existentes sobre el modelo canónico y la colaboración versionada.
- Controles dentro de la tarjeta deben detener eventos de arrastre, tener etiquetas accesibles, permitir cancelar borradores y mostrar errores junto al elemento.
- Mantener actualizados los criterios de aceptación en docs/criterios-calidad-segundo-parcial.md cuando cambie el alcance de segundo parcial.

Integridad del modelo UML:
- No aceptar más de un atributo marcado como clave primaria por clase; validar tanto en la interfaz como en CanonicalModelValidator.
- En generación Spring, las asociaciones muchos a muchos elegibles producen una entidad puente con referencias únicas como pareja. Las clases de asociación explícitas reemplazan esa entidad generada.
- No generar entidades puente para composiciones muchos a muchos.
