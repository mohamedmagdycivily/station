import { Expose } from 'class-transformer';
import { ValidationError } from 'class-validator';

export class ErrorItem {
  @Expose()
  message: string;
  @Expose()
  path?: string;
}

export function flattenValidationErrors(
  validationErrors: ValidationError[] = [],
  property: string,
) {
  const errors: ErrorItem[] = [];
  for (const validationError of validationErrors) {
    for (const key in validationError.constraints) {
      errors.push({
        message: validationError.constraints[key],
        path: `${property === '' ? '' : `${property}.`}${
          validationError.property
        }`,
      });
    }
    if (validationError.children?.length) {
      errors.push(
        ...flattenValidationErrors(
          validationError.children,
          `${property === '' ? '' : `${property}.`}${validationError.property}`,
        ),
      );
    }
  }
  return errors;
}
