# Deuda técnica de CYB

Documento vivo. Aquí se registra lo que quedó pendiente a propósito, para retomarlo después de terminar todas las fases.

## 1. Asesor con IA (desactivado)

**Estado:** el código existe completo pero está apagado con el interruptor `VITE_AI_ENABLED` (por defecto `false`). Con el interruptor apagado, el asesor solo responde con la base de conocimiento local, rechaza lo ajeno y, ante una pregunta sobre el caso del usuario, indica que el asesor con IA aún no está disponible y lo manda a la pestaña Plan. No se hace ninguna llamada a IA ni consulta de uso.

**Motivo:** la API de Anthropic se cobra por uso, aparte de cualquier suscripción, y no hay presupuesto por ahora.

**Qué ya existe**

| Pieza | Ubicación |
| --- | --- |
| Función de servidor que llama a Claude | `supabase/functions/advisor/index.ts` |
| Contador diario atómico y consentimiento | `supabase/migrations/20261107040000_advisor.sql` |
| Devolución de mensaje solo para el servidor | `supabase/migrations/20261107050000_refund_service_only.sql` |
| Cliente y límite diario (20) | `src/features/advisor/api.ts` |
| Datos que se envían (solo cifras, deudas como "Deuda 1") | `src/features/advisor/context.ts` |
| Chat, consentimiento y avisos | `src/features/advisor/AsesorPage.tsx` |
| Interruptor | `src/lib/features.ts` |

**Pasos para activarla**

1. Crear una clave en console.anthropic.com y cargar saldo.
2. `npx supabase login`
3. `npx supabase secrets set ANTHROPIC_API_KEY=<clave> --project-ref xmljkkwqcdxglsbdraxe`
4. `npx supabase functions deploy advisor --project-ref xmljkkwqcdxglsbdraxe`
5. Poner `VITE_AI_ENABLED=true` en `.env` y reiniciar el servidor de desarrollo.
6. Probar de punta a punta: consentimiento, respuesta, contador `n/20`, límite al llegar a 20 y devolución del mensaje si la API falla.

**Riesgos a verificar al activarla**

- La función nunca se ha ejecutado. Es la parte con más riesgo de un primer error.
- Revisar el costo real por mensaje con el modelo configurado (`claude-haiku-5-5`) y ajustar el límite diario.
- Confirmar que el aviso de consentimiento coincide con lo que realmente se envía.
- Revisar el prompt: no inventar cifras, no tocar gastos esenciales, aviso de no ser asesoría profesional.
- Las cifras del contexto las envía el navegador y el servidor no las recalcula. Afecta solo la respuesta del propio usuario, pero conviene decidir si se recalculan en el servidor.

**Criterio de terminado:** el chat responde con IA usando el plan del usuario, respeta los 20 mensajes diarios y las pruebas de la sección anterior pasan.

## 2. Pendientes por fase

**Fase 3 (plan)**

- Minimodal para repartir un ingreso extra entre deudas, con porcentaje elegido por el usuario y tip de "100 % menos colchón".
- El abono por quincena es el mensual entre dos; falta alinearlo a la fecha de pago de cada deuda.
- Los ingresos extra no se aplican aún al plan como abono puntual.

**Fase 4 (implementada, con verificaciones pendientes)**

- 2FA TOTP: implementado (activar, desactivar y código al iniciar sesión). Falta probarlo con un teléfono real y confirmar que TOTP está habilitado en Supabase (Authentication, Multi-Factor).
- 2FA no se exige en el servidor: las reglas de seguridad por usuario no comprueban el nivel de autenticación. Evaluar exigir `aal2` a quienes tengan 2FA activo.
- PWA: manifiesto, iconos y service worker listos. Falta probar la instalación en Android e iOS y el aviso de actualización de versión.
- Exportar datos a CSV (deudas, abonos, movimientos y recurrentes): implementado.
- Borrar cuenta: depende de la migración `20261107060000_delete_account.sql`. Falta probarlo de punta a punta, porque destruye la cuenta.
- Animaciones: entrada de diálogos y listas con CSS, feedback al pulsar y respeto a "reducir movimiento". Sin salida animada al cerrar diálogos.

**Despliegue**

- Publicar en GitHub Pages desde el repositorio personal. Hay que configurar la ruta base de Vite y confirmar que `HashRouter` funciona en la ruta final.
- Exigir contraseñas fuertes y revisar la política de correo de confirmación en Supabase antes de publicar.

## 3. Mejoras menores conocidas

- Los abonos no se pueden editar ni borrar. Si hay un error, hay que corregir el saldo editando la deuda.
- Los recurrentes mensuales de fin de mes pueden correrse de día (31 pasa a 28 y se queda ahí).
- El relleno de recurrentes pasados genera como máximo 366 movimientos por ejecución.
- Las categorías se pueden crear, pero no editar ni borrar.
- El filtro de temas del asesor usa listas de palabras y un umbral de confianza; conviene ampliarlas con preguntas reales de usuarios.
- No hay pruebas automatizadas escritas. Por regla del proyecto no se escribieron hasta que se indicara.
- La validación del tope de un abono se hace en el navegador; el servidor solo evita que el saldo quede negativo.
