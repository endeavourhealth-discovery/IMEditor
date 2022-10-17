export default {
  CONCEPT_SHAPE: {
    "@id": "im:Editor_ConceptShape",
    "rdf:type": [
      {
        "@id": "im:FormGenerator"
      }
    ],
    "rdfs:label": "Editor - Concept shape",
    "rdfs:comment": "Form editor for a concept",
    "im:targetShape": {
      "@id": "im:ConceptShape"
    },
    "im:isContainedIn": [
      {
        "@id": "im:ModelDataModels"
      }
    ],
    "sh:group": [
      {
        "rdfs:label": "Property group - Summary details",
        "sh:order": 1,
        "sh:maxCount": 1,
        "sh:property": [
          {
            "rdfs:comment": "A property that auto generates the type as  concept type",
            "sh:order": 1,
            "sh:function": {
              "@id": "im:Function_GetAdditionalAllowableTypes"
            },
            "sh:name": "type",
            "sh:path": {
              "@id": "rdf:type"
            },
            "im:argument": [
              {
                "im:valueIri": {
                  "@id": "im:Concept"
                },
                "sh:parameter": "entityIri"
              }
            ],
            "im:isIri": {
              "@id": "im:Concept"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:entityComboBox"
            }
          },
          {
            "rdfs:comment": "A property that auto generates a concept iri from the snomed extension",
            "sh:order": 2,
            "sh:name": "iri",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:id"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textDisplay"
            },
            "im:valueVariable": "conceptIri",
            "sh:class": {
              "@id": "im:Concept"
            },
            "sh:function": {
              "@id": "im:Function_SnomedConceptGenerator"
            }
          },
          {
            "rdfs:comment": "Property that derives a concept code from the concept iri",
            "sh:order": 3,
            "sh:name": "code",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:code"
            },
            "im:argument": [
              {
                "sh:parameter": "entityIri",
                "im:valueVariable": "conceptIri"
              },
              {
                "sh:parameter": "fieldName",
                "im:valueData": "code"
              }
            ],
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textDisplay"
            },
            "sh:dataType": {
              "@id": "xsd:string"
            },
            "sh:function": {
              "@id": "im:Function_LocalNameRetriever"
            }
          },
          {
            "rdfs:comment": "name or main term of concept",
            "sh:order": 4,
            "sh:name": "Concept name",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "rdfs:label"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textInput"
            },
            "sh:dataType": {
              "@id": "xsd:string"
            }
          },
          {
            "rdfs:comment": "optional description",
            "sh:order": 5,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:name": "Concept description",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "rdfs:comment"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:htmlInput"
            }
          },
          {
            "rdfs:comment": "selects the status with a default of draft",
            "sh:order": 6,
            "sh:select": [
              {
                "@id": "im:Query_GetIsas"
              }
            ],
            "sh:name": "status",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:status"
            },
            "im:argument": [
              {
                "im:valueIri": {
                  "@id": "im:Status"
                },
                "sh:parameter": "this"
              }
            ],
            "im:isIri": {
              "@id": "im:Draft"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:entityComboBox"
            },
            "sh:class": {
              "@id": "im:Status"
            }
          }
        ],
        "im:name": "Summary details",
        "sh:minCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        }
      },
      {
        "rdfs:label": "Property group - Sub class steps",
        "sh:order": 2,
        "sh:maxCount": 1,
        "im:name": "Subclass of",
        "im:subGroup": [
          {
            "rdfs:label": "Property group - Sub type array builder",
            "sh:order": 1,
            "sh:path": {
              "@id": "rdfs:subClassOf"
            },
            "im:validation": {
              "@id": "im:Validation_hasParent"
            },
            "im:validationErrorMessage": "Entity is missing a parent. Add a parent to 'SubclassOf' or 'isContainedIn'.",
            "sh:property": [
              {
                "rdfs:comment": "selects an entity based on select query",
                "sh:order": 1,
                "sh:select": [
                  {
                    "@id": "im:Query_SearchConcepts"
                  }
                ],
                "im:builderChild": true,
                "sh:name": "Entity",
                "sh:path": {
                  "@id": "rdfs:subClassOf"
                },
                "sh:minCount": 1,
                "im:componentType": {
                  "@id": "im:entitySearch"
                },
                "sh:class": {
                  "@id": "im:Concept"
                }
              }
            ],
            "im:name": "Subclass of",
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:arrayBuilder"
            }
          }
        ],
        "sh:minCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        }
      },
      {
        "rdfs:label": "Property group - Is contained in steps",
        "sh:order": 3,
        "sh:maxCount": 1,
        "im:name": "Is contained in",
        "im:subGroup": [
          {
            "rdfs:label": "Property group - Is contained in array builder",
            "sh:order": 1,
            "sh:path": {
              "@id": "im:isContainedIn"
            },
            "sh:property": [
              {
                "rdfs:comment": "selects an entity based on select query",
                "sh:order": 1,
                "sh:select": [
                  {
                    "@id": "im:Query_SearchConcepts"
                  }
                ],
                "im:builderChild": true,
                "sh:name": "Entity",
                "sh:path": {
                  "@id": "im:isContainedIn"
                },
                "sh:minCount": 1,
                "im:componentType": {
                  "@id": "im:entitySearch"
                },
                "sh:class": {
                  "@id": "im:Concept"
                }
              }
            ],
            "im:name": "Is contained in",
            "sh:minCount": 0,
            "im:validation": {
              "@id": "im:Validation_hasParent"
            },
            "im:validationErrorMessage": "Entity is missing a parent. Add a parent to 'SubclassOf' or 'isContainedIn'.",
            "im:componentType": {
              "@id": "im:arrayBuilder"
            }
          }
        ],
        "sh:minCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        }
      },
      {
        "rdfs:label": "Property group - Role group steps",
        "sh:order": 4,
        "im:name": "Role group",
        "im:subGroup": [
          {
            "rdfs:label": "Property Group - Role group array builder",
            "sh:order": 1,
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:roleGroup"
            },
            "im:subGroup": [
              {
                "rdfs:label": "Property Group - Role group component group",
                "im:name": "Property refinement",
                "sh:order": 1,
                "sh:minCount": 1,
                "im:componentType": {
                  "@id": "im:componentGroup"
                },
                "sh:path": {
                  "@id": "im:roleGroup"
                },
                "sh:property": [
                  {
                    "rdfs:comment": "selects a property from allowable range from selected concept",
                    "sh:order": 1,
                    "sh:select": [
                      {
                        "@id": "im:Query_AllowableProperties"
                      }
                    ],
                    "im:builderChild": true,
                    "sh:path": {
                      "@id": "im:roleGroup"
                    },
                    "im:argument": [
                      {
                        "sh:parameter": "entityIri",
                        "im:valueVariable": "conceptIri"
                      }
                    ],
                    "im:name": "Property",
                    "sh:minCount": 1,
                    "im:componentType": {
                      "@id": "im:entityAutoComplete"
                    },
                    "im:valueVariable": "propertyIri"
                  },
                  {
                    "rdfs:comment": "Selects a quantifier from allowable range from property",
                    "sh:order": 2,
                    "sh:select": [
                      {
                        "@id": "im:Query_AllowableRanges"
                      }
                    ],
                    "im:builderChild": true,
                    "sh:path": {
                      "@id": "im:roleGroup"
                    },
                    "im:argument": [
                      {
                        "sh:parameter": "entityIri",
                        "im:valueVariable": "propertyIri"
                      }
                    ],
                    "im:name": "Quantifier",
                    "sh:minCount": 1,
                    "im:componentType": {
                      "@id": "im:entityAutoComplete"
                    }
                  }
                ]
              }
            ],
            "im:name": "Role group",
            "sh:minCount": 0,
            "im:componentType": {
              "@id": "im:arrayBuilder"
            }
          }
        ],
        "sh:minCount": 0,
        "im:componentType": {
          "@id": "im:stepsGroup"
        }
      }
    ]
  },
  CONCEPT_SET_SHAPE: {
    "@id": "im:Editor_ConceptSetShape",
    "rdf:type": [
      {
        "@id": "im:FormGenerator"
      }
    ],
    "rdfs:label": "Editor - Concept set shape",
    "rdfs:comment": "Form editor for a concept set",
    "im:targetShape": {
      "@id": "im:SetShape"
    },
    "im:isContainedIn": [
      {
        "@id": "im:ModelDataModels"
      }
    ],
    "sh:group": [
      {
        "rdfs:label": "Property group - Summary details",
        "im:name": "Summary details",
        "sh:order": 1,
        "sh:minCount": 1,
        "sh:maxCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        },
        "sh:property": [
          {
            "rdfs:comment": "A property that auto generates the type as  concept type",
            "sh:order": 1,
            "sh:function": {
              "@id": "im:Function_GetAdditionalAllowableTypes"
            },
            "sh:name": "type",
            "sh:path": {
              "@id": "rdf:type"
            },
            "im:argument": [
              {
                "im:valueIri": {
                  "@id": "im:ConceptSet"
                },
                "sh:parameter": "entityIri"
              }
            ],
            "im:isIri": {
              "@id": "im:ConceptSet"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:entityComboBox"
            }
          },
          {
            "rdfs:comment": "A property that auto generates a concept iri from the snomed extension",
            "sh:order": 2,
            "sh:name": "iri",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:id"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textDisplay"
            },
            "im:valueVariable": "conceptIri",
            "sh:class": {
              "@id": "im:Concept"
            },
            "sh:function": {
              "@id": "im:Function_SnomedConceptGenerator"
            }
          },
          {
            "rdfs:comment": "Property that derives a concept code from the concept iri",
            "sh:order": 3,
            "sh:name": "code",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:code"
            },
            "im:argument": [
              {
                "sh:parameter": "entityIri",
                "im:valueVariable": "conceptIri"
              },
              {
                "sh:parameter": "fieldName",
                "im:valueData": "code"
              }
            ],
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textDisplay"
            },
            "sh:dataType": {
              "@id": "xsd:string"
            },
            "sh:function": {
              "@id": "im:Function_LocalNameRetriever"
            }
          },
          {
            "rdfs:comment": "name or main term of concept",
            "sh:order": 4,
            "sh:name": "Concept name",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "rdfs:label"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:textInput"
            },
            "sh:dataType": {
              "@id": "xsd:string"
            }
          },
          {
            "rdfs:comment": "optional description",
            "sh:order": 5,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:name": "Concept description",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "rdfs:comment"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:htmlInput"
            }
          },
          {
            "rdfs:comment": "selects the status with a default of draft",
            "sh:order": 6,
            "sh:select": [
              {
                "@id": "im:Query_GetIsas"
              }
            ],
            "sh:name": "status",
            "sh:maxCount": 1,
            "sh:path": {
              "@id": "im:status"
            },
            "im:argument": [
              {
                "im:valueIri": {
                  "@id": "im:Status"
                },
                "sh:parameter": "this"
              }
            ],
            "im:isIri": {
              "@id": "im:Draft"
            },
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:entityComboBox"
            },
            "sh:class": {
              "@id": "im:Status"
            }
          }
        ]
      },
      {
        "rdfs:label": "Property group - Sub class steps",
        "sh:order": 2,
        "sh:maxCount": 0,
        "im:name": "Subclass of",
        "im:subGroup": [
          {
            "rdfs:label": "Property group - Sub type array builder",
            "sh:order": 1,
            "sh:path": {
              "@id": "rdfs:subClassOf"
            },
            "im:validation": {
              "@id": "im:Validation_hasParent"
            },
            "im:validationErrorMessage": "Entity is missing a parent. Add a parent to 'SubclassOf' or 'isContainedIn'.",
            "sh:property": [
              {
                "rdfs:comment": "selects an entity based on select query",
                "sh:order": 1,
                "sh:select": [
                  {
                    "@id": "im:Query_SearchConcepts"
                  }
                ],
                "im:builderChild": true,
                "sh:name": "Entity",
                "sh:path": {
                  "@id": "rdfs:subClassOf"
                },
                "sh:minCount": 1,
                "im:componentType": {
                  "@id": "im:entitySearch"
                },
                "sh:class": {
                  "@id": "im:ConceptSet"
                }
              }
            ],
            "im:name": "Subclass of",
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:arrayBuilder"
            }
          }
        ],
        "sh:minCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        }
      },
      {
        "rdfs:label": "Property group - Contained in steps",
        "im:name": "isContainedIn",
        "sh:order": 3,
        "sh:maxCount": 1,
        "sh:minCount": 0,
        "im:componentType": {
          "@id": "im:stepsGroup"
        },
        "im:subGroup": [
          {
            "rdfs:label": "Property group - contained in array builder",
            "im:name": "isContainedIn",
            "sh:order": 1,
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:arrayBuilder"
            },
            "im:validation": {
              "@id": "im:Validation_hasParent"
            },
            "im:validationErrorMessage": "Entity is missing a parent. Add a parent to 'SubclassOf' or 'isContainedIn'.",
            "sh:path": [
              {
                "@id": "im:isContainedIn"
              }
            ],
            "sh:property": [
              {
                "rdfs:comment": "selects an entity based on select query",
                "sh:name": "Entity",
                "sh:order": 1,
                "sh:minCount": 1,
                "im:builderChild": true,
                "im:componentType": {
                  "@id": "im:entitySearch"
                },
                "sh:select": [
                  {
                    "@id": "im:Query_SearchAll"
                  }
                ],
                "sh:path": [
                  {
                    "@id": "im:isContainedIn"
                  }
                ],
                "sh:class": [
                  {
                    "@id": "im:Folder"
                  },
                  {
                    "@id": "im:ConceptSet"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "rdfs:label": "Property group - Members steps",
        "im:name": "Members",
        "sh:order": 4,
        "sh:minCount": 0,
        "sh:maxCount": 1,
        "im:componentType": {
          "@id": "im:stepsGroup"
        },
        "im:subGroup": [
          {
            "rdfs:label": "Property group - members array builder",
            "im:name": "definition",
            "sh:order": 1,
            "sh:minCount": 1,
            "im:componentType": {
              "@id": "im:arrayBuilder"
            },
            "im:validation": {
              "@id": "im:Validation_hasParent"
            },
            "im:validationErrorMessage": "Entity is missing a parent. Add a parent to 'SubclassOf' or 'isContainedIn'.",
            "sh:path": [
              {
                "@id": "im:definition"
              }
            ],
            "im:subGroup": [
              {
                "rdfs:label": "Members builder",
                "im:name": "Members",
                "sh:order": 1,
                "sh:minCount": 1,
                "sh:maxCount": 1,
                "im:componentType": {
                  "@id": "im:arrayBuilderWithDropdown"
                },
                "im:builderChild": true,
                "im:function": {
                  "@id": "im:Function_GetLogicOptions"
                },
                "im:valueIri": {
                  "@id": "shacl:or"
                },
                "sh:path": [
                  {
                    "@id": "im:definition"
                  }
                ],
                "im:validation": {
                  "@id": "im:Validation_isDefinition"
                },
                "im:validationErrorMessage": "Not a valid definition",
                "sh:property": [
                  {
                    "rdfs:comment": "selects an entity based on select query",
                    "sh:name": "Entity",
                    "sh:order": 1,
                    "sh:minCount": 1,
                    "im:componentType": {
                      "@id": "im:entitySearch"
                    },
                    "sh:path": [
                      {
                        "@id": "im:definition"
                      }
                    ],
                    "sh:select": [
                      {
                        "@id": "im:Query_SearchConcepts"
                      }
                    ],
                    "sh:class": [
                      {
                        "@id": "im:Concept"
                      }
                    ],
                    "im:builderChild": true,
                    "im:valueVariable": "memberIri"
                  }
                ],
                "sh:subGroup": [
                  {
                    "rdfs:label": "Property Group - refinement component group",
                    "im:name": "Member refinement",
                    "sh:order": 1,
                    "sh:minCount": 0,
                    "im:builderChild": true,
                    "im:componentType": {
                      "@id": "im:componentGroup"
                    },
                    "sh:path": [
                      {
                        "@id": "im:definition"
                      }
                    ],
                    "sh:property": [
                      {
                        "rdfs:comment": "selects a property from allowable range from selected concept",
                        "sh:order": 1,
                        "sh:select": [
                          {
                            "@id": "im:Query_AllowableProperties"
                          }
                        ],
                        "im:builderChild": true,
                        "sh:path": [
                          {
                            "@id": "im:definition"
                          }
                        ],
                        "im:argument": [
                          {
                            "sh:parameter": "entityIri",
                            "im:valueVariable": "memberIri"
                          }
                        ],
                        "im:name": "Property",
                        "sh:minCount": 1,
                        "im:componentType": {
                          "@id": "im:entityAutoComplete"
                        },
                        "im:valueVariable": "propertyIri"
                      },
                      {
                        "rdfs:comment": "Selects a quantifier from allowable range from property",
                        "sh:order": 2,
                        "sh:select": [
                          {
                            "@id": "im:Query_AllowableRanges"
                          }
                        ],
                        "im:builderChild": true,
                        "sh:path": [
                          {
                            "@id": "im:roleGroup"
                          }
                        ],
                        "im:argument": [
                          {
                            "sh:parameter": "entityIri",
                            "im:valueVariable": "propertyIri"
                          }
                        ],
                        "im:name": "Quantifier",
                        "sh:minCount": 1,
                        "im:componentType": {
                          "@id": "im:entityAutoComplete"
                        }
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
};
