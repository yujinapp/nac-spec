# Elegibilidad -- nac-spec / NAC3

**Estacion:** N0 (normalizacion del legado) · **Fecha:** 2026-10-24 · **Ejecutor:** Forge · **Decisor:** el dueno (pendiente)

## Resultado: 6 verdes, 1 rojo

| # | Prerrequisito | Color | Evidencia |
|---|---|---|---|
| P1 | Ambiente completo levantable desde el repo y una copia de los datos | **VERDE** | Build desde fuentes OK (0.6 s), servidor local PHP, **51 de 51 pantallas responden 200**. No hay datos que copiar: el sistema no guarda ninguno. Deuda: 17 pantallas de documentacion pierden estilo y runtime fuera del subcamino `/nac-spec/` (262 archivos con rutas absolutas). |
| P2 | El codigo se puede leer, entender y trabajar modulo por modulo | **VERDE** | Nucleo de 8.134 lineas y 68 secciones nombradas, capa de extensiones, cliente de chat, puente MCP, reporter de testers y las 14 suites del gate. Seis puntos quedan fuera de mi comprension total y estan nombrados con su motivo; ninguno es de carga. |
| P3 | La funcionalidad se recupera desde el codigo, para un usuario final | **VERDE** | Documento escrito: 14 procesos, 51 pantallas con veredicto, seccion explicita de lo que el sistema NO hace, seis deducciones marcadas como tales. |
| P4 | Cada pantalla manejable por un test, cada elemento accesible, el efecto verificable | **VERDE** | Inventario mecanico de 51 pantallas: 27 publican manifiesto y en esas el **100 % de los elementos es direccionable**. Test end-to-end real del flujo de factura (abrir, agregar linea, editar cantidad, guardar): **9 verificaciones en verde**, incluido el rechazo de columnas no editables. |
| P5 | Compila y corre con las herramientas de hoy, cada dependencia sin resolver nombrada | **VERDE** | Node 22 / npm 11 / PHP 8.3: `npm test` verde (14 suites, **386 aserciones, 0 fallos**), build verde y reproducible byte a byte, **cero dependencias** de runtime, paquete `@nac3/runtime@2.5.0-alpha.5` igual al repo, sitio en produccion 200, CI verde. Sin dependencias sin resolver. |
| P6 | Los datos de produccion se pueden copiar y anonimizar, y existe backup probado | **ROJO** | No verificable desde el repositorio. El sistema no tiene base de datos ni cuentas; los unicos datos personales (reportes de testers, lista de espera) van al CRM de Yujin, fuera del repo. Falta: quien es el dueno del dato, si alguna vez se hizo y verifico una restauracion, y la regla de anonimizado. **Requiere proyecto previo.** |
| P7 | Cada integracion externa tiene modo de prueba o se aisla en el borde | **VERDE condicional** | Cuatro integraciones enumeradas y sondeadas vivas: chat (405 a GET, 422 a POST vacio), reportes de testers (endpoint + sandbox + borrador local + fallback por correo), lista de espera (fallback por correo), deploy. **Tres de cuatro** se aislan en el borde. La del chat **no tiene stub**: el camino voz/texto no se puede probar sin el servicio real. Verde solo si aceptas esa consecuencia. |

## Hallazgos (no bloquean, no deberian sobrevivir al takeover)

| id | Hallazgo |
|---|---|
| F-1 | 262 archivos atados al subcamino `/nac-spec/`: fuera de ahi la documentacion queda sin estilo ni runtime. |
| F-2 | Una demo publicada viola el contrato que demuestra: `example-v20-page-b.php` lanza `manifest_role_unknown`. |
| F-4 | Cinco stages de test existen y pasan, pero **no estan en el gate**: la cobertura aplicada es menor que la disponible. |
| F-5 | 324 elementos interactivos sin identificar (concentrados en las paginas de documentacion). |
| F-6 | La landing dice "ocho demos"; el repo entrega 22. |
| F-7 | El guardado de tablas es en memoria: no hay efecto de servidor que verificar porque no hay servidor. |
| F-8 | La integracion de chat no tiene stub local. |

## Decision (a cargo del dueno)

1. **Ir** -- tomar el sistema y seguir desde N1.
2. **Ir despues de estos proyectos previos** -- PRE-1 (prueba de datos y backup) y, si rechazas F-8, PRE-2 (stub de borde para el chat) quedan como pendientes bloqueantes.
3. **No ir** -- no aplicar el metodo a este sistema.

## Preguntas abiertas

1. Quien usa el sistema hoy y cuantos (testers, adoptantes, usuarios reales del CRM).
2. Hay algun conjunto de datos de este sistema fuera del CRM. Se restauro alguna vez y quien lo posee.
3. Los secretos de deploy los tiene una sola persona. Se acepta un host de staging o produccion es el unico destino.
4. Quien es el dueno del intermediario de chat, hay key de sandbox, cuanto cuesta por mes.
5. Alcance del takeover: seguir NAC3 como producto (evolutivo) o mantenerlo vivo como contrato publicado (correctivo).
