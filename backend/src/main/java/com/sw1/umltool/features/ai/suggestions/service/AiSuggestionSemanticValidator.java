package com.sw1.umltool.features.ai.suggestions.service;

import com.sw1.umltool.features.ai.analysis.service.AiAnalysisContextService;

/**
 * Conservative validation for generated suggestions. Suggestions are not
 * diagram operations and must never be treated as an executable mutation.
 */
public final class AiSuggestionSemanticValidator {
    private static final java.util.Set<String> CATEGORIES = java.util.Set.of(
            "ATTRIBUTE", "OPERATION", "RELATIONSHIP", "MULTIPLICITY", "INHERITANCE",
            "NAMING", "CONSISTENCY", "GENERAL");

    public boolean accepts(String category, String elementId, boolean requiresBusinessContext,
                           AiAnalysisContextService.ElementDescriptor descriptor) {
        if (category == null || !CATEGORIES.contains(category)) return false;
        if ("GENERAL".equals(category)) return elementId == null;
        if (descriptor == null || elementId == null) return false;

        return switch (category) {
            case "ATTRIBUTE" -> requiresBusinessContext
                    && (descriptor.kind() == AiAnalysisContextService.ElementKind.CLASS
                    || descriptor.kind() == AiAnalysisContextService.ElementKind.ATTRIBUTE);
            case "NAMING" -> requiresBusinessContext
                    && (descriptor.kind() == AiAnalysisContextService.ElementKind.CLASS
                    || descriptor.kind() == AiAnalysisContextService.ElementKind.ATTRIBUTE
                    || descriptor.kind() == AiAnalysisContextService.ElementKind.METHOD);
            case "OPERATION" -> requiresBusinessContext
                    && (descriptor.kind() == AiAnalysisContextService.ElementKind.METHOD
                    || (descriptor.kind() == AiAnalysisContextService.ElementKind.CLASS && descriptor.classHasMethods()));
            case "RELATIONSHIP", "MULTIPLICITY", "INHERITANCE" -> requiresBusinessContext
                    && (descriptor.kind() == AiAnalysisContextService.ElementKind.CLASS
                    || descriptor.kind() == AiAnalysisContextService.ElementKind.RELATION);
            case "CONSISTENCY" -> true;
            default -> false;
        };
    }
}
