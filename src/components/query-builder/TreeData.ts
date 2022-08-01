import { TreeItemType, TreeItemValueType, ComponentType } from "./TreeItem";

const testQueryObject = {
  treeData: {
    key: 0,
    name: "select",
    type: "PROPERTY",
    valueType: "OBJECT",
    componentType: "DISPLAY",
    value: {
      name: "select"
    },
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
                name: "status",
                componentType: "DISPLAY",
                value: {
                  name: "status",
                  "@id": "http://endhealth.info/im#status",
                  status: {
                    "@id": "isConcept"
                  }
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
  },
  query: {}
};

export default testQueryObject;
