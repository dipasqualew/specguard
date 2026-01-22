# Specguard E2E Testing

End-to-end tests for the specguard verification system.

## Exits with code 0 when steps match the tests

Verify that specguard correctly passes when all steps are implemented in order.

levels: e2e

```specguard
Run specguard against success fixture
Assert exit code is 0 for passing tests
Assert output contains passed test file
Assert summary shows 1 passed test
```

## Shows implemented steps and non-implemented steps in verbose mode

When running with the --verbose flag, it shows the individual status of each step

levels: e2e

```specguard
Run specguard against the verbose fixture
Implemented steps are rendered in green
Not implemented steps are rendered in red
```

## Fails if steps are missing

Verify that specguard fails when test files are missing required steps.

levels: e2e

```specguard
Run specguard against missing-steps fixture
Assert exit code is 1 for failing tests
Assert output indicates steps mismatch
Assert summary shows 1 failed test
```

## Fails if steps are in the wrong order

Verify that specguard fails when steps are implemented in wrong order.

levels: e2e

```specguard
Run specguard against wrong-order fixture
Assert exit code is 1 for failing tests
Assert output indicates steps mismatch
```

## Fails if the linked test file is missing

Verify that specguard reports when test files don't exist.

levels: e2e

```specguard
Run specguard against missing-file fixture
Assert exit code is 1 for missing implementation
Assert output indicates not implemented
Assert summary shows 1 not implemented
```

## Fails when additional step aren't documented in the specguard file

Verify that specguard fails when test files have extra steps not in spec.

levels: e2e

```specguard
Run specguard against extra-steps fixture
Assert exit code is 1 for step count mismatch
Assert output indicates steps mismatch
```
