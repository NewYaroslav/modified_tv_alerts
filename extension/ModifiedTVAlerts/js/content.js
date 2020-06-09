var api_socket;
var port = 8080;
var is_api_socket = false;

const el = document.createElement('div');
el.id = 'tv-watcher-ext';
document.body.appendChild(el);

const audio = document.createElement('audio');
audio.src = chrome.extension.getURL('alert.mp3');
audio.load();

const icon = chrome.extension.getURL('images/logo.jpg');
const App = new Vue({
	el: '#tv-watcher-ext',
	data: {
		isOpen: false,
		isWatch: false,
		isNotyOn: false,
		title: '',
		lastStatus: null,
		lastNum: null
	},
	template: tpl,
	mounted(){
		chrome.runtime.onMessage.addListener(() => this.isOpen = !this.isOpen);
		if(Notification.permission === 'granted'){
			this.isNotyOn = true;
		}
	},
	methods: {
		globalClick() {
			!this.isNotyOn && this.askNoty();

			if(this.isWatch){
				this.stopWatch();
			}  else {
				this.startWatch();
			}
			
			this.isWatch = !this.isWatch;
		},

		askNoty() {
			Notification.requestPermission().then(res => {
				if(res === 'granted'){
					this.isNotyOn = true;
				}
			}).catch(console.log('Error get assets'));
		},
		startWatch() {
			this.timer = setInterval(() => this.watchIterat(), 2000);
			this.lastStatus = null;
			this.lastNum = null;
			connect_api();
		},
		stopWatch(){
			clearInterval(this.timer);
		},
		watchIterat(){
			const table = document.querySelector('.backtesting-content-wrapper');
			if (!table) {
				return alert('TV Watcher: таблица не найдена!');
			}

			const containerScrollable = document.querySelector('.report-content.trades');
			containerScrollable.scrollTop = containerScrollable.scrollHeight;
			setTimeout(() => {

				this.title = document.title.split(' ')[0];
				const tbodys = Array.from(containerScrollable.getElementsByTagName('tbody'));
				const [row1, row2] = tbodys.sort((a, b) => +b.querySelectorAll('td')[0].textContent - +a.querySelectorAll('td')[0].textContent)[0].getElementsByTagName('tr');

				const [numEl, eventEl, typeEl, _, priceEl, __, profitEl] = row1.querySelectorAll('td');
				
				const lastNum = numEl.textContent;
				const type = typeEl.textContent;
				
				const [eventEl2, statusEl] = row2.querySelectorAll('td');
				const lastStatus = statusEl.textContent;

				if (!this.lastStatus) { // первый итерат на странице
					this.lastStatus = lastStatus;
					this.lastNum = lastNum;
					return;
				}

				if(lastNum < this.lastNum){ // скролл
					return;	
				}
				
				let msg;
				let sign = '+';
				if (profitEl.querySelector('.trade-profit .additional_percent_value .neg')){
					sign = '-';
				}

				if (this.lastNum && lastNum > this.lastNum) { // новая строка и это buy или sell
					msg = type.toUpperCase() + ' цена: ' + priceEl.textContent;
					msg += ' trade-contracts ' +  profitEl.querySelector('.trade-contracts').textContent;
					msg += ' trade-num ' +  profitEl.querySelector('.trade-num').textContent;
					msg += ' lastNum ' +  this.lastNum;
					msg += ' lastStatus ' +  this.lastStatus;
				} else if(lastStatus !== this.lastStatus){ // закрытие позиции
				//trade-contracts
					msg = lastStatus + ' профит: ' + sign + '' + profitEl.querySelector('.additional_percent_value').textContent;
					msg += ' trade-contracts ' +  profitEl.querySelector('.trade-contracts').textContent;
					msg += ' trade-num ' +  profitEl.querySelector('.trade-num').textContent;
					msg += ' lastNum ' +  this.lastNum;
					msg += ' lastStatus ' +  this.lastStatus;
				}

				if (msg) {
					console.log('this.title ' + this.title);
					console.log('type.toUpperCase() ' + type.toUpperCase());
					console.log('this.lastStatus ' + this.lastStatus);
					console.log('this.lastNum ' + this.lastNum);
					this.lastStatus = lastStatus;
					this.lastNum = lastNum;
					new Notification(this.title, {
						icon,
						body: msg
					});
					audio.play();
					if(is_api_socket) {
						api_socket.send('{"symbol":"'+ this.title +'","type":}');
					}
				}
			}, 1000);
		}
	}
});

function connect_api() {
	if(is_api_socket) return;
	api_socket = new WebSocket("ws://localhost:" + port + "/mt4-api"), 
	api_socket.onopen = function() {
		is_api_socket = true;
		console.log("Соединение с сервером MT4 установлено.");
	}, api_socket.onclose = function(t) {
		is_api_socket = false;
		/* пробуем переподключиться*/
		connect_api(); 
		t.wasClean ? console.log("Соединение с сервером MT4 закрыто чисто") : console.log("Обрыв соединения с сервером MT4"), 
		console.log("Код: " + t.code + " причина: " + t.reason);
	}, api_socket.onmessage = function(t) {
		console.log("Получены данные от сервера MT4: " + t.data); 
		var api_message = JSON.parse(t.data);
	}, api_socket.onerror = function(t) {
		console.log("Ошибка (сервер MT4) " + t.message);
		is_api_socket = false;
	}
}
