import * as React from 'react';
import {generateDefaultElement, generateSpecifiedElement} from './functions';

const PeriqlesField = ({
  field,
  specs,
  formState,
  setFormState,
  handleChange,
}: PeriqlesFieldProps) => {
  const renderField = () => {
    if (!specs) {
      return generateDefaultElement(field, formState, handleChange);
    }

    return generateSpecifiedElement(
      field,
      specs,
      formState,
      setFormState,
      handleChange,
    );
  };

  return renderField();
};

export default PeriqlesField;
