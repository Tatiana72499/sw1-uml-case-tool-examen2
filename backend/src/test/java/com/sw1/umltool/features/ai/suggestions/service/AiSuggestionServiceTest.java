package com.sw1.umltool.features.ai.suggestions.service;

import com.sw1.umltool.features.ai.analysis.exception.AiAnalysisException;
import com.sw1.umltool.features.ai.analysis.service.AiAnalysisContextService;
import com.sw1.umltool.features.ai.chat.service.AiOrchestrator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiSuggestionServiceTest {
    private AiAnalysisContextService context;
    private AiOrchestrator orchestrator;
    private AiSuggestionService service;

    @BeforeEach
    void setUp() {
        context = mock(AiAnalysisContextService.class);
        orchestrator = mock(AiOrchestrator.class);
        service = new AiSuggestionService(context, orchestrator, new ObjectMapper(), 2);
    }

    @Test
    void validatesIdsDeduplicatesSuggestionsAndDoesNotMutateTheModel() {
        var prepared = new AiAnalysisContextService.PreparedContext("p1", "context",
                Map.of("class-1", new AiAnalysisContextService.ElementDescriptor(
                        "class-1", AiAnalysisContextService.ElementKind.CLASS, "Cliente")));
        when(context.prepare("p1", "u1", "d1")).thenReturn(prepared);
        when(orchestrator.submitPrompt(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(
                "{\"suggestions\":[" +
                        "{\"category\":\"ATTRIBUTE\",\"elementId\":\"class-1\",\"title\":\"Revisar apellido\",\"reason\":\"Falta contexto\",\"proposal\":\"Evaluar su significado\",\"requiresBusinessContext\":true}," +
                        "{\"category\":\"ATTRIBUTE\",\"elementId\":\"class-1\",\"title\":\"Revisar apellido\",\"reason\":\"Duplicada\",\"proposal\":\"Revisar\",\"requiresBusinessContext\":true}]}"));

        var response = service.suggest("p1", "u1", "d1");

        assertEquals(1, response.suggestions().size());
        assertEquals("d1", response.diagramId());
    }

    @Test
    void dropsSuggestionsThatReferenceUnknownElementIds() {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of()));
        when(orchestrator.submitPrompt(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(
                "{\"suggestions\":[{\"category\":\"GENERAL\",\"elementId\":\"missing\",\"title\":\"x\",\"reason\":\"x\",\"proposal\":\"x\"}]}"));

        assertEquals(0, service.suggest("p1", "u1", null).suggestions().size());
    }

    @Test
    void keepsValidSuggestionsWhenAnotherSuggestionHasAHallucinatedId() {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of(
                        "class-1", new AiAnalysisContextService.ElementDescriptor(
                                "class-1", AiAnalysisContextService.ElementKind.CLASS, "Cliente"))));
        when(orchestrator.submitPrompt(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(
                "{\"suggestions\":[" +
                        "{\"category\":\"RELATIONSHIP\",\"elementId\":\"missing\",\"title\":\"Inventada\",\"reason\":\"x\",\"proposal\":\"x\"}," +
                        "{\"category\":\"GENERAL\",\"elementId\":null,\"title\":\"Revisar el alcance\",\"reason\":\"El diagrama no expresa el dominio\",\"proposal\":\"Confirma qué proceso representa\"}]}"));

        var response = service.suggest("p1", "u1", null);

        assertEquals(1, response.suggestions().size());
        assertEquals("Revisar el alcance", response.suggestions().getFirst().title());
    }

    @Test
    void acceptsAnEmptySuggestionList() {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of()));
        when(orchestrator.submitPrompt(anyString(), anyString())).thenReturn(
                CompletableFuture.completedFuture("{\"suggestions\":[]}"));

        assertEquals(0, service.suggest("p1", "u1", null).suggestions().size());
    }

    @Test
    void sendsFocusedGuidanceAndSupportsTenDistinctEvidenceBasedSuggestions() {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of()));
        String suggestions = java.util.stream.IntStream.range(0, 10)
                .mapToObj(index -> "{\"category\":\"GENERAL\",\"elementId\":null,\"title\":\"Idea " + index
                        + "\",\"reason\":\"evidencia " + index + "\",\"proposal\":\"opción " + index + "\"}")
                .collect(java.util.stream.Collectors.joining(","));
        when(orchestrator.submitPrompt(anyString(), eq("context"))).thenReturn(CompletableFuture.completedFuture(
                "{\"suggestions\":[" + suggestions + "]}"));

        var response = service.suggest("p1", "u1", null);
        var prompt = forClass(String.class);
        verify(orchestrator).submitPrompt(prompt.capture(), eq("context"));

        assertEquals(10, response.suggestions().size());
        assertTrue(prompt.getValue().contains("hasta 10 sugerencias"));
        assertTrue(prompt.getValue().contains("desarrollador sénior"));
        assertTrue(prompt.getValue().contains("RELATIONSHIP"));
        assertTrue(prompt.getValue().contains("No inventes ni reconstruyas IDs"));
    }

    @Test
    void rejectsMoreThanTenSuggestionsInsteadOfSilentlyTruncating() {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of()));
        String suggestions = java.util.stream.IntStream.range(0, 11)
                .mapToObj(index -> "{\"category\":\"GENERAL\",\"elementId\":null,\"title\":\"Idea " + index
                        + "\",\"reason\":\"evidencia\",\"proposal\":\"opción\"}")
                .collect(java.util.stream.Collectors.joining(","));
        when(orchestrator.submitPrompt(anyString(), eq("context"))).thenReturn(
                CompletableFuture.completedFuture("{\"suggestions\":[" + suggestions + "]}"));

        assertThrows(AiAnalysisException.class, () -> service.suggest("p1", "u1", null));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 5, 10})
    void keepsEachRequestedSuggestionBatchWithinTheTenItemLimit(int count) {
        when(context.prepare("p1", "u1", null)).thenReturn(
                new AiAnalysisContextService.PreparedContext("p1", "context", Map.of()));
        String suggestions = java.util.stream.IntStream.range(0, count)
                .mapToObj(index -> "{\"category\":\"GENERAL\",\"elementId\":null,\"title\":\"Sugerencia " + index
                        + "\",\"reason\":\"evidencia específica " + index + "\",\"proposal\":\"alternativa " + index + "\"}")
                .collect(java.util.stream.Collectors.joining(","));
        when(orchestrator.submitPrompt(anyString(), eq("context"))).thenReturn(
                CompletableFuture.completedFuture("{\"suggestions\":[" + suggestions + "]}"));

        var response = service.suggest("p1", "u1", null);

        assertEquals(count, response.suggestions().size());
        assertTrue(response.summary().contains(Integer.toString(count)));
    }

    @Test
    void dropsUnsafeGenericModificationSuggestionsForAnEmptyVentasModel() {
        var descriptors = Map.of(
                "cliente-id", new AiAnalysisContextService.ElementDescriptor(
                        "cliente-id", AiAnalysisContextService.ElementKind.CLASS, "Cliente"),
                "pedido-id", new AiAnalysisContextService.ElementDescriptor(
                        "pedido-id", AiAnalysisContextService.ElementKind.CLASS, "Pedido"));
        when(context.prepare("ventas", "u1", "d1")).thenReturn(
                new AiAnalysisContextService.PreparedContext("ventas", "Cliente; Pedido", descriptors));
        when(orchestrator.submitPrompt(anyString(), eq("Cliente; Pedido"))).thenReturn(CompletableFuture.completedFuture(
                "{\"suggestions\":[" +
                        "{\"category\":\"ATTRIBUTE\",\"elementId\":\"cliente-id\",\"title\":\"Agregar id\",\"reason\":\"La clase está vacía\",\"proposal\":\"Crear un atributo\",\"requiresBusinessContext\":false}," +
                        "{\"category\":\"OPERATION\",\"elementId\":\"pedido-id\",\"title\":\"Agregar cancelar\",\"reason\":\"No hay métodos\",\"proposal\":\"Crear cancelar()\",\"requiresBusinessContext\":true}," +
                        "{\"category\":\"RELATIONSHIP\",\"elementId\":null,\"title\":\"Agregar composiciÃ³n\",\"reason\":\"No hay relaciones\",\"proposal\":\"Crear una composiciÃ³n\",\"requiresBusinessContext\":true}]}"));

        var response = service.suggest("ventas", "u1", "d1");

        assertEquals(0, response.suggestions().size());
        assertTrue(response.summary().startsWith("No se encontraron sugerencias válidas"));
    }
}
