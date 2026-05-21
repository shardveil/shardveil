import { ZodError } from 'zod';

const errors = new ZodError([
  {
    code: 'invalid_string',
    validation: 'email',
    message: 'Invalid email',
    path: ['email'],
    expected: 'email',
    received: 'string',
  },
  {
    code: 'too_small',
    minimum: 5,
    type: 'string',
    message: 'String must contain at least 5 character(s)',
    path: ['password'],
    inclusive: true,
  },
]);

try {
  const flattened = errors.flatten();
  console.log('SUCCESS: flatten() exists and works');
  console.log('Has fieldErrors:', 'fieldErrors' in flattened);
  if ('fieldErrors' in flattened) {
    console.log('fieldErrors type:', typeof flattened.fieldErrors);
    console.log('fieldErrors keys:', Object.keys(flattened.fieldErrors));
  }
} catch (e) {
  console.log('ERROR: flatten() does not exist or failed');
  console.log('Error:', e.message);
  console.log('Has treeifyError available?', typeof ZodError === 'function');
}
