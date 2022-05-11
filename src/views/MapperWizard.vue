<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>
    <div class="card">
      <Steps :model="items" :readonly="false" />
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
</style>
