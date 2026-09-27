# WellCampus: navegación, recordatorios e identidad verde

## Objetivo
Convertir la experiencia actual en WellCampus y hacer funcionales las cuatro secciones de la barra inferior, manteniendo los registros de salud privados de cada estudiante.

## Cambios
- Renombrar toda la experiencia visible y sus metadatos a **WellCampus**.
- Actualizar la identidad visual a una paleta institucional verde, con tonos secundarios para distinguir los cinco hábitos sin perder coherencia.
- Mantener **Hoy** como resumen diario.
- Crear **Progreso** con evolución de los últimos siete registros, promedios y comparaciones por hábito.
- Crear **Meta** con objetivos personales editables para actividad, sueño, hidratación, alimentación y estrés, guardados en la cuenta del estudiante.
- Crear **Perfil** con nombre, programa, semestre y jornada editables, además de privacidad y cierre de sesión.
- Hacer funcional la campana de **Recordatorios**, con activación, hora elegible y alertas dentro de la app; guardar la preferencia en el dispositivo.
- Conservar animaciones puntuales y accesibles al cambiar de sección, actualizar cifras y abrir paneles.

## Detalles técnicos
- Las secciones vivirán dentro de la experiencia autenticada actual y compartirán la misma barra inferior.
- Metas y perfil usarán las tablas privadas existentes; no se requieren nuevas tablas.
- Los recordatorios usarán la API de notificaciones del navegador cuando esté disponible y mostrarán una alternativa dentro de la app cuando no lo esté.
- La barra inferior seguirá siendo móvil; en escritorio se añadirá navegación equivalente en la cabecera.
- Se validará en tamaños móvil y escritorio, además de revisar errores de compilación y consola.
