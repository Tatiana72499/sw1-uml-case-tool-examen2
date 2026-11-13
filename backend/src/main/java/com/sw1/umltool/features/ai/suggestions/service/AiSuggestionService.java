package com.sw1.umltool.features.ai.suggestions.service;

import com.sw1.umltool.features.ai.analysis.exception.AiAnalysisException;
import com.sw1.umltool.features.ai.analysis.service.AiAnalysisContextService;
import com.sw1.umltool.features.ai.chat.service.AiOrchestrator;
import com.sw1.umltool.features.ai.suggestions.dto.AiSuggestion;
import com.sw1.umltool.features.ai.suggestions.dto.AiSuggestionsResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class AiSuggestionService {
    private static final int MAX_SUGGESTIONS = 10;
    private static final int MAX_FIELD_LENGTH = 700;
    private final AiSuggestionSemanticValidator semanticValidator = new AiSuggestionSemanticValidator();
    private final AiAnalysisContextService context;
    private final AiOrchestrator orchestrator;
    private final ObjectMapper mapper;
    private final long timeoutSeconds;

    public AiSuggestionService(AiAnalysisContextService context, AiOrchestrator orchestrator,
                               ObjectMapper mapper,
                               @Value("${ai.analysis.timeout-seconds:120}") long timeoutSeconds) {
        this.context = context;
        this.orchestrator = orchestrator;
        this.mapper = mapper;
        this.timeoutSeconds = Math.max(1, timeoutSeconds);
    }

    public AiSuggestionsResponse suggest(String projectId, String userId, String diagramId) {
        var prepared = context.prepare(projectId, userId, diagramId);
        var future = orchestrator.submitPrompt(systemPrompt(), prepared.prompt());
        try {
            return validate(parse(future.get(timeoutSeconds + 1, TimeUnit.SECONDS)), projectId, diagramId, prepared);
        } catch (TimeoutException exception) {
            future.cancel(true);
            throw new AiAnalysisException("Las sugerencias de IA superaron el tiempo permitido.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            future.cancel(true);
            throw new AiAnalysisException("Las sugerencias de IA fueron interrumpidas.", exception);
        } catch (ExecutionException exception) {
            throw new AiAnalysisException("Ollama no pudo generar sugerencias.", exception.getCause());
        }
    }

    private JsonNode parse(String raw) {
        try {
            String json = raw == null ? "" : raw.trim();
            if (json.startsWith("```")) {
                int firstNewline = json.indexOf('\n');
                int lastFence = json.lastIndexOf("```");
                if (firstNewline < 0 || lastFence <= firstNewline) throw new IllegalArgumentException();
                json = json.substring(firstNewline + 1, lastFence).trim();
            }
            JsonNode node = mapper.readTree(json);
            if (node == null || !node.isObject() || !node.has("suggestions")) throw new IllegalArgumentException();
            return node;
        } catch (Exception exception) {
            throw new AiAnalysisException("La respuesta de sugerencias no contiene JSON válido.", exception);
        }
    }

    private AiSuggestionsResponse validate(JsonNode node, String projectId, String diagramId,
                                           AiAnalysisContextService.PreparedContext prepared) {
        JsonNode values = node.get("suggestions");
        if (!values.isArray() || values.size() > MAX_SUGGESTIONS) {
            throw new AiAnalysisException("La respuesta contiene demasiadas sugerencias o un formato inválido.");
        }
        List<AiSuggestion> result = new ArrayList<>();
        Set<String> keys = new HashSet<>();
        for (int index = 0; index < Math.min(values.size(), MAX_SUGGESTIONS); index++) {
            JsonNode value = values.get(index);
            String category = required(value, "category").toUpperCase(java.util.Locale.ROOT);
            String elementId = nullable(value, "elementId");
            // A small local model can hallucinate an id even when its text is useful.
            // Discard only that unsafe item; one bad reference must not erase every
            // other valid suggestion in the response.
            if (elementId != null && !prepared.descriptors().containsKey(elementId)) continue;
            String title = required(value, "title");
            String reason = required(value, "reason");
            String proposal = required(value, "proposal");
            boolean requiresBusinessContext = value.path("requiresBusinessContext").asBoolean(false);
            if (!semanticValidator.accepts(category, elementId, requiresBusinessContext,
                    elementId == null ? null : prepared.descriptors().get(elementId))) {
                continue;
            }
            String key = category + "|" + (elementId == null ? "" : elementId) + "|" + title.toLowerCase();
            if (keys.add(key)) {
                result.add(new AiSuggestion(UUID.nameUUIDFromBytes(key.getBytes()).toString(), category,
                        elementId, title, reason, proposal, requiresBusinessContext));
            }
        }
        String modelSummary = nullable(node, "summary");
        String summary = result.isEmpty() ? "No se encontraron sugerencias válidas para revisar; las referencias dudosas se descartaron." :
                (modelSummary == null ? "" : modelSummary + " ") + "Se generaron " + result.size()
                        + (result.size() == 1 ? " sugerencia para revisar." : " sugerencias para revisar.");
        return new AiSuggestionsResponse(projectId, diagramId, summary, List.copyOf(result));
    }

    private String required(JsonNode node, String field) {
        String value = nullable(node, field);
        if (value == null) throw new AiAnalysisException("Una sugerencia no contiene " + field + ".");
        return value.length() > MAX_FIELD_LENGTH ? value.substring(0, MAX_FIELD_LENGTH) : value;
    }

    private String nullable(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText().trim();
    }

    private String systemPrompt() {
        return "Eres SW1 IA, desarrollador sénior y mentor especializado en UML 2.5, análisis de diseño y revisión de modelos. " +
                "Revisa el diagrama completo del contexto: clases, atributos, operaciones, relaciones, multiplicidades, herencia, consistencia y convenciones de nombres. " +
                "Usa únicamente evidencia del modelo canónico y memorias PROJECT. No modifiques el diagrama ni inventes elementos existentes, requisitos o reglas del negocio. " +
                "Entrega hasta 10 sugerencias concretas y diversas, priorizadas por impacto. Puedes señalar errores estructurales demostrables, inconsistencias UML, oportunidades de diseño y preguntas de mentoría; no llenes el límite con observaciones subjetivas. " +
                "No propongas métodos solo porque no existan, no cambies multiplicidades válidas ni recomiendes agregación/composición sin evidencia de pertenencia o ciclo de vida. " +
                "Cuando una conclusión dependa del dominio, marca requiresBusinessContext=true y formula qué contexto falta en la propuesta. " +
                "Cada elementId debe copiarse literalmente de un id presente en el modelo canónico; si el consejo es general, usa null. No inventes ni reconstruyas IDs. " +
                "Usa category ATTRIBUTE, OPERATION, RELATIONSHIP, MULTIPLICITY, INHERITANCE, NAMING, CONSISTENCY o GENERAL. " +
                "Devuelve únicamente JSON con: {\"summary\":\"resumen breve\",\"suggestions\":[{\"category\":\"ATTRIBUTE|OPERATION|RELATIONSHIP|MULTIPLICITY|INHERITANCE|NAMING|CONSISTENCY|GENERAL\",\"elementId\":\"id existente o null\",\"title\":\"...\",\"reason\":\"evidencia observada\",\"proposal\":\"acción sugerida o pregunta concreta\",\"requiresBusinessContext\":true}]}";
    }
}
