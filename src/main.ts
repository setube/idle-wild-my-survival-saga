import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import pinia from './stores'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { validateGameConfiguration } from './plugins/configAssertions'

validateGameConfiguration()

const app = createApp(App)

app.use(ElementPlus)
app.use(pinia)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
const root = document.querySelector('#app')
if (!(root instanceof HTMLElement)) {
  throw new Error('应用挂载节点 #app 不存在')
}
app.mount(root)
