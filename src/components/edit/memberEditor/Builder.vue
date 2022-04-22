<template>
  <div id="members-builder-container">
    <h3>Members builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="members-build">
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
import HasMembers from "@/components/edit/memberEditor/builder/HasMembers.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, deleteItem, updateItem, updatePositions, scrollIntoView, addItem, addNextOptions }
} = Helpers;
const { IM, SHACL, RDF } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Builder",
  props: { members: { type: Object as any, required: true } },
  components: { AddDeleteButtons, AddNext, Definition, HasMembers, Logic, Entity, Refinement },
  emits: {
    "concept-updated": (payload: any) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    membersBuild: {
      handler() {
        this.onConfirm();
      },
      deep: true
    }
  },
  mounted() {
    this.createBuild();
  },
  data() {
    return {
      membersBuild: [] as any[],
      membersAsNode: {} as any,
      loading: true
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.membersBuild = [];
      if (!isObjectHasKeys(this.members, [IM.DEFINITION]) && !isObjectHasKeys(this.members, [IM.HAS_MEMBERS])) {
        this.loading = false;
        return;
      }
      if (isObjectHasKeys(this.members, [IM.DEFINITION])) {
        this.membersBuild.push(generateNewComponent(ComponentType.DEFINITION, 0, this.members[IM.DEFINITION], BuilderType.MEMBER, true));
      }
      if (isObjectHasKeys(this.members, [IM.HAS_MEMBERS])) {
        this.membersBuild.push(
          generateNewComponent(ComponentType.HAS_MEMBERS, this.membersBuild.length, this.members[IM.HAS_MEMBERS], BuilderType.MEMBER, true)
        );
      }
      if (!isArrayHasLength(this.membersBuild)) {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.membersBuild = [generateNewComponent(ComponentType.DEFINITION, 0, [], BuilderType.MEMBER, true)];
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
        if (item.type === ComponentType.HAS_MEMBERS) {
          members[IM.HAS_MEMBERS] = item.json;
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
      if (data.position === 0) {
        if (this.membersBuild[0].type !== ComponentType.LOGIC) {
          this.membersBuild.unshift(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.MEMBER, true));
        }
      }
      updatePositions(this.membersBuild);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.membersBuild);
    },

    addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
      addItem(data, this.membersBuild, BuilderType.MEMBER, true);
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
}
</style>
