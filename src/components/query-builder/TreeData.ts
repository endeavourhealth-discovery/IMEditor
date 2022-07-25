const treeData = {
  key: 0,
  name: "select",
  type: "select",
  value: {
    name: "select"
  },
  children: [
    {
      key: 1,
      name: "property",
      type: "property",
      value: {
        name: "property"
      },
      children: [
        {
          key: 1,
          name: "label",
          type: "label",
          value: {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        },
        {
          key: 2,
          name: "comment",
          type: "comment",
          value: {
            name: "comment",
            "@id": "http://www.w3.org/2000/01/rdf-schema#comment"
          }
        },
        {
          key: 3,
          name: "type",
          type: "type",
          value: {
            name: "type",
            "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
          }
        }
      ]
    },
    {
      key: 2,
      name: "match",
      type: "match",
      value: {
        name: "match"
      },
      children: [
        {
          key: 1,
          name: "entityId",
          type: "entityId",
          value: {
            name: "entityId"
          },
          children: [
            {
              key: 1,
              name: "im:Encounter",
              type: "im:Encounter",
              value: "im:Encounter"
            }
          ]
        }
      ]
    }
  ]
};

export default treeData;
