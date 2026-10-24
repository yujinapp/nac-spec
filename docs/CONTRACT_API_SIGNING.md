# Firma de la API de contrato NAC3 -- clave offline

Decidido por el dueno el 2026-10-24 (PND-034, opcion A). Este documento es
el procedimiento, no la discusion: la discusion esta en
`docs/PENDING_AUDITORIA_2026-10.md`, decision D-02.

## Lo que esto promete, y lo que no

El contrato NAC3 se publica como JSON estatico bajo `api/`. El host no corre
codigo nuestro, asi que **no se puede impedir** que alguien que comprometa el
servidor cambie los bytes. Lo que si se puede, y es lo que esta construido:

**manipulacion siempre detectable + consumidor que falla cerrado.**

Cuatro capas, de la mas barata a la que cubre el caso peor:

| Capa | Que cubre | Que NO cubre |
|---|---|---|
| 1. Direccionamiento por contenido (`sha384` + largo de cada superficie) | un artefacto editado | una cadena reconstruida |
| 2. Cadena de hashes append-only (cada entrada lleva el hash de la anterior) | reescribir una version vieja, purgar una entrada | un host que reconstruye toda la cadena |
| 3. Testigos independientes de la cabeza (repositorio; tarball de npm pendiente, ver abajo) | un host comprometido que sirve una falsificacion coherente | un **repositorio** comprometido: quien puede pushear mueve todos los testigos |
| 4. **Firma Ed25519 con clave offline** | el repositorio y el CI comprometidos: ninguno de los dos puede firmar | que te roben la clave de la maquina |

**Precision sobre la capa 3, medido el 2026-10-24.** `api/index.json` declara
tres testigos de la cabeza: el host, la historia de git y el tarball de npm.
Los dos primeros son reales hoy. El tercero **todavia no**: el tarball
publicado (`@nac3/runtime` 2.5.0-alpha.5) es anterior a que la API existiera,
asi que no contiene ninguna cabeza. Hasta que se publique un paquete que la
lleve, los testigos efectivos son dos. Esta anotado en el backlog de
auditoria para entrar con la 2.5.0; no se corrigio el texto del indice
publicado porque reescribirlo moveria una entrada ya publicada, que es
exactamente lo que el metodo prohibe.

La capa 4 es la unica que no se puede falsificar desde ningun sistema
automatico, **porque la clave privada no vive en ninguno**. Vive en tu
maquina. El CI **verifica** y se niega a publicar si la firma no cierra; el
CI **no puede firmar**.

Eso tiene un costo, y es el unico: **un comando manual por release.** No por
commit. El indice solo se mueve cuando se publica una version.

## Los comandos

### Una sola vez: crear la clave

```
node scripts/sign-contract-api.mjs --keygen
```

Escribe la mitad privada en `%USERPROFILE%\.nac3-keys\contract-signing-nac3-contract-<anio>.pem`
(permisos 600) y la mitad publica en `api/trust.json`, que se publica con el
resto de la API. Imprime la huella.

El programa **se niega** a escribir la clave en cualquier ruta dentro del
repositorio y **se niega** a sobreescribir una clave existente. Las dos cosas
tienen su caso de regresion.

Opcional, si queres que el archivo este cifrado en disco:

```
set NAC3_CONTRACT_KEY_PASSPHRASE=<tu frase>
node scripts/sign-contract-api.mjs --keygen
```

La misma variable tiene que estar seteada en cada firma.

**Respaldo.** Copia el `.pem` a un medio offline el mismo dia. No hay
recuperacion: si se pierde, el unico remedio es publicar una clave nueva, y
todo consumidor que haya anotado la huella vieja tiene que enterarse. Anota
ademas la **huella** en algun lugar fuera de la maquina (papel, gestor de
contrasenas, las notas del release): es lo que permite detectar una clave
sustituida, y por eso tiene que existir en un lugar que el host no controle.

### Por release: firmar

```
node scripts/sign-contract-api.mjs --sign
node scripts/build-contract-api.mjs
```

El primero firma el `api/index.json` que haya en disco. El segundo es la
compuerta: verifica la firma y no deja pasar nada que no cierre.

El orden importa. Una release es:

```
node scripts/build-contract-api.mjs --write     # mueve la cadena
node scripts/sign-contract-api.mjs --sign       # firma la cadena nueva
npm run check:release                           # las tres compuertas
git add api/ && git commit && git push          # el deploy verifica desde afuera
```

Si firmas antes de mover la cadena, la compuerta lo dice con el comando exacto
para arreglarlo: una firma que cubre otro indice es una firma vieja, y vieja
es indistinguible de maliciosa.

### Rotar la clave

```
node scripts/sign-contract-api.mjs --keygen --key-id nac3-contract-2027 --rotate
node scripts/sign-contract-api.mjs --sign
```

La clave anterior queda publicada como `retired`, nunca se borra: asi las
firmas viejas siguen siendo verificables. Una clave retirada **no** puede
firmar el indice actual (caso de regresion propio).

## Que pasa si no firmo

- **Antes de que exista `api/trust.json`:** la compuerta avisa que la capa 4
  no esta puesta y deja pasar. Las capas 1 a 3 siguen activas.
- **Despues de que exista:** la compuerta se pone **roja** si falta la firma,
  si la firma es vieja, si la hizo otra clave o si la clave esta retirada. El
  CI corre esa misma compuerta antes de subir nada, asi que una publicacion
  sin firma no llega al host.
- **Si el host deja de servir la firma:** el verificador falla. Una
  publicacion que pierde su firma en silencio es un *downgrade*, no una
  ausencia.

## Como lo verifica un tercero

Sin confiar en el servidor, sin clonar el repositorio, sin instalar nada mas
que Node:

```
node scripts/verify-contract-api.mjs --base https://yujin.app/nac-spec/ \
  --expect-head <cabeza publicada en las notas del release> \
  --expect-key  <huella publicada en las notas del release>
```

Recalcula la cadena, vuelve a hashear **los bytes que el servidor entrego**
(no los del repositorio), comprueba la firma sobre esos bytes y compara la
cabeza y la huella contra los testigos que le pasaste. Sin esos dos
parametros el comando dice, con esas palabras, que verifico coherencia
interna y **no** procedencia.

## Los candados, probados en rojo

- `scripts/test-contract-api.mjs` -- 26 casos sobre la compuerta (productor).
- `scripts/test-contract-api-http.mjs` -- 8 casos sobre el verificador
  (consumidor), cada uno con un servidor HTTP real.

El caso que define la capa 4 esta en el segundo: un host que reescribe un
artefacto, reconstruye la cadena entera para que recompute, publica una clave
propia y firma su falsificacion con ella. **Todo cierra contra si mismo.** Lo
unico que lo detecta es un testigo que el host no controla. Hay un caso verde
al lado que corre la misma falsificacion sin testigos y la acepta: existe para
que la frase "verifique coherencia, no procedencia" no se pueda borrar en
silencio.
