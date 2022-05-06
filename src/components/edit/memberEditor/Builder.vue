<template>
  <div id="members-builder-container">
    <h3>Members builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="members-build" :class="invalidParents && 'invalid'">
      <small v-if="invalidParents" class="validate-error">Entity must have at least 1 parent.</small>
      <template v-for="item of membersBuild" :key="item.id">
        <component
          :is="item.type"
          :value="item.value"
          :id="item.id"
          :position="item.position"
          :showButtons="item.showButtons"
          :builderType="item.builderType"
          @deleteClicked="deleteItem"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addItemWrapper"
        >
        </component>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import Logic from "@/components/edit/memberEditor/builder/Logic.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import Refinement from "@/components/edit/memberEditor/builder/Refinement.vue";
import Definition from "@/components/edit/memberEditor/Definition.vue";
import HasMember from "@/components/edit/memberEditor/builder/HasMember.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { generateNewComponent, updateItem, updatePositions, addItem }
} = Helpers;
const { IM } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Builder",
  props: { members: { type: Object as any, required: true } },
  components: { AddDeleteButtons, AddNext, Definition, HasMember, Logic, Entity, Refinement },
  emits: {
    "concept-updated": (_payload: any) => true
  },
  computed: mapState(["filterOptions", "creatorInvalidEntity", "creatorValidity", "editorInvalidEntity", "editorValidity"]),
  watch: {
    membersBuild: {
      handler() {
        this.onConfirm();
        if (this.creatorInvalidEntity) {
          this.setInvalidInputs(this.creatorValidity);
        }
        if (this.editorInvalidEntity) {
          this.setInvalidInputs(this.editorValidity);
        }
      },
      deep: true
    },
    creatorInvalidEntity(newValue) {
      if (newValue) {
        this.setInvalidInputs(this.creatorValidity);
      }
    },
    editorInvalidEntity(newValue) {
      if (newValue) {
        this.setInvalidInputs(this.editorValidity);
      }
    }
  },
  mounted() {
    this.createBuild();
  },
  data() {
    return {
      membersBuild: [] as any[],
      membersAsNode: {} as any,
      loading: true,
      invalidParents: false
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.membersBuild = [];
      if (!isObjectHasKeys(this.members, [IM.DEFINITION]) && !isObjectHasKeys(this.members, [IM.HAS_MEMBER])) {
        this.createDefaultBuild();
        this.loading = false;
        return;
      }
      if (isObjectHasKeys(this.members, [IM.DEFINITION])) {
        this.membersBuild.push(generateNewComponent(ComponentType.DEFINITION, 0, this.members[IM.DEFINITION], BuilderType.MEMBER, { minus: true, plus: true }));
      }
      if (isObjectHasKeys(this.members, [IM.HAS_MEMBER])) {
        this.membersBuild.push(
          generateNewComponent(ComponentType.HAS_MEMBER, this.membersBuild.length, this.members[IM.HAS_MEMBER], BuilderType.MEMBER, { minus: true, plus: true })
        );
      }
      if (!isArrayHasLength(this.membersBuild)) {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.membersBuild = [generateNewComponent(ComponentType.DEFINITION, 0, [], BuilderType.MEMBER, { minus: true, plus: true })];
    },

    generateMembersAsNode(item: ComponentDetails) {
      let json = [];
      if (this.membersBuild.length) {
        for (const item of this.membersBuild) {
          json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      let members = {} as any;
      for (const item of this.membersBuild) {
        if (item.type === ComponentType.DEFINITION) {
          members[IM.DEFINITION] = item.json;
        }
        if (item.type === ComponentType.HAS_MEMBER) {
          members[IM.HAS_MEMBER] = item.json;
        }
      }
      this.$emit("concept-updated", members);
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.membersBuild.findIndex(item => item.position === data.position);
      this.membersBuild.splice(index, 1);
      const length = this.membersBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      this.toggleButtons();
      updatePositions(this.membersBuild);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.membersBuild);
    },

    addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
      if (data.selectedType === ComponentType.HAS_MEMBER) data.value = [];
      if (data.selectedType === ComponentType.DEFINITION) data.value = [];
      addItem(data, this.membersBuild, BuilderType.MEMBER, { minus: true, plus: true });
      this.toggleButtons();
    },

    toggleButtons() {
      if (
        this.membersBuild.findIndex(item => item.type === ComponentType.DEFINITION) &&
        this.membersBuild.findIndex(item => item.type === ComponentType.HAS_MEMBER)
      ) {
        this.membersBuild.forEach(item => (item.showButtons = { minus: true, plus: false }));
      } else {
        this.membersBuild.forEach(item => (item.showButtons = { minus: true, plus: true }));
      }
    },

    setInvalidInputs(validities: { key: string; valid: boolean }[]) {
      const parentsFound = validities.find((item: { key: string; valid: boolean }) => item.key === "parents");
      if (parentsFound) this.invalidParents = !parentsFound.valid;
      else this.invalidParents = true;
    }
  }
});
</script>

<style scoped>
#members-builder-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

#members-build {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 1rem;
  gap: 1rem;
}

.invalid {
  border-color: #e24c4c !important;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
}
</style>
