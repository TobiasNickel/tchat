// Example rule
// @request.auth.id != "" &&
// @collection.courseRegistrations.user ?= id &&
// (@collection.courseRegistrations:auth.user ?= @request.auth.id ||
// @collection.courseRegistrations.courseGroup ?= @collection.courseRegistrations:auth.courseGroup)
//
// to a parsed AST
// {
//   "type": "Logical",
//   "operator": "&&",
//   "left": {
//     "type": "Binary",
//     "operator": "!=",
//     "left": { "type": "Identifier", "name": "@request.auth.id" },
//     "right": { "type": "Literal", "value": "" }
//   },
//   "right": {
//     "type": "Logical",
//     "operator": "&&",
//     "left": {
//       "type": "Binary",
//       "operator": "?=",
//       "left": { "type": "Identifier", "name": "@collection.courseRegistrations.user" },
//       "right": { "type": "Identifier", "name": "id" }
//     },
//     "right": {
//       "type": "Logical",
//       "operator": "||",
//       "left": {
//         "type": "Binary",
//         "operator": "?=",
//         "left": { "type": "Identifier", "name": "@collection.courseRegistrations:auth.user" },
//         "right": { "type": "Identifier", "name": "@request.auth.id" }
//       },
//       "right": {
//         "type": "Binary",
//         "operator": "?=",
//         "left": { "type": "Identifier", "name": "@collection.courseRegistrations.courseGroup" },
//         "right": { "type": "Identifier", "name": "@collection.courseRegistrations:auth.courseGroup" }
//       }
//     }
//   }
// }

type Identifier = { type: 'Identifier'; name: string };
type Literal = { type: 'Literal'; value: string | number | boolean | null };
type LogicalNode = {
  type: 'Logical';
  operator: '&&' | '||';
  left: RuleASTNode | Identifier | Literal;
  right: RuleASTNode | Identifier | Literal;
};

type BinaryNode = {
  type: 'Binary';
  operator: '!=' | '==' | '?=';
  left: RuleASTNode | Identifier | Literal;
  right: RuleASTNode | Identifier | Literal;
};

export type RuleASTNode = LogicalNode | BinaryNode | Identifier | Literal;

function parseRule(rule: string): RuleASTNode {
  rule = rule.replace(/\s+/g, ' ').trim();

  const operators = ['&&', '||', '!=', '==', '?='];
  const operatorPrecedence: Record<string, number> = {
    '||': 1,
    '&&': 2,
    '==': 3,
    '!=': 3,
    '?=': 3
  };
  const operatorSet = new Set(operators);

  function tokenize(input: string): (string | Literal | Identifier)[] {
    const tokens: (string | Literal | Identifier)[] = [];
    let current = '';
    let inString = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i]!;

      if (char === '"') {
        inString = !inString;
        current += char;
        continue;
      }

      if (inString) {
        current += char;
        continue;
      }

      if (char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      // Handle parentheses
      if (char === '(' || char === ')') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
        continue;
      }

      const twoCharOp = input.slice(i, i + 2);
      if (operatorSet.has(twoCharOp)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(twoCharOp);
        i++;
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens.map(token => {
      if (typeof token === 'string') {
        if (token.startsWith('"') && token.endsWith('"')) {
          return { type: 'Literal', value: token.slice(1, -1) };
        } else if (!isNaN(Number(token))) {
          return { type: 'Literal', value: Number(token) };
        } else if (token === 'true' || token === 'false') {
          return { type: 'Literal', value: token === 'true' };
        } else if (token === 'null') {
          return { type: 'Literal', value: null };
        } else if (token === '(' || token === ')') {
          return token;
        } else if (operatorSet.has(token)) {
          return token;
        } else {
          return { type: 'Identifier', name: token };
        }
      }
      return token;
    });
  }

  function parseExpression(tokens: (string | Literal | Identifier)[]): RuleASTNode {
    const outputStack: RuleASTNode[] = [];
    const operatorStack: string[] = [];

    function applyOperator() {
      const operator = operatorStack.pop()! as any;
      const right = outputStack.pop()!;
      const left = outputStack.pop()!;
      outputStack.push({ type: operator === '&&' || operator === '||' ? 'Logical' : 'Binary', operator, left, right });
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;

      if (typeof token === 'object') {
        outputStack.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
          applyOperator();
        }
        operatorStack.pop(); // Remove the '('
      } else if (operatorSet.has(token)) {
        while (
          operatorStack.length &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          operatorPrecedence[operatorStack[operatorStack.length - 1]!]! >= operatorPrecedence[token]!
        ) {
          applyOperator();
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length) {
      applyOperator();
    }

    return outputStack[0] as RuleASTNode | Identifier | Literal;
  }

  const tokens = tokenize(rule);
  return parseExpression(tokens);
}

const example1 = parseRule('@request.auth.id != "" && @collection.courseRegistrations.user ?= id && (@collection.courseRegistrations:auth.user ?= @request.auth.id || @collection.courseRegistrations.courseGroup ?= @collection.courseRegistrations:auth.courseGroup)');
console.log(JSON.stringify(example1, undefined, '  '));
const example2 = parseRule('@request.auth.id == @collection.users.id && @collection.users.active == "active" && @collection.groupMembers.user_id == @request.auth.id && @collection.groupMembers.group_id == @collection.groups.id && @collection.groups.name == "admins"');
console.log(JSON.stringify(example2, undefined, '  '));

export { parseRule };