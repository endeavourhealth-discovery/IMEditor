import { TreeItemType, TreeItemValueType, ComponentType } from "./TreeItem";

const testQueryObject = {
  key: 0,
  name: "select",
  type: "PROPERTY",
  valueType: "OBJECT",
  componentType: "DISPLAY",
  children: [
    {
      key: 1,
      name: "property",
      componentType: "DISPLAY",
      value: {
        name: "property"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 1,
          name: "label",
          componentType: "DISPLAY",
          value: {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          },
          type: "VALUE",
          valueType: "OBJECT"
        },
        {
          key: 2,
          name: "type",
          componentType: "DISPLAY",
          value: {
            name: "type",
            "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
          },
          type: "VALUE",
          valueType: "OBJECT"
        }
      ]
    },
    {
      key: 2,
      name: "match",
      componentType: "DISPLAY",
      value: {
        name: "match"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 1,
          name: "property",
          componentType: "DISPLAY",
          value: {
            name: "property"
          },
          type: "PROPERTY",
          valueType: "ARRAY",
          children: [
            {
              key: 1,
              name: "subClassOf",
              componentType: "DISPLAY",
              value: {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf"
              },
              type: "VALUE",
              valueType: "OBJECT",
              children: [
                {
                  key: 1,
                  name: "isConcept",
                  componentType: "DISPLAY",
                  value: "isConcept",
                  type: "PROPERTY_VALUE_PAIR",
                  valueType: "ARRAY",
                  children: [
                    {
                      key: 1,
                      name: "Class",
                      componentType: "DISPLAY",
                      value: {
                        name: "Class",
                        "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
                      },
                      type: "VALUE",
                      valueType: "OBJECT"
                    }
                  ]
                }
              ]
            },
            {
              key: 2,
              name: "type",
              componentType: "DISPLAY",
              value: {
                name: "type",
                "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
              },
              type: "VALUE",
              valueType: "OBJECT",
              children: [
                {
                  key: 1,
                  name: "isConcept",
                  componentType: "DISPLAY",
                  value: "isConcept",
                  type: "PROPERTY_VALUE_PAIR",
                  valueType: "ARRAY",
                  children: [
                    {
                      key: 1,
                      name: "Class",
                      componentType: "DISPLAY",
                      value: {
                        name: "Class",
                        "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
                      },
                      type: "VALUE",
                      valueType: "OBJECT"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const entityType = {
  key: 0,
  name: "select",
  type: "PROPERTY",
  valueType: "OBJECT",
  componentType: "DISPLAY",
  children: [
    {
      key: 1,
      name: "property",
      componentType: "DISPLAY",
      value: {
        name: "property"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 1,
          name: "label",
          componentType: "DISPLAY",
          value: {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          },
          type: "VALUE",
          valueType: "OBJECT"
        },
        {
          key: 2,
          name: "code",
          componentType: "DISPLAY",
          value: {
            name: "code",
            "@id": "http://endhealth.info/im#code"
          },
          type: "VALUE",
          valueType: "OBJECT"
        }
      ]
    },
    {
      key: 2,
      name: "match",
      componentType: "DISPLAY",
      value: {
        name: "match"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 1,
          name: "entityType",
          componentType: "DISPLAY",
          value: {
            name: "entityType"
          },
          type: "PROPERTY",
          valueType: "OBJECT",
          children: [
            {
              key: 1,
              name: "Class",
              componentType: "DISPLAY",
              value: {
                name: "Class",
                "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
              },
              type: "VALUE",
              valueType: "OBJECT"
            }
          ]
        },
        {
          key: 2,
          name: "property",
          componentType: "DISPLAY",
          value: {
            name: "property"
          },
          type: "PROPERTY",
          valueType: "ARRAY",
          children: [
            {
              key: 1,
              name: "subClassOf",
              componentType: "DISPLAY",
              value: {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                isConcept: [
                  {
                    "@id": "http://www.w3.org/2000/01/rdf-schema#Resource",
                    name: "Resource"
                  }
                ]
              },
              type: "VALUE",
              valueType: "OBJECT",
              children: [
                {
                  key: 1,
                  name: "isConcept",
                  componentType: "DISPLAY",
                  value: "subClassOf",
                  type: "PROPERTY_VALUE_PAIR",
                  valueType: "ARRAY",
                  children: [
                    {
                      key: 1,
                      name: "Resource",
                      componentType: "DISPLAY",
                      value: {
                        "@id": "http://www.w3.org/2000/01/rdf-schema#Resource",
                        name: "Resource"
                      },
                      type: "VALUE",
                      valueType: "OBJECT"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const entityId = {
  key: 0,
  name: "select",
  type: "PROPERTY",
  valueType: "OBJECT",
  componentType: "DISPLAY",
  children: [
    {
      key: 1,
      name: "property",
      componentType: "DISPLAY",
      value: {
        name: "property"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 1,
          name: "label",
          componentType: "DISPLAY",
          value: {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          },
          type: "VALUE",
          valueType: "OBJECT"
        },
        {
          key: 2,
          name: "code",
          componentType: "DISPLAY",
          value: {
            name: "code",
            "@id": "http://endhealth.info/im#code"
          },
          type: "VALUE",
          valueType: "OBJECT"
        }
      ]
    },
    {
      key: 2,
      name: "match",
      componentType: "DISPLAY",
      value: {
        name: "match"
      },
      type: "PROPERTY",
      valueType: "ARRAY",
      children: [
        {
          key: 3,
          name: "entityId",
          componentType: "DISPLAY",
          value: {
            name: "entityId"
          },
          type: "PROPERTY",
          valueType: "OBJECT",
          children: [
            {
              key: 1,
              name: "Terminology Concept",
              componentType: "DISPLAY",
              value: {
                "@id": "http://endhealth.info/im#Concept",
                name: "Terminology Concept"
              },
              type: "VALUE",
              valueType: "OBJECT"
            }
          ]
        }
      ]
    }
  ]
};
export { testQueryObject, entityId, entityType };
