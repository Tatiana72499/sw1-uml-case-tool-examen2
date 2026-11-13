# Secciones introductorias actualizadas para el segundo parcial

## Introducción

La Ingeniería de Software busca organizar y mejorar el proceso de construcción
de sistemas mediante métodos, modelos, herramientas y buenas prácticas que
permitan desarrollar software estructurado, mantenible y confiable. Dentro de
este contexto, UML y las herramientas CASE permiten representar la estructura
de un sistema y apoyar distintas actividades del proceso de desarrollo.

El presente proyecto consiste en una herramienta CASE colaborativa para crear
diagramas UML de clases y generar software a partir de esos modelos. La
solución se desarrolla en dos repositorios coordinados: una aplicación web
Angular con backend Spring Boot, que proporciona el editor CASE y la
colaboración, y una aplicación móvil genérica Flutter, que consume los
backends generados mediante un esquema de metadatos (`runtime-schema`). La
herramienta web permite definir clases, atributos, métodos y relaciones UML,
importar y exportar modelos mediante XMI y generar un backend basado en Spring
Boot, JPA/Hibernate y PostgreSQL.

La solución conserva las capacidades del primer parcial, entre ellas la
colaboración en tiempo real, el funcionamiento móvil offline, la sincronización
de operaciones y el reconocimiento de voz. En el segundo parcial se amplía la
asistencia con inteligencia artificial: se incorporan conversaciones privadas
y grupales con identificación de autores, contexto del proyecto o del diagrama,
análisis UML, sugerencias opcionales y propuestas de cambio que requieren
revisión humana.

La IA de la aplicación web utiliza Ollama, configurable desde el despliegue del
backend. En el repositorio móvil se dispone de interpretación local de comandos
mediante llama.cpp y un modelo Qwen3-0.6B en formato GGUF. Este modelo móvil
asiste en operaciones sobre el runtime; no es el mismo asistente técnico que
responde en el chat web. La integración de un proveedor externo compatible con
Google Colab continúa pendiente.

El desarrollo toma como referencia el Proceso Unificado de Desarrollo de
Software (PUDS), dirigido por casos de uso, centrado en la arquitectura e
iterativo e incremental. Este documento actualiza la introducción, problemática,
solución, objetivos, alcance y limitaciones del informe inicial para reflejar
el trabajo documentado hasta el segundo parcial.

## 1.1. Problemática

En el desarrollo de software, los modelos permiten representar de forma
abstracta la estructura de un sistema antes de su implementación. Los
diagramas de clases UML documentan clases, atributos, operaciones y relaciones.
Sin embargo, suele existir una separación entre el modelo diseñado y el código
implementado, lo que obliga a interpretar nuevamente información ya definida y
puede producir trabajo repetido, inconsistencias y mayor esfuerzo de
mantenimiento.

También se presentan dificultades cuando los integrantes de un equipo
necesitan compartir decisiones técnicas, comprender el modelo creado por otras
personas o recibir orientación sin perder el contexto del proyecto. Un chat
genérico no necesariamente conoce las clases, relaciones, convenciones y
decisiones que ya están registradas en el sistema. Además, las respuestas
generadas por IA pueden sugerir elementos que no existen o presentar supuestos
del negocio como hechos.

Por ello, el proyecto requiere una herramienta CASE que use el modelo UML
persistido como fuente de información, mantenga la colaboración y proporcione
asistencia técnica contextualizada. Las recomendaciones de IA deben poder
revisarse y no deben alterar directamente el modelo canónico. La solución
también debe distinguir la asistencia conversacional de la interpretación local
de comandos que ofrece la aplicación móvil.

## 1.2. Solución propuesta

Se propone una herramienta CASE colaborativa que mantiene un modelo semántico
canónico como fuente de verdad para la información UML. Permite crear proyectos
y diagramas, definir clases, atributos, métodos y relaciones de asociación,
agregación, composición, herencia, dependencia, recursividad y clases de
asociación. El modelo se utiliza para representar el diagrama y generar
componentes de software.

El generador produce un backend basado en Spring Boot con entidades,
repositorios, servicios y controladores, además de las estructuras de
persistencia definidas para el sistema. Un `runtime-schema` describe entidades
y relaciones para que la aplicación Flutter pueda adaptar sus pantallas y
operaciones al backend generado. El runtime móvil admite operaciones CRUD,
relaciones entre entidades, almacenamiento local y sincronización cuando vuelve
la conexión.

La ampliación del segundo parcial añade un asistente técnico integrado con el
proyecto. El chat grupal muestra quién envía cada mensaje y permite solicitar
respuestas de IA mediante `@IA`; el chat privado conserva la conversación del
usuario. El integrante puede elegir si el contexto de la consulta corresponde
al diagrama actual o al proyecto. El backend construye ese contexto con datos
persistidos y aplica controles de acceso.

El editor también permite analizar un diagrama y consultar hallazgos
estructurados, generar sugerencias opcionales y preparar propuestas acotadas
para agregar, renombrar o cambiar el tipo de atributos. Las propuestas se
muestran para revisión, edición o descarte; no se aplican automáticamente. La
IA móvil local interpreta comandos sobre el `runtime-schema` y valida la
intención antes de ejecutar operaciones compatibles.

## 1.3. Objetivo general

Desarrollar y ampliar una herramienta CASE colaborativa que permita modelar
sistemas mediante diagramas UML de clases y transformarlos en estructuras de
software, integrando colaboración en tiempo real, generación automática de
backend, una aplicación móvil genérica y asistencia de inteligencia artificial
contextualizada para apoyar el diseño y el trabajo del equipo.

## 1.4. Objetivos específicos

- Mantener un editor web para crear y modificar diagramas UML de clases.
- Representar clases, atributos, métodos, multiplicidades y relaciones UML en
  un modelo semántico canónico.
- Facilitar la colaboración en tiempo real y mostrar la identidad del autor en
  los mensajes grupales.
- Importar y exportar modelos mediante XMI para los elementos soportados.
- Generar un backend Spring Boot a partir del modelo UML, con persistencia
  mediante JPA/Hibernate y PostgreSQL.
- Generar el `runtime-schema` que permite a la aplicación Flutter interpretar
  entidades, atributos y relaciones.
- Mantener las operaciones móviles CRUD, el almacenamiento local y la
  sincronización posterior al trabajo offline.
- Proporcionar reconocimiento de voz e interpretación local de comandos en el
  runtime móvil, validando las intenciones contra el esquema disponible.
- Incorporar chat privado con IA y chat grupal con autor identificado e
  invocación de IA mediante `@IA`.
- Construir el contexto del asistente desde datos autorizados del proyecto o
  del diagrama seleccionado.
- Permitir analizar diagramas UML, revisar sugerencias y consultar propuestas
  de cambio sin modificar el modelo canónico de manera automática.
- Configurar Ollama para el asistente web desde el entorno de despliegue y
  mantener la opción de IA local disponible en el runtime móvil.
- Evaluar la integración de proveedores externos compatibles con servicios de
  modelos alojados, requisito que aún no está implementado en el chat web.
- Validar el sistema mediante pruebas unitarias, de integración y casos
  prácticos definidos para los subsistemas web y móvil.

## 1.5. Alcance

El proyecto comprende dos subsistemas relacionados. El primero es la
herramienta CASE web, enfocada en administrar proyectos y modelar diagramas de
clases UML. Permite definir clases, atributos, métodos y relaciones, colaborar
sobre diagramas, importar o exportar XMI y generar un backend Spring Boot a
partir del modelo canónico.

El segundo subsistema es una aplicación Flutter genérica que utiliza el
`runtime-schema` generado para presentar y operar sobre diferentes sistemas.
Incluye operaciones CRUD, resolución de relaciones, almacenamiento local y
sincronización de operaciones realizadas sin conexión. También incorpora
reconocimiento de voz offline e interpretación local de comandos mediante un
modelo GGUF ejecutado con el binding Android de llama.cpp.

Para el segundo parcial, el alcance de la herramienta web incluye un chat
persistente grupal y otro privado, identificación de autores, respuestas de IA
en privado o mediante `@IA` en el grupo, contexto seleccionable del proyecto o
del diagrama, y memoria explícita de ámbito privado o compartido. El editor
incluye análisis UML, sugerencias opcionales y vistas previas de propuestas
limitadas a atributos. Toda modificación del modelo continúa sujeta a las
operaciones normales y validaciones del editor.

La IA conversacional web utiliza Spring AI con un servicio Ollama cuyo endpoint
y modelo se configuran desde el despliegue. La opción local de la aplicación
móvil está implementada por separado para interpretar comandos del runtime.
El uso de un proveedor externo compatible con Google Colab es un requisito
identificado, pero queda fuera de lo implementado actualmente en el chat web.

## 1.6. Limitaciones

El sistema se orienta principalmente a diagramas UML de clases; no pretende
cubrir todos los tipos de diagramas UML. La generación automática está enfocada
en una arquitectura backend previamente definida basada en Spring Boot,
JPA/Hibernate y PostgreSQL, y no genera cualquier arquitectura o tecnología
seleccionada libremente.

La aplicación móvil es genérica y se adapta a los sistemas mediante metadatos;
no sustituye interfaces móviles diseñadas específicamente para dominios con
necesidades de interacción particulares. Las funciones colaborativas en tiempo
real necesitan conectividad. Las operaciones offline móviles se sincronizan
cuando se recupera la conexión.

La IA depende de la capacidad del modelo, el hardware disponible y el contexto
que puede proporcionarse a cada solicitud. El modelo local móvil está destinado
a interpretar comandos del runtime y no ofrece las mismas funciones que el
asistente técnico del chat web. En el chat web, Ollama y el nombre del modelo
se configuran desde el entorno del backend; no se encontró un selector de
proveedores por usuario o proyecto ni una integración con Google Colab.

El análisis y las recomendaciones de IA son asistencia para la revisión, no una
verificación formal completa del diseño. Las sugerencias no cambian el modelo.
Las propuestas actuales se limitan a agregar, renombrar o cambiar el tipo de
atributos y se presentan como vista previa; no existe una acción para aplicarlas
desde ese flujo. La interoperabilidad XMI se limita a los elementos soportados
y no garantiza compatibilidad con todas las extensiones propietarias de otras
herramientas CASE.
