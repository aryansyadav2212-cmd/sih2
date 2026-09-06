/**
 * External Evidence Service Module
 *
 * This module provides functionality to search for and retrieve external
 * evidence about projects from the web. It uses Tavily API to search
 * for relevant news and official sources, then filters and validates
 * the results to ensure high-quality, relevant evidence.
 *
 * The service follows a structured flow:
 * 1. Builds a search query from project information
 * 2. Searches Tavily API for relevant articles
 * 3. Filters results for quality and relevance
 * 4. Validates source credibility
 * 5. Deduplicates and ranks results
 * 6. Returns structured evidence for the project
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Project information required for evidence search.
 */
interface Project {
    projectCode: string;
    projectName: string;
    agency: string;
    state: string;
}

/**
 * Request payload for Tavily search API.
 */
interface TavilySearchRequest {
    query: string;
    topic: "general";
    search_depth: "basic";
    max_results: 5;
    include_answer: false;
    include_raw_content: false;
    include_images: false;
}

/**
 * Individual search result from Tavily.
 */
interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

/**
 * Response from Tavily search API.
 */
interface TavilySearchResponse {
    query: string;
    results: TavilySearchResult[];
}

/**
 * Internal search candidate representation.
 */
interface SearchCandidate {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
}

/**
 * Structured external evidence for the project.
 */
export interface ExternalEvidence {
    title: string;
    source: string;
    url: string;
    date: string;
    claim: string;
    quality: "high" | "medium";
}

// ============================================================================
// Configuration
// ============================================================================

/** Tavily API endpoint for search */
const TAVILY_URL = "https://api.tavily.com/search";

/** Maximum number of search results to retrieve */
const MAX_RESULTS = 5;

/** Official government domain suffixes for quality filtering */
const OFFICIAL_DOMAIN_SUFFIXES = [
    ".gov.in",
    ".nic.in",
];

/** Trusted news domains for quality filtering */
const TRUSTED_NEWS_DOMAINS = new Set([
    "thehindu.com",
    "indianexpress.com",
    "hindustantimes.com",
    "timesofindia.indiatimes.com",
    "economictimes.indiatimes.com",
    "business-standard.com",
    "reuters.com",
    "theprint.in",
    "ndtv.com",
    "news18.com",
    "deccanherald.com",
    "telegraphindia.com",
    "financialexpress.com",
    "moneycontrol.com",
]);

/** Keywords for filtering relevant project issues */
const ISSUE_TERMS = [
    "delay",
    "delayed",
    "deadline",
    "completion",
    "approval",
    "construction",
    "progress",
    "funding",
    "land",
    "tender",
    "procurement",
    "contract",
    "work",
    "project",
    "schedule",
];

// ============================================================================
// Private Helper Functions - Configuration & Utilities
// ============================================================================

/**
 * Retrieves the Tavily API key from environment variables.
 *
 * @returns The Tavily API key
 * @throws {Error} If the API key is not configured
 *
 * @internal
 */
function getApiKey(): string {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured");
    }

    return apiKey;
}

/**
 * Extracts the hostname from a URL.
 *
 * @param url - The URL to parse
 * @returns The hostname or null if parsing fails
 *
 * @internal
 */
function getHostname(url: string): string | null {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Gets the base domain by removing 'www.' prefix.
 *
 * @param hostname - The hostname to process
 * @returns The base domain
 *
 * @internal
 */
function getBaseDomain(hostname: string): string {
    return hostname
        .replace(/^www\./, "")
        .toLowerCase();
}

/**
 * Checks if a hostname belongs to an official government domain.
 *
 * @param hostname - The hostname to check
 * @returns True if official domain, false otherwise
 *
 * @internal
 */
function isOfficialDomain(hostname: string): boolean {
    return OFFICIAL_DOMAIN_SUFFIXES.some(
        (suffix) =>
            hostname === suffix.slice(1) ||
            hostname.endsWith(suffix)
    );
}

/**
 * Checks if a hostname belongs to a trusted news domain.
 *
 * @param hostname - The hostname to check
 * @returns True if trusted domain, false otherwise
 *
 * @internal
 */
function isTrustedNewsDomain(hostname: string): boolean {
    const domain = getBaseDomain(hostname);

    return Array.from(TRUSTED_NEWS_DOMAINS).some(
        (trustedDomain) =>
            domain === trustedDomain ||
            domain.endsWith(`.${trustedDomain}`)
    );
}

/**
 * Determines the quality level of a source based on its domain.
 *
 * @param url - The URL to evaluate
 * @returns Quality level: "high", "medium", or null
 *
 * @internal
 */
function getSourceQuality(
    url: string
): "high" | "medium" | null {
    const hostname = getHostname(url);

    if (!hostname) {
        return null;
    }

    if (isOfficialDomain(hostname)) {
        return "high";
    }

    if (isTrustedNewsDomain(hostname)) {
        return "medium";
    }

    return null;
}

// ============================================================================
// Private Helper Functions - Text Processing
// ============================================================================

/**
 * Normalizes text by lowercasing and removing special characters.
 *
 * @param value - The text to normalize
 * @returns Normalized text
 *
 * @internal
 */
function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Extracts meaningful tokens from a project name.
 *
 * Filters out common words and short tokens to get distinctive terms.
 *
 * @param projectName - The project name to tokenize
 * @returns Array of meaningful tokens
 *
 * @internal
 */
function getProjectNameTokens(projectName: string): string[] {
    const ignoredTerms = new Set([
        "construction",
        "new",
        "building",
        "works",
        "including",
        "miscellaneous",
        "maintenance",
        "operations",
        "and",
        "the",
        "of",
        "at",
        "for",
        "project",
    ]);

    return normalizeText(projectName)
        .split(" ")
        .filter(
            (token) =>
                token.length >= 4 &&
                !ignoredTerms.has(token)
        )
        .slice(0, 8);
}

// ============================================================================
// Private Helper Functions - Query Building
// ============================================================================

/**
 * Builds an optimized search query for Tavily.
 *
 * Combines project code, name tokens, state, and issue terms
 * for comprehensive search coverage.
 *
 * @param project - Project information
 * @returns Optimized search query string
 *
 * @internal
 */
function buildSearchQuery(project: Project): string {
    const projectNameTokens =
        getProjectNameTokens(project.projectName);

    const projectNamePart =
        projectNameTokens.length > 0
            ? `"${projectNameTokens.join(" ")}"`
            : `"${project.projectName}"`;

    return [
        `"${project.projectCode}"`,
        projectNamePart,
        `"${project.state}"`,
        ISSUE_TERMS.join(" OR "),
    ].join(" ");
}

// ============================================================================
// Private Helper Functions - Candidate Filtering
// ============================================================================

/**
 * Checks if a candidate is relevant to the project.
 *
 * Requires either exact project code match or multiple
 * distinctive project name tokens.
 *
 * @param candidate - Search candidate to check
 * @param project - Project information
 * @returns True if relevant, false otherwise
 *
 * @internal
 */
function isRelevantCandidate(
    candidate: SearchCandidate,
    project: Project
): boolean {
    const text = normalizeText(
        `${candidate.title} ${candidate.content}`
    );

    const projectCode =
        normalizeText(project.projectCode);

    // Strongest signal: exact project code match
    if (projectCode && text.includes(projectCode)) {
        return true;
    }

    // If project code isn't present, require multiple distinctive tokens
    const projectTokens =
        getProjectNameTokens(project.projectName);

    if (projectTokens.length === 0) {
        return false;
    }

    const matchingTokens =
        projectTokens.filter((token) =>
            text.includes(token)
        );

    return matchingTokens.length >= 3;
}

/**
 * Checks if a candidate contains relevant issue terms.
 *
 * @param candidate - Search candidate to check
 * @returns True if contains relevant issue terms, false otherwise
 *
 * @internal
 */
function containsRelevantIssue(
    candidate: SearchCandidate
): boolean {
    const text = normalizeText(
        `${candidate.title} ${candidate.content}`
    );

    return ISSUE_TERMS.some((term) =>
        text.includes(term)
    );
}

// ============================================================================
// Private Helper Functions - Date Handling
// ============================================================================

/**
 * Parses a published date string to ISO format.
 *
 * @param publishedDate - Date string to parse
 * @returns ISO date string (YYYY-MM-DD) or null
 *
 * @internal
 */
function parsePublishedDate(
    publishedDate?: string
): string | null {
    if (!publishedDate) {
        return null;
    }

    const date = new Date(publishedDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

/**
 * Checks if a published date is recent enough (within 180 days).
 *
 * @param publishedDate - Date to check
 * @returns True if recent enough, false otherwise
 *
 * @internal
 */
function isRecentEnough(
    publishedDate?: string
): boolean {
    if (!publishedDate) {
        // Don't reject sources without a publication date
        return true;
    }

    const date = new Date(publishedDate);

    if (Number.isNaN(date.getTime())) {
        return true;
    }

    const now = Date.now();

    const ageInDays =
        (now - date.getTime()) /
        (1000 * 60 * 60 * 24);

    return ageInDays <= 180;
}

// ============================================================================
// Private Helper Functions - Deduplication
// ============================================================================

/**
 * Normalizes a URL by removing tracking parameters and hash fragments.
 *
 * @param url - URL to normalize
 * @returns Normalized URL
 *
 * @internal
 */
function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);

        parsed.hash = "";

        const trackingParameters = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "gclid",
        ];

        for (const parameter of trackingParameters) {
            parsed.searchParams.delete(parameter);
        }

        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Deduplicates search candidates by URL and content similarity.
 *
 * @param candidates - List of candidates to deduplicate
 * @returns Deduplicated list of candidates
 *
 * @internal
 */
function deduplicateCandidates(
    candidates: SearchCandidate[]
): SearchCandidate[] {
    const seenUrls = new Set<string>();
    const seenContent = new Set<string>();

    const unique: SearchCandidate[] = [];

    for (const candidate of candidates) {
        const normalizedUrl =
            normalizeUrl(candidate.url);

        const normalizedContent =
            normalizeText(candidate.content);

        if (
            seenUrls.has(normalizedUrl) ||
            (
                normalizedContent.length > 80 &&
                seenContent.has(normalizedContent)
            )
        ) {
            continue;
        }

        seenUrls.add(normalizedUrl);

        if (normalizedContent.length > 80) {
            seenContent.add(normalizedContent);
        }

        unique.push(candidate);
    }

    return unique;
}

// ============================================================================
// Private Helper Functions - Tavily API
// ============================================================================

/**
 * Searches Tavily API for project-related articles.
 *
 * @param project - Project information
 * @returns List of search candidates
 *
 * @internal
 */
async function searchTavily(
    project: Project
): Promise<SearchCandidate[]> {
    const apiKey = getApiKey();

    const query = buildSearchQuery(project);

    // TEMPORARY DEBUG LOG
    console.log("\n========== TAVILY SEARCH ==========");
    console.log("Project:", project.projectCode);
    console.log("Project name:", project.projectName);
    console.log("Query:", query);

    const requestBody: TavilySearchRequest = {
        query,
        topic: "general",
        search_depth: "basic",
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
    };

    let response: Response;

    try {
        response = await fetch(TAVILY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        console.error(
            "Tavily request failed:",
            error
        );

        return [];
    }

    console.log(
        "Tavily HTTP status:",
        response.status
    );

    if (!response.ok) {
        console.error(
            `Tavily returned HTTP ${response.status}`
        );

        return [];
    }

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        console.error(
            "Tavily returned invalid JSON"
        );

        return [];
    }

    if (
        typeof data !== "object" ||
        data === null ||
        !("results" in data)
    ) {
        console.error(
            "Tavily response has an unexpected shape"
        );

        return [];
    }

    const tavilyResponse =
        data as TavilySearchResponse;

    if (!Array.isArray(tavilyResponse.results)) {
        console.error(
            "Tavily results is not an array"
        );

        return [];
    }

    console.log(
        "Tavily raw results:",
        tavilyResponse.results.length
    );

    const candidates = tavilyResponse.results
        .filter(
            (result) =>
                typeof result.title === "string" &&
                typeof result.url === "string" &&
                typeof result.content === "string" &&
                typeof result.score === "number"
        )
        .map((result) => ({
            title: result.title.trim(),
            url: result.url.trim(),
            content: result.content.trim(),
            score: result.score,
            publishedDate:
                parsePublishedDate(
                    result.published_date
                ) ?? undefined,
        }));

    console.log(
        "Tavily valid candidates:",
        candidates.length
    );

    console.log(
        "Tavily candidate details:"
    );

    candidates.forEach(
        (candidate, index) => {
            console.log(
                `${index + 1}.`,
                {
                    title: candidate.title,
                    url: candidate.url,
                    score: candidate.score,
                    publishedDate:
                        candidate.publishedDate,
                }
            );
        }
    );

    console.log("===================================\n");

    return candidates;
}

// ============================================================================
// Private Helper Functions - Evidence Building
// ============================================================================

/**
 * Builds a structured ExternalEvidence object from a candidate.
 *
 * @param candidate - Search candidate
 * @param quality - Source quality level
 * @returns ExternalEvidence object or null
 *
 * @internal
 */
function buildEvidence(
    candidate: SearchCandidate,
    quality: "high" | "medium"
): ExternalEvidence | null {
    const hostname =
        getHostname(candidate.url);

    if (!hostname) {
        return null;
    }

    const date =
        candidate.publishedDate ??
        new Date().toISOString().slice(0, 10);

    const claim =
        candidate.content.trim();

    if (!claim) {
        return null;
    }

    return {
        title: candidate.title,
        source: hostname,
        url: normalizeUrl(candidate.url),
        date,
        claim,
        quality,
    };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Searches for project-related candidates from external sources.
 *
 * This function:
 * 1. Searches Tavily API for project-related articles
 * 2. Deduplicates the results
 * 3. Returns the filtered candidates
 *
 * @param project - Project information
 * @returns List of unique search candidates
 *
 * @example
 * ```typescript
 * const candidates = await searchProjectCandidates({
 *   projectCode: "PROJ-123",
 *   projectName: "Highway Construction Project",
 *   agency: "Department of Transportation",
 *   state: "California"
 * });
 * ```
 */
export async function searchProjectCandidates(
    project: Project
): Promise<SearchCandidate[]> {
    const candidates =
        await searchTavily(project);

    const uniqueCandidates =
        deduplicateCandidates(candidates);

    console.log(
        "Candidates after deduplication:",
        uniqueCandidates.length
    );

    return uniqueCandidates;
}

/**
 * Finds and validates external evidence for a project.
 *
 * This is the main entry point for retrieving external evidence.
 * It performs comprehensive filtering and validation:
 *
 * 1. Searches for candidates using Tavily
 * 2. Filters by source quality (official domains = high, trusted news = medium)
 * 3. Validates project relevance (code or token matching)
 * 4. Checks for relevant issue terms
 * 5. Applies recency filter for medium-quality sources
 * 6. Builds structured evidence objects
 * 7. Returns up to 3 pieces of evidence
 *
 * @param project - Project information
 * @returns List of validated external evidence
 *
 * @throws {Error} If Tavily API key is not configured
 *
 * @example
 * ```typescript
 * // Basic usage
 * const evidence = await findProjectEvidence({
 *   projectCode: "PROJ-123",
 *   projectName: "Highway Construction Project",
 *   agency: "Department of Transportation",
 *   state: "California"
 * });
 *
 * for (const item of evidence) {
 *   console.log(`Title: ${item.title}`);
 *   console.log(`Source: ${item.source}`);
 *   console.log(`Quality: ${item.quality}`);
 *   console.log(`Claim: ${item.claim}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using in the intelligence pipeline
 * const project = {
 *   projectCode: "PROJ-123",
 *   projectName: "Highway Construction Project",
 *   agency: "Department of Transportation",
 *   state: "California"
 * };
 *
 * const evidence = await findProjectEvidence(project);
 *
 * // Use evidence in LLM request
 * const request = {
 *   project,
 *   prediction: predictionResult,
 *   context: projectContext,
 *   reasons: predictionReasons,
 *   externalEvidence: evidence
 * };
 *
 * const recommendation = await generateRecommendation(request);
 * ```
 */
export async function findProjectEvidence(
    project: Project
): Promise<ExternalEvidence[]> {
    // ------------------------------------------------------------------------
    // Step 1: Search for Candidates
    // ------------------------------------------------------------------------
    // Search Tavily API for project-related articles
    const candidates =
        await searchProjectCandidates(project);

    console.log(
        "\n========== EVIDENCE VALIDATION =========="
    );

    console.log(
        "Total candidates:",
        candidates.length
    );

    // ------------------------------------------------------------------------
    // Step 2: Validate and Filter Candidates
    // ------------------------------------------------------------------------
    const validated: ExternalEvidence[] = [];

    for (const candidate of candidates) {
        console.log(
            "\nChecking candidate:",
            candidate.title
        );

        console.log(
            "URL:",
            candidate.url
        );

        // Check source quality
        const quality =
            getSourceQuality(candidate.url);

        // Reject unknown/untrusted sources
        if (!quality) {
            console.log(
                "Rejected: unknown/untrusted domain"
            );

            continue;
        }

        console.log(
            "Source quality:",
            quality
        );

        // Check project relevance
        if (
            !isRelevantCandidate(
                candidate,
                project
            )
        ) {
            console.log(
                "Rejected: project mismatch"
            );

            continue;
        }

        console.log(
            "Project match: YES"
        );

        // Check for relevant issue terms
        if (!containsRelevantIssue(candidate)) {
            console.log(
                "Rejected: no relevant issue term"
            );

            continue;
        }

        console.log(
            "Relevant issue: YES"
        );

        // Apply recency filter for medium-quality sources
        if (
            quality === "medium" &&
            !isRecentEnough(
                candidate.publishedDate
            )
        ) {
            console.log(
                "Rejected: stale medium-quality source"
            );

            continue;
        }

        console.log(
            "Recency check: PASSED"
        );

        // Build evidence object
        const evidence =
            buildEvidence(
                candidate,
                quality
            );

        if (!evidence) {
            console.log(
                "Rejected: unable to build evidence"
            );

            continue;
        }

        validated.push(evidence);

        console.log(
            "ACCEPTED AS EVIDENCE"
        );
    }

    console.log(
        "\nValidated evidence:",
        validated.length
    );

    console.log(
        "==========================================\n"
    );

    // ------------------------------------------------------------------------
    // Step 3: Return Limited Evidence
    // ------------------------------------------------------------------------
    // Keep the evidence payload deliberately small
    return validated.slice(0, 3);
}