<?php

namespace App\Support\Swagger;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Route as RouteFacade;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;

class SwaggerDocumentationEnricher
{
    public function enrich(string $documentationPath): array
    {
        $contents = file_get_contents($documentationPath);
        if ($contents === false) {
            throw new \RuntimeException('Nao foi possivel ler o arquivo da documentacao Swagger.');
        }

        $documentation = json_decode($contents, true);
        if (!is_array($documentation)) {
            throw new \RuntimeException('O arquivo da documentacao Swagger nao contem um JSON valido.');
        }

        $stats = [
            'operations' => 0,
            'request_bodies' => 0,
            'parameters' => 0,
            'secured_operations' => 0,
        ];

        $this->ensureBearerSecurityScheme($documentation);

        foreach (RouteFacade::getRoutes() as $route) {
            $stats = $this->enrichRoute($documentation, $route, $stats);
        }

        file_put_contents(
            $documentationPath,
            json_encode($documentation, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        return $stats;
    }

    private function enrichRoute(array &$documentation, Route $route, array $stats): array
    {
        $action = $route->getActionName();
        if ($action === 'Closure' || !str_contains($action, '@')) {
            return $stats;
        }

        [$controllerClass, $methodName] = explode('@', $action, 2);
        if (!class_exists($controllerClass) || !method_exists($controllerClass, $methodName)) {
            return $stats;
        }

        $reflectionMethod = new ReflectionMethod($controllerClass, $methodName);

        $candidatePaths = array_values(array_unique(array_filter([
            '/' . ltrim($route->uri(), '/'),
            $this->extractOpenApiPath($reflectionMethod),
        ])));

        if ($candidatePaths === []) {
            return $stats;
        }

        foreach ($candidatePaths as $path) {
            if (!isset($documentation['paths'][$path])) {
                continue;
            }

            $routeOperationKeys = array_map(
                static fn (string $method) => strtolower($method),
                array_diff($route->methods(), ['HEAD'])
            );

            $operationKeys = array_values(array_intersect(array_keys($documentation['paths'][$path]), $routeOperationKeys));
            if ($operationKeys === []) {
                $operationKeys = array_keys($documentation['paths'][$path]);
            }

            foreach ($operationKeys as $operationKey) {
                $httpMethod = strtoupper($operationKey);

                if (!isset($documentation['paths'][$path][$operationKey])) {
                    continue;
                }

                $operation = &$documentation['paths'][$path][$operationKey];
                $stats['operations']++;

                $stats['parameters'] += $this->mergeOperationParameters(
                    $operation,
                    $this->buildPathParameters($route),
                );

                $requestMetadata = $this->buildRequestMetadata($reflectionMethod, $operationKey);

                if ($requestMetadata['requestBody'] !== null && empty($operation['requestBody'])) {
                    $operation['requestBody'] = $requestMetadata['requestBody'];
                    $stats['request_bodies']++;
                }

                $stats['parameters'] += $this->mergeOperationParameters(
                    $operation,
                    $requestMetadata['parameters'],
                );

                if ($this->routeUsesSanctum($route) && empty($operation['security'])) {
                    $operation['security'] = [
                        ['bearerAuth' => []],
                    ];
                    $stats['secured_operations']++;
                }

                unset($operation);
            }
        }

        return $stats;
    }

    private function extractOpenApiPath(ReflectionMethod $method): ?string
    {
        $docComment = $method->getDocComment();
        if ($docComment === false) {
            return null;
        }

        if (!preg_match('/path\s*=\s*"([^"]+)"/', $docComment, $matches)) {
            return null;
        }

        return '/' . ltrim($matches[1], '/');
    }

    private function ensureBearerSecurityScheme(array &$documentation): void
    {
        $documentation['components'] ??= [];
        $documentation['components']['securitySchemes'] ??= [];
        $documentation['components']['securitySchemes']['bearerAuth'] ??= [
            'type' => 'http',
            'scheme' => 'bearer',
            'bearerFormat' => 'Token',
            'description' => 'Informe o token no formato Bearer <token>.',
        ];
    }

    private function buildPathParameters(Route $route): array
    {
        $parameters = [];

        foreach ($route->parameterNames() as $parameterName) {
            $schema = ['type' => $this->inferPathParameterType($parameterName)];

            $parameters[] = [
                'name' => $parameterName,
                'in' => 'path',
                'required' => true,
                'description' => 'Parametro de rota ' . $parameterName . '.',
                'schema' => $schema,
            ];
        }

        return $parameters;
    }

    private function inferPathParameterType(string $parameterName): string
    {
        return str_ends_with(strtolower($parameterName), 'id') || str_starts_with(strtolower($parameterName), 'id')
            ? 'integer'
            : 'string';
    }

    private function buildRequestMetadata(ReflectionMethod $method, string $httpMethod): array
    {
        $parameters = [];
        $requestBody = null;

        foreach ($method->getParameters() as $parameter) {
            $type = $parameter->getType();
            if (!$type instanceof ReflectionNamedType || $type->isBuiltin()) {
                continue;
            }

            $parameterClass = $type->getName();

            if (is_subclass_of($parameterClass, FormRequest::class)) {
                $rules = (new $parameterClass())->rules();
                $schema = $this->buildSchemaFromRules($rules);

                if ($this->shouldUseQueryParameters($httpMethod, $schema)) {
                    $parameters = array_merge($parameters, $this->buildQueryParametersFromSchema($schema));
                    continue;
                }

                $requestBody = $this->buildRequestBodyFromSchema($schema);
                continue;
            }

            if (is_a($parameterClass, Request::class, true)) {
                $inferred = $this->inferRequestUsageFromSource($method, $httpMethod);
                $parameters = array_merge($parameters, $inferred['parameters']);

                if ($requestBody === null) {
                    $requestBody = $inferred['requestBody'];
                }
            }
        }

        return [
            'parameters' => $parameters,
            'requestBody' => $requestBody,
        ];
    }

    private function shouldUseQueryParameters(string $httpMethod, array $schema): bool
    {
        if (!in_array($httpMethod, ['get', 'delete'], true)) {
            return false;
        }

        return !$this->schemaContainsBinary($schema);
    }

    private function buildRequestBodyFromSchema(array $schema): array
    {
        $contentType = $this->schemaContainsBinary($schema) ? 'multipart/form-data' : 'application/json';

        return [
            'required' => !empty($schema['required']),
            'content' => [
                $contentType => [
                    'schema' => $schema,
                ],
            ],
        ];
    }

    private function schemaContainsBinary(array $schema): bool
    {
        if (($schema['format'] ?? null) === 'binary') {
            return true;
        }

        foreach (($schema['properties'] ?? []) as $property) {
            if (is_array($property) && $this->schemaContainsBinary($property)) {
                return true;
            }
        }

        if (isset($schema['items']) && is_array($schema['items'])) {
            return $this->schemaContainsBinary($schema['items']);
        }

        return false;
    }

    private function buildQueryParametersFromSchema(array $schema): array
    {
        $parameters = [];
        $required = $schema['required'] ?? [];

        foreach (($schema['properties'] ?? []) as $name => $propertySchema) {
            $parameters[] = [
                'name' => $name,
                'in' => 'query',
                'required' => in_array($name, $required, true),
                'schema' => $this->normalizeSchemaForParameter($propertySchema),
            ];
        }

        return $parameters;
    }

    private function normalizeSchemaForParameter(array $schema): array
    {
        return Arr::except($schema, ['properties', 'required']);
    }

    private function buildSchemaFromRules(array $rules): array
    {
        $schema = [
            'type' => 'object',
            'properties' => [],
        ];

        foreach ($rules as $field => $fieldRules) {
            $ruleList = $this->normalizeRules($fieldRules);
            $metadata = $this->buildPropertySchemaFromRules($ruleList);
            $this->applyFieldSchema($schema, $field, $metadata, in_array('required', $ruleList, true));
        }

        if (empty($schema['required'])) {
            unset($schema['required']);
        }

        return $schema;
    }

    private function normalizeRules(mixed $rules): array
    {
        if (is_string($rules)) {
            return array_values(array_filter(explode('|', $rules)));
        }

        return array_map(function ($rule) {
            if (is_string($rule)) {
                return $rule;
            }

            if (method_exists($rule, '__toString')) {
                return (string) $rule;
            }

            return class_basename($rule);
        }, is_array($rules) ? $rules : [$rules]);
    }

    private function buildPropertySchemaFromRules(array $rules): array
    {
        $schema = [
            'type' => 'string',
        ];

        foreach ($rules as $rule) {
            $name = $rule;
            $arguments = null;

            if (str_contains($rule, ':')) {
                [$name, $arguments] = explode(':', $rule, 2);
            }

            $name = strtolower($name);

            switch ($name) {
                case 'integer':
                    $schema['type'] = 'integer';
                    break;
                case 'numeric':
                case 'decimal':
                    $schema['type'] = 'number';
                    break;
                case 'boolean':
                    $schema['type'] = 'boolean';
                    break;
                case 'array':
                    $schema['type'] = 'array';
                    $schema['items'] ??= ['type' => 'string'];
                    break;
                case 'file':
                case 'image':
                    $schema['type'] = 'string';
                    $schema['format'] = 'binary';
                    break;
                case 'email':
                    $schema['type'] = 'string';
                    $schema['format'] = 'email';
                    break;
                case 'date':
                    $schema['type'] = 'string';
                    $schema['format'] = 'date';
                    break;
                case 'datetime':
                case 'date_format':
                    $schema['type'] = 'string';
                    $schema['format'] = 'date-time';
                    break;
                case 'json':
                    $schema['type'] = 'string';
                    $schema['description'] = trim(($schema['description'] ?? '') . ' JSON em formato string.');
                    break;
                case 'min':
                    $this->applyMinConstraint($schema, $arguments);
                    break;
                case 'max':
                    $this->applyMaxConstraint($schema, $arguments);
                    break;
                case 'in':
                    $schema['enum'] = array_values(array_filter(explode(',', (string) $arguments)));
                    break;
                case 'mimes':
                    $schema['description'] = trim(($schema['description'] ?? '') . ' Tipos aceitos: ' . $arguments . '.');
                    break;
            }
        }

        if (($schema['type'] ?? null) === 'array' && !isset($schema['items'])) {
            $schema['items'] = ['type' => 'string'];
        }

        return $schema;
    }

    private function applyMinConstraint(array &$schema, ?string $value): void
    {
        if ($value === null || !is_numeric($value)) {
            return;
        }

        $numericValue = (int) $value;

        if (($schema['type'] ?? null) === 'string') {
            $schema['minLength'] = $numericValue;
            return;
        }

        if (($schema['type'] ?? null) === 'array') {
            $schema['minItems'] = $numericValue;
            return;
        }

        $schema['minimum'] = $numericValue;
    }

    private function applyMaxConstraint(array &$schema, ?string $value): void
    {
        if ($value === null || !is_numeric($value)) {
            return;
        }

        $numericValue = (int) $value;

        if (($schema['type'] ?? null) === 'string') {
            $schema['maxLength'] = $numericValue;
            return;
        }

        if (($schema['type'] ?? null) === 'array') {
            $schema['maxItems'] = $numericValue;
            return;
        }

        $schema['maximum'] = $numericValue;
    }

    private function applyFieldSchema(array &$rootSchema, string $field, array $propertySchema, bool $required): void
    {
        $segments = explode('.', $field);
        $current =& $rootSchema;

        foreach ($segments as $index => $segment) {
            $isLast = $index === count($segments) - 1;
            $nextSegment = $segments[$index + 1] ?? null;

            if ($segment === '*') {
                $current['items'] ??= ['type' => 'object', 'properties' => []];
                $current =& $current['items'];
                $current['type'] ??= 'object';
                $current['properties'] ??= [];
                continue;
            }

            $current['properties'] ??= [];
            $current['properties'][$segment] ??= [];

            if ($isLast) {
                $current['properties'][$segment] = array_merge($current['properties'][$segment], $propertySchema);

                if ($required) {
                    $current['required'] ??= [];
                    if (!in_array($segment, $current['required'], true)) {
                        $current['required'][] = $segment;
                    }
                }

                break;
            }

            if ($nextSegment === '*') {
                $current['properties'][$segment]['type'] = 'array';
                $current['properties'][$segment]['items'] ??= ['type' => 'object', 'properties' => []];
            } else {
                $current['properties'][$segment]['type'] = 'object';
                $current['properties'][$segment]['properties'] ??= [];
            }

            $current =& $current['properties'][$segment];
        }
    }

    private function inferRequestUsageFromSource(ReflectionMethod $method, string $httpMethod): array
    {
        $source = $this->readMethodSource($method);
        $bodyFields = [];
        $queryFields = [];

        preg_match_all("/->input\(\s*'([^']+)'/", $source, $inputMatches);
        preg_match_all("/->query\(\s*'([^']+)'/", $source, $queryMatches);
        preg_match_all("/->file\(\s*'([^']+)'/", $source, $fileMatches);

        foreach ($inputMatches[1] ?? [] as $field) {
            if (in_array($httpMethod, ['get', 'delete'], true)) {
                $queryFields[$field] = ['type' => 'string'];
            } else {
                $bodyFields[$field] = ['type' => 'string'];
            }
        }

        foreach ($queryMatches[1] ?? [] as $field) {
            $queryFields[$field] = ['type' => 'string'];
        }

        foreach ($fileMatches[1] ?? [] as $field) {
            $bodyFields[$field] = ['type' => 'string', 'format' => 'binary'];
        }

        $parameters = [];
        foreach ($queryFields as $field => $schema) {
            $parameters[] = [
                'name' => $field,
                'in' => 'query',
                'required' => false,
                'schema' => $schema,
            ];
        }

        $requestBody = null;
        if ($bodyFields !== []) {
            $schema = [
                'type' => 'object',
                'properties' => $bodyFields,
            ];

            $requestBody = $this->buildRequestBodyFromSchema($schema);
        }

        return [
            'parameters' => $parameters,
            'requestBody' => $requestBody,
        ];
    }

    private function readMethodSource(ReflectionMethod $method): string
    {
        $fileName = $method->getFileName();
        if ($fileName === false) {
            return '';
        }

        $lines = file($fileName);
        if ($lines === false) {
            return '';
        }

        return implode('', array_slice(
            $lines,
            $method->getStartLine() - 1,
            $method->getEndLine() - $method->getStartLine() + 1,
        ));
    }

    private function routeUsesSanctum(Route $route): bool
    {
        foreach ($route->gatherMiddleware() as $middleware) {
            if (str_contains($middleware, 'sanctum')) {
                return true;
            }
        }

        return false;
    }

    private function mergeOperationParameters(array &$operation, array $parameters): int
    {
        if ($parameters === []) {
            return 0;
        }

        $operation['parameters'] ??= [];
        $existingKeys = [];

        foreach ($operation['parameters'] as $existingParameter) {
            $existingKeys[$this->parameterKey($existingParameter)] = true;
        }

        $added = 0;

        foreach ($parameters as $parameter) {
            $key = $this->parameterKey($parameter);
            if (isset($existingKeys[$key])) {
                continue;
            }

            $operation['parameters'][] = $parameter;
            $existingKeys[$key] = true;
            $added++;
        }

        return $added;
    }

    private function parameterKey(array $parameter): string
    {
        return strtolower((string) ($parameter['in'] ?? '')) . ':' . strtolower((string) ($parameter['name'] ?? ''));
    }
}