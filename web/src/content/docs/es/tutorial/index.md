---
title: 'Tutorial: construyendo Newthub'
description: Construye una aplicación para equipos con newt, paso a paso.
sidebar:
  order: 1
---

En este tutorial construyes Newthub, una pequeña aplicación para equipos: tareas, proyectos, documentos y chat. Cada paso añade una parte de newt a un backend que funciona desde el primer paso.

:::note[Próximamente]
Los pasos se están escribiendo. Mientras tanto, [tu primer proyecto](/es/start/first-project/) te lleva de una carpeta vacía a un backend en marcha.
:::

## Los pasos

1. **Proyecto y primer contexto**: crea Newthub y su contexto `tasks`.
2. **Casos de uso y entidades**: qué es una tarea y qué puedes hacer con ella.
3. **Base de datos con SQLite**: tablas, migraciones, filtros y páginas.
4. **HTTP y rutas**: llama a los casos de uso desde fuera.
5. **Proyectos**: un segundo módulo, al que pertenecen las tareas.
6. **Eventos entre módulos**: reacciona cuando se completa una tarea.
7. **Chat**: un segundo contexto, con su propia base de datos.
8. **Documentos**: sube y sirve ficheros.
9. **Tareas programadas**: envía recordatorios cada mañana.
10. **Testing**: prueba casos de uso, rutas y eventos.
11. **Despliegue**: pon Newthub en producción.

## Lo que necesitas

- Bun 1.4.0 o posterior. Consulta [instalación](/es/start/installation/).
- Lo básico de TypeScript, y saber qué son una petición HTTP y una tabla SQL.

No necesitas conocer ningún patrón de arquitectura. Cada paso explica las palabras que usa.
