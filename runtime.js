/* 
############################################################################################
####		Created & Developed by João Gabriel Corrêa da Silva (All Rights Reserved)   ####
####	    https://www.linkedin.com/in/jo%C3%A3o-gabriel-corr%C3%AAa-da-silva/	        ####
############################################################################################
*/
(function(){
    const dateTest = /^\d{4}-(((0[13578]|1[02])-(0[1-9]|[12]\d|3[0-1]))|(02-(0[1-9]|[12]\d))|((0[469]|11)-(0[1-9]|[12]\d|30)))$/gm;
    let data = [];
    let headers = [];
    let chart;
    let isPlaying = false;
    let playTimeouts = [];
    let synth;

    function isTemporal(colName, values) {
      const keywords = ["year", "date", "month", "day", "time"];
      const lower = colName.toLowerCase();
      if (keywords.some(k => lower.includes(k))) return true;

      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (nums.length < 5) return false;

      const unique = [...new Set(nums)].sort((a, b) => a - b);
      const diffs = unique.slice(1).map((v, i) => v - unique[i]);
      return diffs.every(d => d > 0);
    }

    function handleCSVResults(results){
        data = results.data;
        headers = results.meta.fields;

        const xSelect = document.getElementById("xSelect");
        const ySelect = document.getElementById("ySelect");
        xSelect.innerHTML = ySelect.innerHTML = "";

        const sample = data.map(row => row);
        headers.forEach(h => {
            const values = sample.map(r => r[h]);
            const opt = new Option(h, h);
            if (isTemporal(h, values)) xSelect.add(opt.cloneNode(true));
            if (!isNaN(parseFloat(values[0]))) ySelect.add(opt);
        });

        document.getElementById("playMusic").disabled = false;
        document.getElementById("playMusic").removeAttribute('disabled');
    }

    function loadDefault(){
        Papa.parse("./Trending_Movies.csv", {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: handleCSVResults
        })
    }

    function handleFileSelect(evt) {
      Papa.parse(evt.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: handleCSVResults
      });
    }

    function mapToNotes(values, noteScale) {
      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return nums.map(v => {
        const idx = Math.floor(((v - min) / (max - min)) * (noteScale.length - 1));
        return noteScale[idx];
      });
    }

    async function playMusic() {
      stopMusic();
      document.getElementById("playMusic").innerHTML = 'Parar';

      const xCol = document.getElementById("xSelect").value;
      const yCol = document.getElementById("ySelect").value;
      const noteDisplay = document.getElementById("noteDisplay");
      if (!xCol || !yCol || data.length === 0) return;

      const _data = data.filter(x=> !["undefined", "null", "", "false", "true"].includes(String(x[xCol]).trim()) ).sort((_a, _b)=>{
        const a = _a[xCol];
        const b = _b[xCol];
        if(typeof a === "string") {
            if(dateTest.test(a) && dateTest.test(b)) return new Date(a).getTime()-new Date(b).getTime();
            return a.localeCompare(b);
        }
        return a-b;
      });

      const values = _data.map(row => parseFloat(row[yCol])).filter(v => !isNaN(v));
      const labels = _data.map(row => row[xCol]).slice(0, values.length);

      // Escala Maior em C
      // const noteScale = ["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5"];
      // Escala  blues maior em C
      const noteScale = ["C3","D3","Eb3","E3","G3","A3","C4","D4","Eb4","E4","G4","A4","C5","D5","Eb5","E5","G5","A5"];
      
      const notes = mapToNotes(values, noteScale);

      const ctx = document.getElementById('dataChart').getContext('2d');
      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: yCol,
            data: values,
            borderColor: '#2980b9',
            fill: false,
          }]
        },
        options: {
          scales: {
            x: { display: true, title: { display: true, text: xCol } },
            y: { display: true, title: { display: true, text: yCol } }
          }
        }
      });

      await Tone.start();

    //   synth = new Tone.PolySynth(Tone.Synth, {
    //     envelope: {
    //       attack: 0.1,
    //       decay: 0.2,
    //       sustain: 0.3,
    //       release: 0.8
    //     }
    //   }).toDestination();

      synth = new Tone.Sampler({
            // envelope: {
            //     attack: 0.1,
            //     decay: 0.2,
            //     sustain: 0.3,
            //     release: 0.8
            // },
            urls: {
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination();

       await Tone.loaded(); 

      isPlaying = true;
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const time = 0.2 * i * 1000;
        const timeoutId = setTimeout(() => {
          if (!isPlaying) return;
          if(document.querySelector(`.active[note]`)) document.querySelector(`.active[note]`).classList.remove('active');
          document.querySelector(`[note="${note}"]`).classList.add('active');
          noteDisplay.innerHTML = `<span class="pill">${xCol}: ${labels[i]}</span> → <span class="pill">${yCol}: ${values[i]} | ${note}</span>`;
          synth.triggerAttackRelease(note, "4n");
        }, time);
        playTimeouts.push(timeoutId);
      }
    }

    function stopMusic() {
      isPlaying = false;
      playTimeouts.forEach(clearTimeout);
      playTimeouts = [];
      if (synth) {
        synth.releaseAll();
      }
      document.getElementById("noteDisplay").innerText = "Música parada.";
      document.getElementById("playMusic").innerHTML = 'Tocar';
    }

    document.getElementById("playMusic").addEventListener("click", ()=> isPlaying? stopMusic(): playMusic());
    document.getElementById("csvFile").addEventListener("change", handleFileSelect);


    document.getElementById("useDefault").addEventListener("click", loadDefault);
    document.getElementById("uploadData").addEventListener("click", ()=>document.getElementById("csvFile").click());
    
    
})()