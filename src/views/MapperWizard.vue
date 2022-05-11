<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>
    <div class="steps-json-container">
      <div class="steps-content">
        <Steps :model="items" :readonly="false" />
      </div>
    </div>

    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" :data="stepsObject" @prevPage="prevPage($event)" @nextPage="nextPage($event)" />
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
          label: "Map to",
          to: "/mapper/match"
        },
        {
          label: "Confirm",
          to: "/mapper/confirmation"
        }
      ],
      stepsObject: {} as any
    };
  },
  methods: {
    nextPage(event: any) {
      for (const property in event.data) {
        this.stepsObject[property] = event.data[property];
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
#topbar-mapper-container {
  height: 100vh;
  width: 100vw;
  overflow: auto;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

.steps-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.steps-content {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  background-color: #ffffff;
}

.p-steps {
  width: 100%;
}
</style>
