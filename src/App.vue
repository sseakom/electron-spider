<template>
  <div id="app">
    <el-form :inline="true" :model="form" class="demo-form-inline">
      <el-form-item label="Place of Loading">
        <el-select v-model="form.loadingPlace" filterable remote :remote-method="loadingMethod">
          <el-option v-for="item in loadingOpt" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="Place of Discharge">
        <el-select v-model="form.dischargePlace" filterable remote :remote-method="dischargeMethod">
          <el-option v-for="item in dischargeOpt" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
    <el-button v-if="form.dischargePlace && form.loadingPlace" type="primary" icon="el-icon-search" @click="search">search</el-button>
    <el-button v-if="table.length" :type="done ? 'success' : 'primary'" icon="el-icon-download" @click="exportToCsv">export</el-button>
    </el-form>
    <el-table :data="table" stripe style="width: 100%">
      <el-table-column prop="vessel" label="vessel" sortable></el-table-column>
      <el-table-column prop="Port" label="Port" sortable></el-table-column>
      <el-table-column prop="Arrival" label="Arrival" sortable></el-table-column>
      <el-table-column prop="Sail" label="Sail" sortable></el-table-column>
      <el-table-column prop="Terminal" label="Terminal" sortable></el-table-column>
      <el-table-column prop="VGM Cut-off" label="VGM Cut-off" sortable></el-table-column>
      <el-table-column prop="Port Cutof" label="Port Cutof" sortable></el-table-column>
    </el-table>
    <a ref="link" id="link" style="visibility: hidden;"></a>
  </div>
</template>

<script>
export default {
  name: 'app',
  components: {
  },
  data () {
    return {
      form: {
        loadingPlace: '',
        dischargePlace: ''
      },
      loadingOpt: [],
      dischargeOpt: [],
      table: [],
      done: false
    }
  },
  mounted () {
    window.electron.ipcRenderer.on('setPort', (e, key, res) => {
      console.log('setPort: ', key, res);
      switch (key) {
        case 'loadingOpt':
          this.loadingOpt = res.map(item => {
            return {
              value: item.ActualName,
              label: item.name
            }
          })
          break;
        case 'dischargeOpt':
          this.dischargeOpt = res.map(item => {
            return {
              value: item.ActualName,
              label: item.name
            }
          })
          break;
        case 'voyage':
          this.voyage = res
          break
        case 'addRow':
          this.table.push(res)
          break
        case 'done':
          this.done = true
          break
        default:
          break;
      }
    })
  },
  methods: {
    loadingMethod (queryString) {
      console.log('queryString: ', queryString)
      if (queryString === '') return
      window.electron.ipcRenderer.send('getPort', 'loadingOpt', queryString);
    },
    dischargeMethod (queryString) {
      console.log('queryString: ', queryString)
      if (queryString === '') return
      window.electron.ipcRenderer.send('getPort', 'dischargeOpt', queryString);
    },
    search () {
      this.done = false
      this.table = []
      const POLDescription = encodeURI(this.form.loadingPlace)
      const PODDescription = encodeURI(this.form.dischargePlace)
      const url = `http://www.cma-cgm.com/ebusiness/schedules/routing-finder?POLDescription=${POLDescription}&PODDescription=${PODDescription}&g-recaptcha-response=undefined&actualPOLDescription=${POLDescription}&actualPODDescription=${PODDescription}`
      console.log('url: ', url);
      window.electron.ipcRenderer.send('queryURL', url);
    },
    exportToCsv () {
      let csvContent = 'data:text/csv;charset=utf-8,\ufeff'
      const header = Object.keys(this.table[0])
      console.log('header: ', header);
      header.forEach((item) => {
        csvContent += item + ','
      })
      csvContent = csvContent.replace(/,$/, '\n')
      this.table.forEach((item, index) => {
        let dataString = ''
        for (let i = 0; i < header.length; i++) {
          dataString += `"${item[header[i]]}",`
        }
        csvContent += index < this.table.length ? dataString.replace(/,$/, '\n') : dataString.replace(/,$/, '')
      })
      this.$refs.link.setAttribute('href', encodeURI(csvContent))
      this.$refs.link.setAttribute('download', `${this.form.dischargePlace}---${this.form.loadingPlace}.csv`)
      document.getElementById('link').click()
    }
  }
}
</script>