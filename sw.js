/*
 * ============================================================
 * ELDORIA: MUNDO ABERTO
 * SERVICE WORKER - PWA / OFFLINE
 * ============================================================
 */

const CACHE_VERSION = "eldoria-v2";

const APP_CACHE = `eldoria-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `eldoria-runtime-${CACHE_VERSION}`;

/*
 * Arquivos principais do aplicativo.
 *
 * Esses arquivos serão armazenados durante a instalação
 * do Service Worker para permitir o funcionamento offline.
 */
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./apple-touch-icon.png",
    "./icon-192.png"
];


/*
 * ============================================================
 * INSTALAÇÃO
 * ============================================================
 */

self.addEventListener("install", (event) => {

    event.waitUntil(

        caches.open(APP_CACHE)

            .then(async (cache) => {

                for (const file of APP_SHELL) {

                    try {

                        await cache.add(file);

                        console.log(
                            "[Eldoria SW] Arquivo armazenado:",
                            file
                        );

                    } catch (error) {

                        /*
                         * Se algum arquivo opcional não existir,
                         * isso não impede o Service Worker de instalar.
                         */

                        console.warn(
                            "[Eldoria SW] Não foi possível armazenar:",
                            file,
                            error
                        );

                    }

                }

            })

            /*
             * Ativa imediatamente a nova versão.
             */

            .then(() => self.skipWaiting())

    );

});


/*
 * ============================================================
 * ATIVAÇÃO
 * ============================================================
 */

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys()

            .then((cacheNames) => {

                return Promise.all(

                    cacheNames

                        .filter((cacheName) => {

                            return (
                                cacheName.startsWith("eldoria-") &&
                                cacheName !== APP_CACHE &&
                                cacheName !== RUNTIME_CACHE
                            );

                        })

                        .map((cacheName) => {

                            console.log(
                                "[Eldoria SW] Removendo cache antigo:",
                                cacheName
                            );

                            return caches.delete(cacheName);

                        })

                );

            })

            /*
             * Faz o novo Service Worker controlar
             * as páginas abertas imediatamente.
             */

            .then(() => self.clients.claim())

    );

});


/*
 * ============================================================
 * MENSAGENS
 * ============================================================
 *
 * Permite que o index.html peça ao Service Worker
 * para assumir o controle imediatamente.
 */

self.addEventListener("message", (event) => {

    if (event.data === "SKIP_WAITING") {

        self.skipWaiting();

    }

});


/*
 * ============================================================
 * FETCH
 * ============================================================
 */

self.addEventListener("fetch", (event) => {

    const request = event.request;

    /*
     * Service Worker só trabalha com requisições GET.
     */

    if (request.method !== "GET") {

        return;

    }


    const url = new URL(request.url);


    /*
     * ========================================================
     * 1. PÁGINA PRINCIPAL
     * ========================================================
     *
     * Quando o usuário entra no jogo:
     *
     * ONLINE:
     *   tenta buscar a versão mais recente.
     *
     * OFFLINE:
     *   utiliza o index.html armazenado no cache.
     */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then((response) => {

                    if (response && response.ok) {

                        const responseClone =
                            response.clone();

                        caches.open(APP_CACHE)

                            .then((cache) => {

                                cache.put(
                                    "./index.html",
                                    responseClone
                                );

                            });

                    }

                    return response;

                })

                .catch(() => {

                    console.log(
                        "[Eldoria SW] Offline - usando index.html do cache."
                    );

                    return caches.match("./index.html");

                })

        );

        return;

    }


    /*
     * ========================================================
     * 2. RECURSOS EXTERNOS
     * ========================================================
     *
     * Seu index.html utiliza recursos externos como:
     *
     * Three.js
     * PeerJS
     *
     * Depois que esses arquivos forem carregados uma vez
     * com internet, eles ficam disponíveis no cache.
     */

    if (url.origin !== self.location.origin) {

        event.respondWith(

            caches.match(request)

                .then((cachedResponse) => {

                    /*
                     * Se já estiver no cache, usa o cache.
                     */

                    if (cachedResponse) {

                        return cachedResponse;

                    }


                    /*
                     * Caso ainda não esteja armazenado,
                     * busca pela internet.
                     */

                    return fetch(request)

                        .then((response) => {

                            if (
                                !response ||
                                !response.ok
                            ) {

                                return response;

                            }


                            const responseClone =
                                response.clone();


                            caches.open(RUNTIME_CACHE)

                                .then((cache) => {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                });


                            return response;

                        })

                        .catch(() => {

                            /*
                             * Se estiver offline e o recurso
                             * já tiver sido armazenado anteriormente,
                             * tenta recuperá-lo do cache.
                             */

                            return caches.match(request);

                        });

                })

        );

        return;

    }


    /*
     * ========================================================
     * 3. ARQUIVOS LOCAIS
     * ========================================================
     *
     * Exemplos:
     *
     * imagens
     * CSS
     * JavaScript
     * fontes
     * JSON
     * etc.
     *
     * Estratégia:
     *
     * CACHE FIRST
     *
     * Se já estiver no cache:
     *     usa o cache.
     *
     * Se não estiver:
     *     baixa da internet e salva.
     */

    event.respondWith(

        caches.match(request)

            .then((cachedResponse) => {

                if (cachedResponse) {

                    return cachedResponse;

                }


                return fetch(request)

                    .then((response) => {

                        if (
                            !response ||
                            !response.ok
                        ) {

                            return response;

                        }


                        const responseClone =
                            response.clone();


                        caches.open(RUNTIME_CACHE)

                            .then((cache) => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });


                        return response;

                    });

            })

    );

});
