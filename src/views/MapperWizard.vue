<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>
    <div class="card">
      <Steps :model="items" :readonly="true" />
    </div>

    <router-view v-slot="{ Component }" :data="data" @prevPage="prevPage($event)" @nextPage="nextPage($event)">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "MapperWizard",
  data() {
    return {
      items: [
        {
          label: "Define task",
          to: "/mapper/definition"
        },
        {
          label: "Select task",
          to: "/mapper/selection"
        },
        {
          label: "Match to",
          to: "/mapper/match"
        },
        {
          label: "Confirm",
          to: "/mapper/confirmation"
        }
      ],
      data: {} as any
    };
  },
  methods: {
    nextPage(event: any) {
      for (const property in event.data) {
        this.data[property] = event.data[property];
      }
      this.$router.push(this.items[event.pageIndex + 1].to);
    },
    prevPage(event: any) {
      this.$router.push(this.items[event.pageIndex - 1].to);
    }
  }
});
</script>

<style scoped lang="scss">
::v-deep(b) {
  display: block;
}

::v-deep(.p-card-body) {
  padding: 2rem;
}

#topbar-mapper-container {
  height: 100vh;
  width: 100vw;
  overflow: auto;
}

.tree-bar-container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
}

#mapper-main-container {
  width: 100%;
  height: calc(100% - 93.81px);
  overflow-y: auto;
}

.loading-container {
  width: 100%;
  height: 100%;
}

.content {
  width: 50%;
  height: 100%;
}

.title {
  font-size: 2rem;
}

.tabView {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.type-icon {
  padding-right: 0.5rem;
}

.drop-zone {
  background-color: #eee;
  margin-bottom: 10px;
  padding: 10px;
}

.drag-el {
  background-color: #fff;
  margin-bottom: 10px;
  padding: 5px;
  cursor: pointer;
}

.drag-el:hover {
  background-color: #6c757d;
  color: #ffffff;
}
</style>
