package com.sw1.umltool.features.importexport.service;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

import static org.junit.jupiter.api.Assertions.*;

class ImageUpdateAiServiceTest {
    @Test
    void acceptsStructuredWebhookResponse() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 200,
                "{\"success\":true,\"operations\":[],\"warnings\":[],\"confidence\":0.9}"));
        try {
            var response = service(server).interpret(new byte[]{1}, "diagram.png", "image/png", "", false, null);
            assertTrue(response.success());
            assertTrue(response.operations().isEmpty());
        } finally { server.stop(0); }
    }

    @Test
    void explainsAnEmptyWebhookResponse() throws Exception {
        HttpServer server = server(exchange -> exchange.sendResponseHeaders(200, -1));
        try {
            var exception = assertThrows(IllegalStateException.class,
                    () -> service(server).interpret(new byte[]{1}, "diagram.png", "image/png", "", false, null));
            assertTrue(exception.getMessage().contains("HTTP 200 sin JSON"));
            assertTrue(exception.getMessage().contains("Respond to Webhook"));
        } finally { server.stop(0); }
    }

    @Test
    void explainsWhenTheUpdateWebhookIsNotRegistered() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 404, "not registered"));
        try {
            var exception = assertThrows(IllegalStateException.class,
                    () -> service(server).interpret(new byte[]{1}, "diagram.png", "image/png", "", false, null));
            assertTrue(exception.getMessage().contains("SW1 UML Image Update"));
        } finally { server.stop(0); }
    }

    @Test
    void reportsProviderErrorsWithTheirHttpStatus() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 502, "provider failed"));
        try {
            var exception = assertThrows(IllegalStateException.class,
                    () -> service(server).interpret(new byte[]{1}, "diagram.png", "image/png", "", false, null));
            assertTrue(exception.getMessage().contains("HTTP 502"));
            assertTrue(exception.getMessage().contains("Gemini"));
        } finally { server.stop(0); }
    }

    @Test
    void identifiesMalformedJsonFromTheWebhook() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 200, "not-json"));
        try {
            var exception = assertThrows(IllegalStateException.class,
                    () -> service(server).interpret(new byte[]{1}, "diagram.png", "image/png", "", false, null));
            assertTrue(exception.getMessage().contains("respuesta no válida"));
        } finally { server.stop(0); }
    }

    private ImageUpdateAiService service(HttpServer server) {
        return new ImageUpdateAiService("http://localhost:" + server.getAddress().getPort() + "/image", "", 5, 5);
    }

    private HttpServer server(Handler handler) throws IOException {
        var server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/image", handler::handle);
        server.start();
        return server;
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) { output.write(bytes); }
    }

    @FunctionalInterface private interface Handler { void handle(HttpExchange exchange) throws IOException; }
}
