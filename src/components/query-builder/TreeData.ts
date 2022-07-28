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
          name: "property",
          type: "property",
          value: {
            name: "property"
          },
          children: [
            {
              key: 1,
              name: "status",
              type: "status",
              value: {
                name: "status",
                "@id": "http://endhealth.info/im#status",
                status: {
                  "@id": "isConcept"
                }
              },
              children: [
                {
                  key: 1,
                  name: "isConcept",
                  type: "isConcept",
                  value: "isConcept",
                  children: [
                    {
                      key: 1,
                      name: "im:Unassigned",
                      type: "im:Unassigned",
                      value: "im:Unassigned"
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

export default treeData;
