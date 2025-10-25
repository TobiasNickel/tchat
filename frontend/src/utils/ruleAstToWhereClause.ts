import type {RuleASTNode} from './parseRule'

/*
 * Converts a rule AST to a SQLite WHERE clause
 * identifiers get interpreted as follow:
 * - @request.auth.id -> context.request.auth.id
 * - @collection.<collectionName>.<field> -> <collectionName>.<field>
 * - @collection.<collectionName>.id -> <collectionName>.id
 * - others: interpreted as is (e.g. field names)
 *
 * context is an object that contains the request and other useful info
 * 
 * Example: 
 *   @request.auth.id == @collection.users.id && 
 *   @collection.users.active == "active" && 
 *   @collection.groupMembers.user_id == @request.auth.id && 
 *   @collection.groupMembers.group_id == @collection.groups.id && 
 *   @collection.groups.name == "admins"
 * Input AST:
{
  "type": "Logical",
  "operator": "&&",
  "left": {
    "type": "Logical",
    "operator": "&&",
    "left": {
      "type": "Logical",
      "operator": "&&",
      "left": {
        "type": "Logical",
        "operator": "&&",
        "left": {
          "type": "Binary",
          "operator": "==",
          "left": {
            "type": "Identifier",
            "name": "@request.auth.id"
          },
          "right": {
            "type": "Identifier",
            "name": "@collection.users.id"
          }
        },
        "right": {
          "type": "Binary",
          "operator": "==",
          "left": {
            "type": "Identifier",
            "name": "@collection.users.active"
          },
          "right": {
            "type": "Literal",
            "value": "active"
          }
        }
      },
      "right": {
        "type": "Binary",
        "operator": "==",
        "left": {
          "type": "Identifier",
          "name": "@collection.groupMembers.user_id"
        },
        "right": {
          "type": "Identifier",
          "name": "@request.auth.id"
        }
      }
    },
    "right": {
      "type": "Binary",
      "operator": "==",
      "left": {
        "type": "Identifier",
        "name": "@collection.groupMembers.group_id"
      },
      "right": {
        "type": "Identifier",
        "name": "@collection.groups.id"
      }
    }
  },
  "right": {
    "type": "Binary",
    "operator": "==",
    "left": {
      "type": "Identifier",
      "name": "@collection.groups.name"
    },
    "right": {
      "type": "Literal",
      "value": "admins"
    }
  }
} 
  * from the rule for the contents table:
 *   @request.auth.id == @collection.users.id && 
 *   @collection.users.active == "active" && 
 *   @collection.groupMembers.user_id == @request.auth.id && 
 *   @collection.groupMembers.group_id == @collection.groups.id && 
 *   @collection.groups.name == "admins"
 * to the SQLite WHERE clause with context.request.auth.id = 'user-123':
 * ('user-123' = users.id AND users.active = 'active' AND groupMembers.user_id = 'user-123' AND groupMembers.group_id = groups.id AND groups.name = 'admins')
 * 
 * besides the where clause also the necessary joins are returned:
 * [
 *   'JOIN users ON users.id = contents.user_id',
 *   'JOIN groupMembers ON groupMembers.user_id = users.id',
 *   'JOIN groups ON groups.id = groupMembers.group_id'
 * ]
 */
function convertRuleASTToSQLiteWhereClause(ast: RuleASTNode, context: any): string {
  return ''
}

