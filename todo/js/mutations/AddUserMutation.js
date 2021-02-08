// import {
//   commitMutation,
//   graphql,
//   type Disposable,
//   type Environment,
//   type RecordProxy,
//   type RecordSourceSelectorProxy,
// } from 'react-relay';

// import {ConnectionHandler} from 'relay-runtime';
// // import type {TodoApp_user} from 'relay/TodoApp_user.graphql';
// import type {AddUserInput} from 'relay/AddUserMutation.graphql';  // TODO in typescript?

// // TODO: consult with Ian and Joe about fields and types to return from AddUser mutation
// const mutation = graphql`
//   mutation AddUserMutation($input: AddUserInput!) {
//     addUser(input: $input) {
//       user {
//         node {
//           id
//         }
//         username
//         password
//         email
//         gender
//         pizzaTopping
//         age
//       }
//     }
//   }
// `;

// export default {mutation: mutationQL};
// // Everything below is non-essential; at minimum only need to export the mutation query

// // TODO: What to replace this updater fn with?
// function sharedUpdater(
//   store: RecordSourceSelectorProxy,
//   user
// ) {
//   const userProxy = store.get(user.id);  
//   // const conn = ConnectionHandler.getConnection(userProxy, 'TodoList_todos');
//   // ConnectionHandler.insertEdgeAfter(conn, newEdge);
// }

// let tempID = 0;

// // can leave this out
// function commit(
//   environment: Environment,
//   username,
//   password,
//   email,
//   gender,
//   pizzaTopping,
//   age,
// ): Disposable {

//   const input: AddUserInput = {
//     // add input values listed above to an input object
//     username,
//     password,
//     email,
//     gender,
//     pizzaTopping,
//     age,
//     clientMutationId: `${tempID++}`,    // why is this unique?
//   };

//   return commitMutation(environment, {
//     mutation,
//     variables: {
//       input,
//     },
//     updater: (store: RecordSourceSelectorProxy) => {      // TODO: needed? is there a default to fall back to if I leave it off?
//       const payload = store.getRootField('addUser');      // TODO
//       // const newEdge = payload.getLinkedRecord('todoEdge');   // TODO: what should this be?
//       sharedUpdater(store, user);
//     },
//     optimisticUpdater: (store: RecordSourceSelectorProxy) => {    // TODO: needed?
//       // const id = 'client:newTodo:' + tempID++;     // TODO: make a new, unique mutation id
//       const user = store.create(id, 'User');    // create(idForNewData, typeNameFromSchema) --> RecordProxy
//       user.setValue(username, 'username');      // setValue(value, fieldName)
//       user.setValue(password, 'password');
//       user.setValue(email, 'email');
//       user.setValue(gender, 'gender');
//       user.setValue(pizzaTopping, 'pizzaTopping');
//       user.setValue(age, 'age');
//       sharedUpdater(store, user);
//     },
//   });
// }

// export {commit};
