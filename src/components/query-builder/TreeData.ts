import { TreeItemType, TreeItemValueType, ComponentType } from "./TreeItem";

const isConcept = {
  name: "isConcept",
  treeItem: {
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
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            property: [
              {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                isConcept: [
                  {
                    name: "Class",
                    "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
                  }
                ]
              },
              {
                name: "type",
                "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                isConcept: [
                  {
                    name: "Class",
                    "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  }
};

const entityType = {
  name: "entityType",
  treeItem: {
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
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            entityType: {
              name: "Class",
              "@id": "http://www.w3.org/2000/01/rdf-schema#Class"
            },
            property: [
              {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                isConcept: [
                  {
                    "@id": "http://www.w3.org/2000/01/rdf-schema#Resource",
                    name: "Resource"
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  }
};

const entityId = {
  name: "entityId",
  treeItem: {
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
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            entityId: {
              "@id": "http://endhealth.info/im#Concept",
              name: "Terminology Concept"
            }
          }
        ]
      }
    }
  }
};

const notExist = {
  name: "notExist",
  treeItem: {
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
            name: "notExist",
            componentType: "DISPLAY",
            value: {
              name: "notExist",
              value: true
            },
            type: "PROPERTY",
            valueType: "OBJECT",
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
                    name: "has term code",
                    componentType: "DISPLAY",
                    value: {
                      name: "has term code",
                      "@id": "http://endhealth.info/im#hasTermCode"
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
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            notExist: true,
            property: [
              {
                name: "has term code",
                "@id": "http://endhealth.info/im#hasTermCode"
              }
            ]
          }
        ]
      }
    }
  }
};

const inverseOf = {
  name: "inverseOf",
  treeItem: {
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
            name: "notExist",
            componentType: "DISPLAY",
            value: {
              name: "notExist",
              value: true
            },
            type: "PROPERTY",
            valueType: "OBJECT",
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
                        name: "inverseOf",
                        componentType: "DISPLAY",
                        value: {
                          name: "inverseOf",
                          value: true
                        },
                        type: "PROPERTY_VALUE_PAIR",
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

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            notExist: true,
            property: [
              {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                inverseOf: true
              }
            ]
          }
        ]
      }
    }
  }
};

const includeSubtypes = {
  name: "includeSubtypes",
  treeItem: {
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
                  "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                  isConcept: [
                    {
                      "@id": "http://endhealth.info/im#Event",
                      name: "Event",
                      includeSubtypes: true
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
                        name: "Event",
                        componentType: "DISPLAY",
                        value: {
                          "@id": "http://endhealth.info/im#Event",
                          name: "Event",
                          includeSubtypes: true
                        },
                        type: "VALUE",
                        valueType: "OBJECT",
                        children: [
                          {
                            key: 1,
                            name: "includeSubtypes",
                            componentType: "DISPLAY",
                            value: {
                              name: "includeSubtypes",
                              value: true
                            },
                            type: "PROPERTY_VALUE_PAIR",
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
      }
    ]
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            property: [
              {
                name: "subClassOf",
                "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                isConcept: [
                  {
                    "@id": "http://endhealth.info/im#Event",
                    name: "Event",
                    includeSubtypes: true
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  }
};

const andMatch = {
  name: "andMatch",
  treeItem: {
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
            name: "and",
            componentType: "DISPLAY",
            value: {
              name: "and"
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
                      "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                      isConcept: [
                        {
                          "@id": "http://endhealth.info/im#Event",
                          name: "Event"
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
                            name: "Event",
                            componentType: "DISPLAY",
                            value: {
                              "@id": "http://endhealth.info/im#Event",
                              name: "Event"
                            },
                            type: "VALUE",
                            valueType: "OBJECT"
                          }
                        ]
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
                    name: "type",
                    componentType: "DISPLAY",
                    value: {
                      name: "type",
                      "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                      isConcept: [
                        {
                          "@id": "http://www.w3.org/ns/shacl#NodeShape",
                          name: "Node shape"
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
                        value: "type",
                        type: "PROPERTY_VALUE_PAIR",
                        valueType: "ARRAY",
                        children: [
                          {
                            key: 1,
                            name: "Node shape",
                            componentType: "DISPLAY",
                            value: {
                              "@id": "http://www.w3.org/ns/shacl#NodeShape",
                              name: "Node shape"
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
      }
    ]
  },

  query: {
    query: {
      name: "A new query",
      description: "A new query built with the query-builder",
      select: {
        property: [
          {
            name: "label",
            "@id": "http://www.w3.org/2000/01/rdf-schema#label"
          }
        ],
        match: [
          {
            and: [
              {
                property: [
                  {
                    name: "subClassOf",
                    "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    isConcept: [
                      {
                        "@id": "http://endhealth.info/im#Event",
                        name: "Event"
                      }
                    ]
                  }
                ]
              },
              {
                property: [
                  {
                    name: "subClassOf",
                    "@id": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    isConcept: [
                      {
                        "@id": "http://endhealth.info/im#Event",
                        name: "Event"
                      }
                    ]
                  },
                  {
                    name: "type",
                    "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    isConcept: [
                      {
                        "@id": "http://www.w3.org/ns/shacl#NodeShape",
                        name: "Node shape"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  }
};
export { isConcept, entityId, entityType, notExist, inverseOf, includeSubtypes, andMatch };
