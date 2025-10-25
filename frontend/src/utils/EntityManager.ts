
const buildInClasses = [Object, Array, Date, RegExp, Function, Number, String, Boolean, Symbol, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError]

export class EntityManager {
  private map: Map<new (...args: any[]) => any, Map<string, any>>;

  constructor() {
    this.map = new Map();
  }

  getById<T>(type: new (...args: any[]) => T, id: string): T | undefined {
    const classMap = this.map.get(type);
    console.log('get classMap', classMap)
    const result = this.map.get(type)?.get(id);
    if (!result) {
      return undefined;
    }
    if(!(result instanceof type)) {
      throw new Error('Type mismatch');
    }
    return result as T;
  }
  setById<T>(id: string, entity: T): void {
    const type = (entity as any).constructor as new (...args: any[]) => T;
    this.innerSetById(type, id, entity);
  }

  private innerSetById<T>(type: new (...args: any[]) => T, id: string, entity: T): void {
    //console.log('innerSetById name:', type.name, type.__proto__.name)
    if (!this.map.has(type)) {
      this.map.set(type, new Map());
    }
    this.map.get(type)!.set(id, entity);
    if(!buildInClasses.includes(Object.getPrototypeOf(type)) && Object.getPrototypeOf(type)?.name) {
      this.innerSetById(Object.getPrototypeOf(type), id, entity)
    }
  }
  removeEntity(entity: { id: string }): void {
    const type = entity.constructor as new (...args: any[]) => any;
    this.innerRemove(type, entity.id);
  }
  remove(type: new (...args: any[]) => any, id: string): void {
    const item = this.getById(type, id);
    if (!item) {
      return;
    }
    const itemClass = item.constructor as new (...args: any[]) => any;
    this.innerRemove(itemClass, id);
  }
  private innerRemove(type: new (...args: any[]) => any, id: string): void {
    const map = this.map.get(type);
    if (!map) {
      return
    }
    map.delete(id);
    if(!buildInClasses.includes(Object.getPrototypeOf(type)) && Object.getPrototypeOf(type)?.name) {
      this.innerRemove(Object.getPrototypeOf(type), id)
    }
  }
}

class ParentClass {}

class ExampleEntity extends ParentClass{
  public id: string;
  public name: string;
  constructor(id: string, name: string) {
    super()
    this.id = id;
    this.name = name;
  }
}

const entityManager = new EntityManager();
const example = new ExampleEntity('1', 'example');
entityManager.setById(example.id, example);

console.log(entityManager)



const received = entityManager.getById(ExampleEntity, example.id)!;
const ReceivedClass = received.constructor as new (id: string, name: string) => ExampleEntity;
console.log(ExampleEntity === ReceivedClass)
const newReceived = new ReceivedClass('2', 'new example');
console.log(newReceived);

console.log('parentClass Of ReceivedClass', Object.getPrototypeOf(ReceivedClass) === ParentClass)

console.log('-- remove example --')
// entityManager.remove(ParentClass, example.id);
entityManager.removeEntity(example);
console.log(entityManager)
