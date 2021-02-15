// import {any} from 'prop-types';
import React, {useState} from 'react';
import {commitMutation} from 'react-relay';

const fieldsArrayGenerator = (
  inputType: InputType,
  args: PeriqlesMutationArgs = {},
): PeriqlesField[] => {
  if (!inputType || !inputType.inputFields) {
    console.error('ERROR at PeriqlesForm: mutation input type is undefined.');
    return [];
  }

  const fieldsArray: Array<PeriqlesField> = [];

  inputType.inputFields.forEach((field) => {
    // exclude from the form any inputs accounted for by args
    if (args[field.name]) return;

    let fieldObj: PeriqlesField = {
      name: field.name,
    };

    //check the field.type.kind to see if the field is NON_NULL (required)
    //if so, set fieldObj.required to true
    fieldObj.required = field.type.kind === 'NON_NULL';

    // the input field is a scalar, nullable type
    if (field.type.name && field.type.kind === 'SCALAR') {
      fieldObj.type = field.type.name;
    }

    // the input field is an enumerated type (whether or not wrapped in a NON_NULL type)
    else if (field.type.kind === 'ENUM' || field.type.ofType?.kind === 'ENUM') {
      fieldObj.type = 'Enum';
      try {
        const optionsArr =
          field.type.enumValues || field.type.ofType?.enumValues || [];
        // provide each option a type property
        fieldObj.options = optionsArr.map((option: EnumValue) => {
          let value, type;

          switch (typeof option.name) {
            case 'number':
            case 'bigint':
              value = option.name;
              type = 'Int';
              break;
            case 'boolean':
              // stringify booleans b/c HTML typing doesn't allow for boolean value attributes
              value = `${option.name}`;
              type = 'Boolean';
              break;
            default:
              value = option.name;
              type = 'String';
          }

          const mappedOption: PeriqlesFieldOption = {
            name: `${option.name}`,
            label: `${option.name}`,
            value,
            type,
          };

          return mappedOption;
        });
      } catch (err) {
        console.error(
          'ERROR at PeriqlesForm: Failure to assign enumerated field.',
          err,
        );
      }
    }
    // the input field is a scalar wrapped in a NON_NULL type
    else if (field.type.ofType?.name && field.type.ofType?.kind === 'SCALAR') {
      // TODO
      fieldObj.type = field.type.ofType.name;
    }
    // TODO: the input field is not a scalar or enum type
    else {
      console.warn(
        `The '${field.name}' input field is of a complex type not currently supported by PeriqlesForm. It will default to a 'String'. Type:`,
        field,
      );
      fieldObj.type = 'String';
    }

    fieldsArray.push(fieldObj);
  });

  return fieldsArray;
};

/**
 * A functional component with input fields corresponding to the input fields of a Relay mutation.
 * @param {String} mutationName (REQUIRED) The name of a mutation exactly as written on the Relay schema.
 * @param {String} mutationGQL (REQUIRED) The GraphQL query string representing the mutation.
 * @param {Object} specifications Optional parameters to specify the form's elements.
 * @param {[Object]} args Optional input values for the mutation, represented as objects with the shape {[nameOfInputField]: value}. Input fields represented here will not be represented on the form.
 * @return HTML
 */

const PeriqlesFormContent = ({
  environment,
  mutationName,
  mutationGQL,
  specifications = {fields: {}},
  args = {},
  inputType,
  callbacks,
}: PeriqlesFormContentProps): JSX.Element => {
  if (!inputType || !inputType.inputFields) {
    console.error('ERROR at PeriqlesForm: mutation input type is undefined.');
    return <p>! ERROR !</p>;
  }
  // STATE
  // intuit input fields from mutation's input type schema
  const fields: PeriqlesField[] = fieldsArrayGenerator(inputType, args);

  // assign an initial state for each field that reflects its data type
  const initialState = {};
  fields.forEach((field: PeriqlesField) => {
    let initialValue;
    switch (field.type) {
      case 'String':
        initialValue = '';
        break;
      case 'Int':
        initialValue = 0;
        break;
      case 'Boolean':
        initialValue = false;
        break;
      case 'Enum':
        if (!field.options) {
          initialValue = '';
        } else initialValue = field.options[0].name;
        break;
      default:
        initialValue = '';
    }
    // add this initial value to initialState
    initialState[field.name] = initialValue;
  });
  const [formState, setFormState] = useState(initialState); // shape: { nameOfField: valueOfField }

  // HANDLERS
  /**
   * @param {object} Event
   */
  const handleSubmit = (e): void => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault(); // prevent page refesh
    }

    // validate non-null text fields
    const fieldNames = Object.keys(formState);
    for (let i = 0; i < fieldNames.length; i += 1) {
      const fieldObj = fields.filter(
        (fieldObj) => fieldObj.name === fieldNames[i],
      )[0];
      if (fieldObj.required && formState[fieldNames[i]] === '') {
        window.alert(`The following field is REQUIRED: ${fieldObj.label}`);
        return;
      }
    }

    const input: Input = {...formState, ...args};
    const variables: Variables = {
      input,
    };
    commitMutation(environment, {
      mutation: mutationGQL,
      variables,
      onCompleted: (response, errors): void => {
        if (callbacks?.onSuccess) callbacks.onSuccess(response);
        setFormState(initialState);
      },
      onError: (err): void => {
        if (callbacks?.onFailure) callbacks.onFailure(err);
      },
    });
  };

  const handleChange = (e): void => {
    const {name, value, type} = e.target;
    let useValue = value;
    // type-coerce values from number input elements before storing in state
    if (type === 'number') {
      useValue = useValue - 0;
    }

    setFormState({...formState, [name]: useValue});
  };

  // HELPER FUNCTIONS
  /**
   * Builds an HTML element to collect user input for a GraphQL mutation based on user-provided instructions.
   * @param {Object} field An object representing an input field for a GraphQL mutation. Example: {name: "name", type: "String"}
   * @param {Object} specs An object representing developer-specified information to use for an HTML element representing this field. Example: {label: "Name", element: "textarea", options: []}
   * @return  Returns the specified HTML input element with the specified label and specified sub-options, if any.
   */

  const generateSpecifiedElement = (
    field: PeriqlesField,
    specs: PeriqlesFieldSpecs,
  ): JSX.Element => {
    let element: JSX.Element;

    //If label isn't given, set it as field.name w/ spaces & 1st letter capitalized
    if (!specs.label) {
      specs.label = field.name.replace(/([a-z])([A-Z])/g, '$1 $2');
      specs.label = specs.label[0].toUpperCase() + specs.label.slice(1);
    }
    if (specs.render) {
      element = specs.render(formState, setFormState, handleChange);
      return element;
    }

    switch (specs.element) {
      case 'range':
        element = (
          <label>
            {specs.label}
            <input
              type="range"
              className={field.name + '-range periqles-range'}
              name={field.name}
              min={specs.min || 0}
              max={specs.max || Infinity}
              value={formState[field.name]}
              onChange={handleChange}
            />
          </label>
        );
        break;

      case 'image':
        element = (
          <label>
            {specs.label}
            <input
              type="image"
              className={field.name + '-image periqles-image'}
              name={field.name}
              src={specs.src}
              alt={specs.label}
              value={formState[field.name]}
              onChange={handleChange}
            />
          </label>
        );
        break;

      case 'radio':
        // TODO: same logic as select options
        //if options aren't given, use field.options
        const radioOptions: Array<PeriqlesFieldOption> = [];
        if (specs.options) {
          specs.options.forEach((spec) => {
            let name, type;

            field.options?.forEach((option) => {
              if (option.label === spec.label) {
                name = option.name;
                type = option.type;
              }
            });

            let newOption: PeriqlesFieldOption = {
              name,
              label: spec.label,
              value: spec.value,
              type,
            };

            radioOptions.push(newOption);
          });
        } else field.options?.forEach((option) => radioOptions.push(option));

        element = (
      
          <div
            className={field.name + '-radio periqles-radio'}
            onChange={handleChange}>
            <label className="periqles-radio-div-label">{specs.label}</label>
            {radioOptions.map((option, index) => {
              return (
                <label className="periqles-radio-option-label">
                  <input
                    key={`${mutationName}${field.name}radio${index}`}
                    type="radio"
                    name={field.name}
                    className={
                      field.name + '-radio-option periqles-radio-option'
                    }
                    value={option.value}
                    // dynamically set initial "checked" attribute based on whether this option's value matches the div's value
                    defaultChecked={option.value === formState[field.name]}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        );
        break;

      // TODO: handle non-null/non-null-default selects
      case 'select':
        const selectOptions: Array<PeriqlesFieldOption> = [];
        if (specs.options) {
          specs.options.forEach((spec) => {
            let name, type;

            field.options?.forEach((option) => {
              if (option.label === spec.label) {
                name = option.name;
                type = option.type;
              }
            });

            let newOption: PeriqlesFieldOption = {
              name,
              label: spec.label,
              value: spec.value,
              type,
            };

            selectOptions.push(newOption);
          });
        } else field.options?.forEach((option) => selectOptions.push(option));

        element = (
          <label>
            {specs.label}
            <select
              className={field.name + '-select periqles-select'}
              name={field.name}
              defaultValue={formState[field.name]}
              onChange={handleChange}>
              {selectOptions.map((option, index) => {
                return (
                  <option
                    key={`${mutationName}${field.name}select${index}`}
                    value={option.value}
                    className={
                      field.name + '-select-option periqles-select-option'
                    }>
                    {option.label}
                  </option>
                );
              })}
            </select>
          </label>
        );
        break;

      case 'textarea':
        element = (
          <label>
            {specs.label}
            <textarea
              className={field.name + '-textarea periqles-textarea'}
              name={field.name}
              value={formState[field.name]}
              onChange={handleChange}
            />
          </label>
        );
        break;

      default:
        const elementType: string = specs.element || 'text';

        element = (
          <label>
            {specs.label}
            <input
              type={elementType}
              className={`${field.name}-${elementType} periqles-${elementType}`}
              name={field.name}
              value={formState[field.name]}
              onChange={handleChange}></input>
          </label>
        );
    }

    return element;
  };

  const generateDefaultElement = (field: PeriqlesField): JSX.Element => {
    // assign a label that matches name but w/ spaces between words and first char uppercased
    field.label = field.name.replace(/([a-z])([A-Z])/g, '$1 $2');
    field.label = field.label[0].toUpperCase() + field.label.slice(1);

    let element: JSX.Element;

    switch (field.type) {
      case 'Int':
        element = (
          <label>
            {field.label}
            <input
              type="number"
              className={field.name + '-number periqles-number'}
              name={field.name}
              value={formState[field.name]}
              onChange={handleChange}></input>
          </label>
        );
        break;

      case 'Boolean':
        element = (
          <label>
            {field.label}
            <input
              type="checkbox"
              className={field.name + '-checkbox periqles-checkbox'}
              name={field.name}
              value={formState[field.name]}
              onChange={handleChange}></input>
          </label>
        );
        break;

      case 'Enum':
        // TODO: new select options logic
        const selectOptions: Array<PeriqlesFieldOption> = [];
        field.options?.forEach((option) => selectOptions.push(option));

        element = (
          <label>
            {field.label}
            <select
              className={field.name + '-select periqles-select'}
              name={field.name}
              defaultValue={formState[field.name]}
              onChange={handleChange}>
              {selectOptions.map((option, index) => {
                return (
                  <option
                    key={`${mutationName}${field.name}select${index}`}
                    value={option.name}
                    className={
                      field.name + '-select-option periqles-select-option'
                    }>
                    {option.name}
                  </option>
                );
              })}
            </select>
          </label>
        );
        break;

      default:
        const elementLookup = {
          pass: 'password',
          password: 'password',
          color: 'color',
          colour: 'color',
          url: 'url',
          link: 'url',
          date: 'date',
          time: 'time',
          file: 'file',
          datetime: 'datetime',
          timestamp: 'datetime',
          telephone: 'tel',
          phone: 'tel',
          mobile: 'tel',
          phonenumber: 'tel',
          cell: 'tel',
        };
        const textFieldName: string = field.name.toLowerCase();
        const elementType: string = elementLookup[textFieldName] || 'text';

        element = (
          <label>
            {field.label}
            <input
              type={elementType}
              className={`${field.name}-${elementType} periqles-${elementType}`}
              name={field.name}
              value={formState[field.name]}
              onChange={handleChange}></input>
          </label>
        );
    }

    return element;
  };

  /**
   * By referencing the name of a mutation on a GraphQL schema, generates an HTML element for each field where user input is required. Assumes that if the mutation name takes the form of "<description>Mutation", its corresponding input type will be named "<description>Input".
   * @param {Array} fieldsArray An array of objects representing the names and data types of input fields, deduced from an input type on the GraphQL schema.
   * @param {string} mutationName The name of a GraphQL mutation exactly as it appears on the schema.
   * @param {object} specifications
   * @param {object} args An object whose keys represent the names of mutation input fields to exclude from the form, and whose values provide the value to be used for each variable when the mutation is committed.
   */

  const formBuilder = (fields: PeriqlesField[]): JSX.Element[] => {
    const formElementsArray: JSX.Element[] = [];
    fields.forEach((field) => {
      if (args[field.name]) return; // early return

      let element: JSX.Element;
      if (specifications.fields[field.name]) {
        element = generateSpecifiedElement(
          field,
          specifications.fields[field.name],
        );
      } else {
        element = generateDefaultElement(field);
      }
      formElementsArray.push(element);
    });
    return formElementsArray;
  };

  // ADDITIONAL ELEMENTS AND STYLES
  let headerText: string = mutationName
    .replace('Mutation', '')
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // add spaces before capital letters
  headerText = headerText[0].toUpperCase() + headerText.slice(1); // capitalize first letter

  return (
    <form
      className="PeriqlesForm"
      aria-labelledby="form"
      onSubmit={handleSubmit}>
      <h2>{headerText}</h2>
      {formBuilder(fields)}
      <button className="periqles-submit" onClick={handleSubmit}>
        Submit
      </button>
    </form>
  );
};

export default PeriqlesFormContent;
