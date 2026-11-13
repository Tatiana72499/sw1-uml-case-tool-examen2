package com.sw1.umltool.features.ai.voice.service;

import com.sun.net.httpserver.HttpServer;
import com.sw1.umltool.features.ai.voice.dto.AiVoiceInterpretRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AiVoiceInterpretationServiceTest {
    private static final AiVoiceInterpretRequest REQUEST = new AiVoiceInterpretRequest("crear clase Cliente", "es-BO", null);

    @Test
    void acceptsValidResponseWithinConfiguredTimeout() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 200, "{\"success\":true,\"command\":{\"type\":\"CREATE_CLASS\",\"className\":\"Cliente\"},\"confidence\":0.95,\"summary\":\"Crear clase Cliente\",\"errors\":[]}"));
        try {
            var service = serviceFor(server, 10, 30);
            assertEquals("Cliente", service.interpret(REQUEST).command().className());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void mapsReadTimeoutToTimeoutException() throws Exception {
        HttpServer server = server(exchange -> {
            try {
                Thread.sleep(1_500);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
            respond(exchange, 200, "{\"success\":false,\"errors\":[]}");
        });
        try {
            var service = serviceFor(server, 10, 1);
            assertThrows(AiVoiceTimeoutException.class, () -> service.interpret(REQUEST));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void rejectsInvalidResponseWithoutMappingItToTimeout() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 200, "{\"success\":true,\"command\":{\"type\":\"UNKNOWN\"}}"));
        try {
            var service = serviceFor(server, 10, 30);
            assertThrows(IllegalArgumentException.class, () -> service.interpret(REQUEST));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void acceptsVoiceCrudCommandFields() throws Exception {
        HttpServer server = server(exchange -> respond(exchange, 200, "{\"success\":true,\"command\":{\"type\":\"RENAME_ATTRIBUTE\",\"className\":\"cliente\",\"attributeName\":\"nombre\",\"newAttributeName\":\"nombreCompleto\"},\"confidence\":0.95,\"summary\":\"Renombrar atributo\",\"errors\":[]}"));
        try {
            var command = serviceFor(server, 10, 30).interpret(REQUEST).command();
            assertEquals("RENAME_ATTRIBUTE", command.type());
            assertEquals("nombreCompleto", command.newAttributeName());
        } finally {
            server.stop(0);
        }
    }

    @ParameterizedTest
    @CsvSource({
            "CREATE_CLASS,Cliente",
            "LIST_CLASSES,",
            "DELETE_CLASS,Cliente",
            "ADD_ATTRIBUTE,Cliente",
            "RENAME_ATTRIBUTE,Cliente"
    })
    void acceptsCommonVoiceCommandFamilies(String type, String className) throws Exception {
        String commandFields = switch (type) {
            case "CREATE_CLASS", "DELETE_CLASS" -> "\"className\":\"Cliente\"";
            case "ADD_ATTRIBUTE" -> "\"className\":\"Cliente\",\"attributeName\":\"email\",\"attributeType\":\"String\"";
            case "RENAME_ATTRIBUTE" -> "\"className\":\"Cliente\",\"attributeName\":\"email\",\"newAttributeName\":\"correo\"";
            default -> "";
        };
        HttpServer server = server(exchange -> respond(exchange, 200,
                "{\"success\":true,\"command\":{\"type\":\"" + type + "\"" + (commandFields.isEmpty() ? "" : "," + commandFields) + "},\"confidence\":0.9,\"summary\":\"ok\",\"errors\":[]}"));
        try {
            var response = serviceFor(server, 10, 30).interpret(REQUEST);
            assertEquals(type, response.command().type());
            assertEquals(className, response.command().className());
        } finally {
            server.stop(0);
        }
    }

    private HttpServer server(HttpHandler handler) throws IOException {
        var server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/interpret", exchange -> handler.handle(exchange));
        server.start();
        return server;
    }

    private AiVoiceInterpretationService serviceFor(HttpServer server, int connectTimeout, int readTimeout) {
        return new AiVoiceInterpretationService("http://localhost:" + server.getAddress().getPort() + "/interpret", "", connectTimeout, readTimeout);
    }

    private void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    @FunctionalInterface
    private interface HttpHandler {
        void handle(com.sun.net.httpserver.HttpExchange exchange) throws IOException;
    }
}
