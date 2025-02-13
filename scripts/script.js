$(document).ready(function(){
  let ctx = $('#myChart')[0].getContext('2d'); // Get context
  let cb;

  // Official scrambler from http://rubikscube.info/pravidla/scrambles/scramble_cube.htm
  var size=3;
  var seqlen=23;
  var numcub=5;
  var mult=false;
  var cubeorient=false;
  var seq=new Array();	// move sequences
  var posit = new Array();	// facelet array
  function parse() {
      var s='';
      var urlquery=location.href.split('?')
      if(urlquery.length>1){
          var urlterms=urlquery[1].split('&')
          for( var i=0; i<urlterms.length; i++){
              var urllr=urlterms[i].split('=');
              if(urllr[0]=='size') {
                  if(urllr[1]-0 >= 2 ) size=urllr[1]-0;
              } else if(urllr[0]=='len') {
                  if(urllr[1]-0 >= 1 ) seqlen=urllr[1]-0;
              } else if(urllr[0]=='num'){
                  if(urllr[1]-0 >= 1 ) numcub=urllr[1]-0;
              } else if(urllr[0]=='multi') {
                  mult=(urllr[1]=='on');
              } else if(urllr[0]=='cubori') {
                  cubeorient=(urllr[1]=='on');
              } else if(urllr[0]=='col') {
                  if(urllr[1].length==6) colorString = urllr[1];
              }
          }
      }
  }
  parse();
  function scramble(){
      //tl=number of allowed moves (twistable layers) on axis -- middle layer ignored
      var tl=size; if(mult || (size&1)!=0 ) tl--;
      //set up bookkeeping
      var axsl=new Array(tl); // movement of each slice
      var axam=new Array(0,0,0); // number of slices moved each amount
      var la; // last axis moved

      // for each cube scramble
      for( n=0; n<numcub; n++){
          // initialise this scramble
          la=-1;
          seq[n]=new Array(); // moves generated so far

          // while generated sequence not long enough
          while( seq[n].length<seqlen ){

              // choose a different axis than previous one
              var ax;
              do{
                  ax=Math.floor(Math.random()*3);
              }while( ax==la );

              // reset slice/direction counters
              for( var i=0; i<tl; i++) axsl[i]=0;
              axam[0]=axam[1]=axam[2]=0;
              var moved = 0;

              // generate moves on this axis
              do{
                  // choose random unmoved slice
                  var sl;
                  do{
                      sl=Math.floor(Math.random()*tl);
                  }while( axsl[sl]!=0 );
                  // choose random amount
                  var q=Math.floor(Math.random()*3);

                  if( mult // multislice moves have no reductions so always ok
                      || tl!=size // odd cube always ok since middle layer is reference
                      ||   (axam[q]+1)*2<tl // less than half the slices in same direction also ok
                      || ( (axam[q]+1)*2==tl && axam[0]+axam[1]+axam[2]-axam[q]==0 ) // exactly half the slices move in same direction and no other slice moved
                  ){
                      axam[q]++;// adjust direction count
                      moved++;
                      axsl[sl]=q+1;// mark the slice has moved amount
                  }
              }while( Math.floor(Math.random()*3)==0 // 2/3 prob for other axis next,
              && moved<tl		// must change if all layers moved
              && moved+seq[n].length<seqlen ); // must change if done enough moves

              // append these moves to current sequence in order
              for( var sl=0; sl<tl; sl++){
                  if( axsl[sl] ){
                      var q=axsl[sl]-1;

                      // get semi-axis of this move
                      var sa = ax;
                      var m = sl;
                      if(sl+sl+1>=tl){ // if on other half of this axis
                          sa+=3; // get semi-axis (i.e. face)
                          m=tl-1-m; // slice number counting from that face
                          q=2-q; // opposite direction when looking at that face
                      }
                      // store move
                      seq[n][seq[n].length]=(m*6+sa)*4+q;
                  }
              }

              // avoid this axis next time
              la=ax;
          }

          // do a random cube orientation if necessary
          seq[n][seq[n].length]= cubeorient ? Math.floor(Math.random()*24) : 0;
      }

      // build lookup table
      flat2posit=new Array(12*size*size);
      for(i=0; i<flat2posit.length; i++) flat2posit[i]=-1;
      for(i=0; i<size; i++){
          for(j=0; j<size; j++){
              flat2posit[4*size*(3*size-i-1)+  size+j  ]=        i *size+j;	//D
              flat2posit[4*size*(  size+i  )+  size-j-1]=(  size+i)*size+j;	//L
              flat2posit[4*size*(  size+i  )+4*size-j-1]=(2*size+i)*size+j;	//B
              flat2posit[4*size*(       i  )+  size+j  ]=(3*size+i)*size+j;	//U
              flat2posit[4*size*(  size+i  )+2*size+j  ]=(4*size+i)*size+j;	//R
              flat2posit[4*size*(  size+i  )+  size+j  ]=(5*size+i)*size+j;	//F
          }
      }

      /*
             19                32
         16           48           35
             31   60      51   44
         28     80    63    67     47
                    83  64
                92          79
                    95  76

                       0
                   12     3
                      15
      */
  }
  function scramblestring(n){
      var s='',j;
      for(var i=0; i<seq[n].length-1; i++){
          if( i!=0 ) s+=' ';
          var k=seq[n][i]>>2;
          if(size<=5){
              s+='DLBURFdlburf'.charAt(k);
          }else{
              j=k%6; k=(k-j)/6;
              s+='DLBURF'.charAt(j);
              if(k) s+='<sub>'+(k+1)+'<\/sub>';
          }
          j=seq[n][i]&3;
          if(j!=0) s+=' 2'.charAt(j);
      }

      // add cube orientation
      if( cubeorient ){
          var ori = seq[n][seq[n].length-1];
          s='Top:'+colorList[ 2+colors[colorPerm[ori][3]] ]
              +'&nbsp;&nbsp;&nbsp;Front:'+colorList[2+ colors[colorPerm[ori][5]] ]+'<br>'+s;
      }
      return s;
  }
  function doslice(f,d,q){
      //do move of face f, layer d, q quarter turns
      var f1,f2,f3,f4;
      var s2=size*size;
      var c,i,j,k;
      if(f>5)f-=6;
      // cycle the side facelets
      for(k=0; k<q; k++){
          for(i=0; i<size; i++){
              if(f==0){
                  f1=6*s2-size*d-size+i;
                  f2=2*s2-size*d-1-i;
                  f3=3*s2-size*d-1-i;
                  f4=5*s2-size*d-size+i;
              }else if(f==1){
                  f1=3*s2+d+size*i;
                  f2=3*s2+d-size*(i+1);
                  f3=  s2+d-size*(i+1);
                  f4=5*s2+d+size*i;
              }else if(f==2){
                  f1=3*s2+d*size+i;
                  f2=4*s2+size-1-d+size*i;
                  f3=	 d*size+size-1-i;
                  f4=2*s2-1-d-size*i;
              }else if(f==3){
                  f1=4*s2+d*size+size-1-i;
                  f2=2*s2+d*size+i;
                  f3=  s2+d*size+i;
                  f4=5*s2+d*size+size-1-i;
              }else if(f==4){
                  f1=6*s2-1-d-size*i;
                  f2=size-1-d+size*i;
                  f3=2*s2+size-1-d+size*i;
                  f4=4*s2-1-d-size*i;
              }else if(f==5){
                  f1=4*s2-size-d*size+i;
                  f2=2*s2-size+d-size*i;
                  f3=s2-1-d*size-i;
                  f4=4*s2+d+size*i;
              }
              c=posit[f1];
              posit[f1]=posit[f2];
              posit[f2]=posit[f3];
              posit[f3]=posit[f4];
              posit[f4]=c;
          }

          /* turn face */
          if(d==0){
              for(i=0; i+i<size; i++){
                  for(j=0; j+j<size-1; j++){
                      f1=f*s2+         i+         j*size;
                      f3=f*s2+(size-1-i)+(size-1-j)*size;
                      if(f<3){
                          f2=f*s2+(size-1-j)+         i*size;
                          f4=f*s2+         j+(size-1-i)*size;
                      }else{
                          f4=f*s2+(size-1-j)+         i*size;
                          f2=f*s2+         j+(size-1-i)*size;
                      }
                      c=posit[f1];
                      posit[f1]=posit[f2];
                      posit[f2]=posit[f3];
                      posit[f3]=posit[f4];
                      posit[f4]=c;
                  }
              }
          }
      }
  }
  //-------------------------------------------
  let showChart = true;
  let hideTimer = false;
  let hideUI = false;

  // Checks if localStorage item QT_STORAGE doesn't exist, if it doesn't exist create it and display first time help message
  if(localStorage.getItem('QT_STORAGE') === null){
    // Creates array of empty arrays (for the times) and adds it to localStorage
    localStorage.setItem('QT_STORAGE', JSON.stringify([[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]));
    // Sets first time help message
    $('#info_message').text('Welcome! you can start/stop the timer by pressing the spacebar.');
  }
  // Checks if localStorage item QT_SETTINGS doesn't exist, if it doesn't exist create it
  if(localStorage.getItem('QT_SETTINGS') === null){
    // Creates an array with default settings and adds it to localStorage
    localStorage.setItem('QT_SETTINGS', JSON.stringify([true, false, false]));
  }

  class QTStorage {
    constructor(){
      // Gets what box is selected from the DOM and sets curr_box_id
      this.curr_box_id = $('.select-box').val();
      // Gets QT_STORAGE and QT_SETTINGS from localStorage and sets live_storage and settings
      this.live_storage = JSON.parse(localStorage.getItem('QT_STORAGE'));
      this.settings = JSON.parse(localStorage.getItem('QT_SETTINGS'));
    }
    getCurrentBox(){
      return JSON.parse(localStorage.getItem('QT_STORAGE'))[this.curr_box_id];
    } // Gets currently selected box from localStorage
    addToCurrentBox(time_data){
      // Gets all data from storage
      let live_storage = JSON.parse(localStorage.getItem('QT_STORAGE'));
      let emptyArray = [];
      // Create an empty array and add data from currently selected box (from storage)
      emptyArray = JSON.parse(localStorage.getItem('QT_STORAGE'))[this.curr_box_id];
      // Add time data to the end of the box
      emptyArray.push(time_data);
      // Add box to live_storage, then push storage back to localStorage
      live_storage[this.curr_box_id] = emptyArray;
      localStorage.setItem('QT_STORAGE', JSON.stringify(live_storage));
      this.live_storage = JSON.parse(localStorage.getItem('QT_STORAGE'));
    } // Adds data to the end of the currently selected box (in localStorage)
    saveSettings(){
      let var1 = $('#showChartCheck').prop('checked');
      let var2 = $('#showTimerCheck').prop('checked');
      let var3 = $('#showUI').prop('checked');
      localStorage.setItem('QT_SETTINGS', JSON.stringify([var1, var2, var3]));
    } // Saves the values of the setting checkboxes to localStorage (QT_SETTINGS)
  }
  class QTTimer{
    constructor(){
      this.m = 0;
      this.s = 0;
      this.ms = 0;
      this.started = false;
      this.interval;
      this.keydown = false;
    }
    n(v){
        return v > 9 ? '' + v: '0' + v;
    } // Adds a zero in front of a number if the number is not 2 digits long (1 -> 01 and 8 -> 08)
    timer(){
      $('#the_timer').text(  this.n(this.m)+':'+this.n(this.s)+'.'+this.n(this.ms/10)  );
      this.ms += 10;
      if(this.ms==1000){
          this.s+=1;
          this.ms=0;
      }
      if(this.s==60){
          this.m+=1;
          this.s=0;
      }
    } // Updates the timer on screen and in a variable
    start(){
      this.m = 0;
      this.s = 0;
      this.ms = 0;
      this.interval = setInterval(this.timer.bind(this), 10);
      this.started = true;
    } // Starts the timer interval (10ms)
    stop(){
      clearInterval(this.interval);
      this.started = false;
    } // Stops the timer interval
    clearTimer(){
      $('#the_timer').text('00:00.00');
      $('#ao5_val').text('-');
      $('#ao12_val').text('-');
      $('#mean_val').text('-');
    } // Clears the timer and stats display
    showTimer(show_q){
      if(show_q){
        // Sets the timer and stats to visible
        $('#the_timer').css('visibility', 'visible');
        $('#stats').css('visibility', 'visible');
      } else {
        // Sets the timer and stats to hidden
        $('#the_timer').css('visibility', 'hidden');
        $('#stats').css('visibility', 'hidden');
      }
    } // Shows or hides the timer and stats display (show_q boolean)
  }
  let storage = new QTStorage();
  let timer = new QTTimer()

  // Sets setting checkboxes to the setting values from localStorage
  $('#showChartCheck').prop('checked', storage.settings[0]);
  $('#showTimerCheck').prop('checked', storage.settings[1]);
  $('#showUI').prop('checked', storage.settings[2]);
  // Sets some variables to setting values from localStorage
  showChart = storage.settings[0];
  hideTimer = storage.settings[1];
  hideUI = storage.settings[2];

  function parseMinutes(minute_string){
    minute_string = minute_string.toString();
    let split_check = minute_string.split(':');
    if(split_check.length == 1){
      // split_check is not a minute string so pass input back
      return minute_string;
    } else {
      // split_check is a minute string so convert it to seconds
      let minutes = minute_string.split(':')[0];
      let seconds = minute_string.split(':')[1].split('.')[0];
      let milliseconds = minute_string.split(':')[1].split('.')[1];
      let time1 = (minutes * 60) + parseInt(seconds);
      let time2 = time1 + '.' + milliseconds;
      return (parseFloat(time2)).toFixed(2);
    }
  } // Parse minutes format to seconds (01:14.15 -> 74.15)
  function parseSeconds(seconds_float){
    if(seconds_float >= 60){
      var quotient = Math.floor(seconds_float/60);
      var remainder = (seconds_float % 60).toFixed(2);
      var seconds = timer.n((remainder.split('.'))[0]);
      var mseconds = (remainder.split('.'))[1];
      return `${quotient}:${seconds}.${mseconds}`;
    } else {
      return seconds_float;
    }
  } // Parse seconds to minutes format (74.15 -> 01:14.15)

  function showUI(show_q){
    if(show_q){
      // Set the leftbar, topbar and chartbox to visible
      $('#left_bar').css('visibility', 'visible');
      $('#top_bar').css('visibility', 'visible');
      $('.chartBox').css('visibility', 'visible');
    } else {
      // Set the leftbar, topbar and chartbox to hidden
      $('#left_bar').css('visibility', 'hidden');
      $('#top_bar').css('visibility', 'hidden');
      $('.chartBox').css('visibility', 'hidden');
    }
  } // Sets the leftbar, topbar and chartbox visibility to show_q (boolean)
  function bouncer(arr) {
    return arr.filter(Boolean);
  } // Filters out all 0, -0, null, NaN, false, undefined and "" from arr (USED to filter out NaN in arrays)
  function updateScramble(){
    scramble();
    $('#scramble').text(scramblestring(0));
  } // Generates a new scramble and displays it to the screen (top_bar)
  function updateTimeTable(){
    // Clears all times on screen and add header row
    $('#the_time_table').empty();
    $('#mo3_val').text('-');
    // Gets a fresh copy of all time in the currently selected box
    let currentBox = storage.getCurrentBox();

    let timebox = {
      // Creates some empy arrays to be filled later
      time: [], mo3: [], ao5: [], ao12: [], mean: [], number: [],
      time_s: [], 
      mo3_s: ['-', '-', '-'], 
      ao5_s: ['-', '-', '-', '-'], 
      ao12_s: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
      
      last_mo3: function(){
        if( ((this.mo3).slice(-1)[0]) ){
          return ((this.mo3).slice(-1)[0]).toFixed(2);
        }
      }, // Returns current mean of 3
      last_ao5: function(){
        if( ((this.ao5).slice(-1)[0]) ){
          return ((this.ao5).slice(-1)[0]).toFixed(2);
        }
      }, // Returns current average of 5
      last_ao12: function(){
        if( ((this.ao12).slice(-1)[0]) ){
          return ((this.ao12).slice(-1)[0]).toFixed(2);
        }
      }, // Returns current average of 12
      last_mean: function(){ return ((this.mean).slice(-1)[0]); }, // Returns current mean
    }

    currentBox.forEach(function(element){
      (timebox.time).push( parseFloat(parseMinutes(element.time)) );
    }); // Fills the time array in timebox
    let k = 1;
    (timebox.time).forEach(function(element){
      (timebox.time_s).push( element.toFixed(2) );
      (timebox.number).push(k);
      k++;
    }); // Fills the time(show) and number array in timebox
    for(i=4; i<(timebox.time).length; i++){
      (timebox.ao5_s).push( (((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2]+(timebox.time)[i-3]+(timebox.time)[i-4])/5).toFixed(2) );
      (timebox.ao5).push( (((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2]+(timebox.time)[i-3]+(timebox.time)[i-4])/5) );
    } // Fills the ao5(show) box in timebox
    for(i=11; i<(timebox.time).length; i++){
      (timebox.ao12_s).push( (((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2]+(timebox.time)[i-3]+(timebox.time)[i-4]+(timebox.time)[i-5]+(timebox.time)[i-6]+(timebox.time)[i-7]+(timebox.time)[i-8]+(timebox.time)[i-9]+(timebox.time)[i-10]+(timebox.time)[i-11])/12).toFixed(2));
      (timebox.ao12).push( (((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2]+(timebox.time)[i-3]+(timebox.time)[i-4]+(timebox.time)[i-5]+(timebox.time)[i-6]+(timebox.time)[i-7]+(timebox.time)[i-8]+(timebox.time)[i-9]+(timebox.time)[i-10]+(timebox.time)[i-11])/12));
    } // Fills the ao12(show) box in timebox
    for(i=2; i<(timebox.time).length; i++){
      ((timebox.mo3_s).push( ((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2])/3 )).toFixed(2);
      ((timebox.mo3).push( ((timebox.time)[i]+(timebox.time)[i-1]+(timebox.time)[i-2])/3 ));
    } // Fills the mo3(show) box in timebox
    for(i=0; i<(timebox.time).length; i++){
      current_num_in_array = i;
      current_value = 0;
      nums = 0;
      for(j=0; j<(i+1); j++){
        current_value += timebox.time[j];
        nums++;
      }
      (timebox.mean).push( (current_value/nums).toFixed(2) );
    } // Fills the mean box in timebox

    // Sets the current MO3, AO5, AO12 and mean text
    $('#mo3_val').text( timebox.last_mo3() );
    $('#ao5_val').text( timebox.last_ao5() );
    $('#ao12_val').text( timebox.last_ao12() );
    $('#mean_val').text( timebox.last_mean() );
    
    // Fills an array with all items from a category without the '-' items
    timebox.mo3_f = (timebox.mo3).slice(2);
    timebox.ao5_f = (timebox.ao5).slice(4);
    timebox.ao12_f = (timebox.ao12).slice(11);

    // Gets the best time for each category
    let mo3_val_best = ( (Math.min( ...timebox.mo3)).toFixed(2) == 'Infinity' ? '-' : (Math.min( ...timebox.mo3)).toFixed(2) );
    let ao5_val_best = ( (Math.min( ...timebox.ao5)).toFixed(2) == 'Infinity' ? '-' : (Math.min( ...timebox.ao5)).toFixed(2) );
    let ao12_val_best = ( (Math.min( ...timebox.ao12)).toFixed(2) == 'Infinity' ? '-' : (Math.min( ...timebox.ao12)).toFixed(2) );
    let time_val_best = ( Math.min( ...timebox.time) == 'Infinity' ? '-' : Math.min( ...timebox.time) );

    // Sets the text on screen to the best time for the category
    $('#mo3_val_best').text( mo3_val_best );
    $('#ao5_val_best').text( ao5_val_best );
    $('#ao12_val_best').text( ao12_val_best );
    $('#fastest_val_best').text( time_val_best );

    // Adds a new list item in the timetable for every time in the (show)array
    (timebox.time_s).forEach(function(element, index){
      $('#the_time_table').prepend(`<tr id="timerow"><td>${index+1}</td><td>${timebox.time_s[index]}</td><td>${timebox.ao5_s[index]}</td><td>${timebox.ao12_s[index]}</td><td>&times;</td></tr>`);
    });
    // Adds table headers to the table
    $('#the_time_table').prepend('<tr id="timerow"><td>No.</td><td>Time</td><td>AO5</td><td>AO12</td><td>Del</td></tr>');

    // Draws the chart to the screen with the right value's
    function drawChart(){
      myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timebox.number,
            datasets: [{
              fill: false,
                label: 'Time',
                data: timebox.time,
                borderColor: ['rgba(255, 99, 132, 1)'],
                borderWidth: 1
            },

            {
              fill: false,
                label: 'AO5',
                data: timebox.ao5_s,
                borderColor: ['rgba(99, 255, 132, 1)'],
                borderWidth: 1
            },

            {
              fill: false,
                label: 'AO12',
                data: timebox.ao12_s,
                borderColor: ['rgba(132, 99, 255, 1)'],
                borderWidth: 1
            },

            {
              fill: false,
                label: 'Mean',
                data: timebox.mean,
                borderColor: ['rgba(80, 80, 80, 1)'],
                borderWidth: 1
            }]
        },
        options: {
          elements: {
            line: {
                tension: 0 // disables bezier curves
              }
          },
          responsive: false,
          animation: {
            duration: 0 // general animation time
          },
          hover: {
              animationDuration: 0 // duration of animations when hovering an item
          },
          responsiveAnimationDuration: 0,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: false
                    }
                }]
            }
        }
    }); //e
    }

    // Deletes the chart if it already exists
    if(showChart){
      try {
        myChart.destroy();
      } catch {
      }
    }
    // Draws the chart to the screen
    drawChart()
  }
  
  // --- Event listeners ---
  $('.select-box').change(function(){
    storage.curr_box_id = $('.select-box').val();
    updateTimeTable(storage.curr_box_id);
  }); // On 'Timebox' selectbox change
  $('.clear-curr-box-btn').click(function(){
    if(confirm(`Are you sure you want to clear box number ${storage.curr_box_id} ?`)){
      let ar = JSON.parse(localStorage.getItem('QT_STORAGE'));
      ar[storage.curr_box_id] = [];
      localStorage.setItem('QT_STORAGE', JSON.stringify(ar));
      updateTimeTable();
      timer.clearTimer();
    }
  }); // On 'clear current box' button click
  $('.clear-all-boxes-btn').click(function(){
    if(confirm('Are you sure you want to clear all the boxes?')){
      localStorage.setItem('QT_STORAGE', JSON.stringify([[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]));
      updateTimeTable();
      timer.clearTimer();
    }
  }); // On 'clear all boxes' button click
  $('#exportButton').click(function(){
    let today = new Date();
    let dateName = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+'-'+today.getHours()+'_'+today.getMinutes();
    let de = document.createElement('a');
    de.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(localStorage.getItem('QT_STORAGE'))));
    de.setAttribute('download', 'Qtimer_'+dateName);
    de.style.display = 'none';
    document.body.appendChild(de);
    de.click();
    document.body.removeChild(de);
  }); // On 'export' button click
  $('#importButton').click(function(){
    let importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(file,'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;
            localStorage.setItem('QT_STORAGE', JSON.parse(content));
            updateTimeTable();
        }
    };
    importInput.click();
  }); // On 'import' button click
  $('#the_time_table').on('click', '#timerow td', function(){
    let tr_number = $(this).parent().children(':eq(0)').text();
    let ar_number = parseInt(tr_number) - 1;
    let scramble = storage.live_storage[storage.curr_box_id][ar_number].scramble;
    let time = storage.live_storage[storage.curr_box_id][ar_number].time;

    switch($(this).index()){
      case 0:
        // Clicked on the number
      case 1:
        // Clicked on the time
      case 2:
        // Clicked on ao5
      case 3:
        // Clicked on ao12
        alert(`Scramble for solve No. ${tr_number} (${time}) \n${scramble}`);
        break;
      case 4:
        // Clicked on delete
        if(confirm(`Are you sure you want to delete number ${tr_number} ?`)){
          let live_storage = JSON.parse(localStorage.getItem('QT_STORAGE'));
          live_storage[storage.curr_box_id].splice(tr_number-1, 1);
          localStorage.setItem('QT_STORAGE', JSON.stringify(live_storage));
        }
        updateTimeTable();
        break;
    }
  }) // On tr click in time table

  $('#showChartCheck').change(function(){
    showChart = $('#showChartCheck').is(':checked');
    if(showChart){
      $('.chartBox').css('display', 'block');
    } else {
      $('.chartBox').css('display', 'none');
    }
    storage.saveSettings();
  }); // On 'show chart' xelectbox change
  $('#showTimerCheck').change(function(){
    hideTimer = $('#showTimerCheck').is(':checked');
    storage.saveSettings();
  }); // On 'show timer' selectbox change
  $('#showUI').change(function(){
    hideUI = $('#showUI').is(':checked');
    storage.saveSettings();
  }); // On 'show ui' selectbox change
  
  $(document).keyup(function(e){
    if(e.which == 32){
      if(timer.keydown){
        timer.keydown = false;
      } else {
        timer.start();
        $('#info_message').text('');
        if(hideTimer){
          timer.showTimer(false);
        }
        if(hideUI){
          showUI(false);
        }
      }
    }
  }); // Starts the timer (and hides the ui/timer if needed) and deletes the info_message
  $(document).keydown(function(e){
    if(e.which == 32){
      if(timer.started){
        timer.stop();
        timer.keydown = true;

        let finished_time;
        let minutes = ($('#the_timer').text()).split(':')[0];
        let seconds = ($('#the_timer').text()).split(':')[1].split('.')[0];
        let milliseconds = ($('#the_timer').text()).split(':')[1].split('.')[1];

        // If time is less then a minute
        if(minutes == "00"){
          let first_num_sec = parseInt(seconds);
          finished_time = `${first_num_sec}.${milliseconds}`;
        } else { //If time is more then a minute
          let first_num = parseInt(minutes);
          finished_time = `${first_num}:${seconds}.${milliseconds}`;
        }

        let current_scramble = $('#scramble').text();
        storage.addToCurrentBox({'time': finished_time, 'scramble': current_scramble});
        updateTimeTable();
        updateScramble();
        showChart = $('#showChartCheck').prop('checked');

        if(hideTimer){
          timer.showTimer(true);
        }
        if(hideUI){
          showUI(true);
        }
      }
    }
  }); // Stops the timer (and shows the ui/timer if needed)

  // Shows/hides the chart (settings)
  if(showChart){
    $('.chartBox').css('display', 'block');
  } else {
    $('.chartBox').css('display', 'none');
  }

  // Updates timetable and scramble on document load
  updateScramble();
  updateTimeTable();
});
