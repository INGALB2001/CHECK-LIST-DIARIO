# MAF HUB · Integración del módulo de fabricación

## Decisión de arquitectura

Este módulo no se plantea como una página independiente. Forma parte de **MAF HUB**, la plataforma general que centralizará:

- Dashboard
- Checklist diario
- Proyectos
- Cotizaciones
- Compras
- Fabricación
- Personal
- Instalaciones y servicio
- Inventario
- Documentos e indicadores

La primera versión reutiliza el mismo proyecto de Supabase del Checklist Diario para mantener un solo inicio de sesión y una sola base de datos.

## Primera puesta en marcha

1. Ejecutar `sql/001_schema_fabricacion.sql` en Supabase.
2. Copiar la URL y clave pública `anon` del proyecto actual a `js/config.js`.
3. Cambiar `DEMO_MODE` a `false`.
4. Publicar la carpeta en GitHub Pages o integrarla en el repositorio definitivo de MAF HUB.
5. Crear usuarios en Supabase Authentication.
6. Crear el registro correspondiente en `profiles` y enlazarlo con `employees.profile_id`.

## Estructura de fabricación

- `projects`: proyecto comercial/industrial.
- `assemblies`: ensamble general y subensambles mediante `parent_id`.
- `parts`: piezas organizadas por número de plano.
- `manufacturing_operations`: ruta de fabricación y responsable por proceso.
- `part_drawings`: PDF vigente, revisiones e ID de Google Drive.
- `part_notes`: comentarios, problemas y cambios.
- `activity_log`: trazabilidad futura.

## Nomenclatura obligatoria de planos

Formato recomendado:

`NUMERO-DE-PIEZA-RXX.pdf`

Ejemplos:

- `NR-201-R00.pdf`
- `NR-201-R01.pdf`
- `NR-201-R02-EJE-MOTRIZ.pdf`

El número antes de la revisión debe coincidir exactamente con `parts.part_number`.

## Integración automática con Google Drive

La sincronización segura debe ejecutarse en backend, no desde JavaScript público. El flujo previsto es:

1. Cada proyecto guarda `drive_folder_id`.
2. Una Supabase Edge Function consulta los PDF dentro de la carpeta.
3. Extrae número de pieza y revisión del nombre.
4. Busca la pieza correspondiente.
5. Registra o actualiza `part_drawings`.
6. Mantiene una sola revisión vigente.
7. Genera alertas cuando una pieza en fabricación recibe una revisión nueva.

La credencial privada de Google nunca debe colocarse en `config.js` ni publicarse en GitHub Pages.

## Siguiente bloque de desarrollo

1. Carga real desde Supabase, sustituyendo los datos demo.
2. Alta de ensambles, subensambles y piezas desde la interfaz.
3. Vista individual “Mi trabajo” para cada empleado.
4. Sincronización con Google Drive.
5. Historial de cambios y aprobación de piezas.
