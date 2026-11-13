package com.sw1.umltool.features.importexport.service;

import com.sw1.umltool.features.importexport.dto.ImageUpdateAiRequest;
import com.sw1.umltool.features.importexport.dto.ImageUpdateAiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConversionException;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Base64;

@Service
public class ImageUpdateAiService {
    private final RestClient client;
    private final String webhookUrl;
    private final String token;

    public ImageUpdateAiService(
            @Value("${ai.n8n.uml-image-update-webhook-url:}") String webhookUrl,
            @Value("${ai.n8n.uml-image-webhook-token:}") String token,
            @Value("${ai.n8n.connect-timeout-seconds:10}") int connectTimeout,
            @Value("${ai.n8n.image-read-timeout-seconds:${ai.n8n.read-timeout-seconds:30}}") int readTimeout) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(connectTimeout)).build());
        factory.setReadTimeout(Duration.ofSeconds(readTimeout));
        this.client = RestClient.builder().requestFactory(factory).build();
        this.webhookUrl = webhookUrl;
        this.token = token;
    }

    public ImageUpdateAiResponse interpret(byte[] image, String fileName, String contentType,
                                           String instruction, boolean allowDestructiveChanges,
                                           com.sw1.umltool.features.diagram.model.canonical.UmlDiagram context) {
        if (webhookUrl.isBlank()) {
            throw new IllegalStateException("El servicio de actualización visual aún no está configurado.");
        }
        var request = new ImageUpdateAiRequest(fileName, contentType,
                Base64.getEncoder().encodeToString(image), instruction == null ? "" : instruction,
                allowDestructiveChanges, context);
        try {
            ImageUpdateAiResponse response = client.post().uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> { if (!token.isBlank()) headers.setBearerAuth(token); })
                    .body(request).retrieve().body(ImageUpdateAiResponse.class);
            if (response == null) throw new IllegalStateException(
                    "n8n respondió HTTP 200 sin JSON. Revisa la ejecución de SW1 UML Image Update: puede haber fallado Gemini antes del nodo de respuesta; verifica también Respond to Webhook → JSON con {{ $json }}.");
            return response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                throw new IllegalStateException("El webhook de actualización visual no está registrado en n8n. Importa y activa SW1 UML Image Update.", exception);
            }
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw new IllegalStateException("n8n rechazó el webhook de actualización visual. Revisa el token configurado.", exception);
            }
            throw new IllegalStateException("n8n no pudo analizar la imagen (HTTP " + exception.getStatusCode().value() + "). Revisa la ejecución del workflow y su credencial de Gemini.", exception);
        } catch (RestClientException exception) {
            if (hasCause(exception, HttpMessageConversionException.class)) {
                throw new IllegalStateException("n8n devolvió una respuesta no válida. El workflow debe responder JSON con las propiedades success, operations, warnings y confidence.", exception);
            }
            throw new IllegalStateException("El servicio de actualización visual no está disponible. Revisa que n8n esté activo y que el workflow SW1 UML Image Update se encuentre habilitado.", exception);
        }
    }

    private boolean hasCause(Throwable exception, Class<? extends Throwable> type) {
        for (Throwable current = exception; current != null; current = current.getCause()) {
            if (type.isInstance(current)) return true;
        }
        return false;
    }
}
