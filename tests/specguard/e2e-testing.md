# Specguard E2E Testing

End-to-end tests for the specguard verification system.

## Test Success Case

Verify that specguard correctly passes when all steps are implemented in order.

levels: e2e

```specguard
Run specguard against success fixture
Assert exit code is 0 for passing tests
Assert output contains passed test file
Assert summary shows 1 passed test
```

## Test Missing Steps

Verify that specguard fails when test files are missing required steps.

levels: e2e

```specguard
Run specguard against missing-steps fixture
Assert exit code is 1 for failing tests
Assert output indicates steps mismatch
Assert summary shows 1 failed test
```

## Test Wrong Step Order

Verify that specguard fails when steps are implemented in wrong order.

levels: e2e

```specguard
Run specguard against wrong-order fixture
Assert exit code is 1 for failing tests
Assert output indicates steps mismatch
```

## Test Missing Test File

Verify that specguard reports when test files don't exist.

levels: e2e

```specguard
Run specguard against missing-file fixture
Assert exit code is 1 for missing implementation
Assert output indicates not implemented
Assert summary shows 1 not implemented
```

## Test Extra Steps

Verify that specguard fails when test files have extra steps not in spec.

levels: e2e

```specguard
Run specguard against extra-steps fixture
Assert exit code is 1 for step count mismatch
Assert output indicates steps mismatch
```
