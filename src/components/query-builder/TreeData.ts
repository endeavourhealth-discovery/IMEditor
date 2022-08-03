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

const entityId = {
  key: 0,
  name: "select",
  type: "PROPERTY",
  valueType: "OBJECT",
  componentType: "DISPLAY",
  children: [
    {
      key: 1,
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
              name: "Encounter",
              componentType: "DISPLAY",
              value: {
                "@id": "http://endhealth.info/im#1741000252102",
                name: "Encounter"
              },
              type: "VALUE",
              valueType: "OBJECT"
            },
            {
              key: 2,
              name: "EN ERCP Biliary Stent Metal",
              componentType: "DISPLAY",
              value: {
                "@id": "http://endhealth.info/bc#4462487",
                name: "EN ERCP Biliary Stent Metal"
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
        }
      ]
    }
  ]
};
export { testQueryObject, entityId };
