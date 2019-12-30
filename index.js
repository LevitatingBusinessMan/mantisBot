const Discord = require("discord.js"),
Mantis = new Discord.Client({disableEveryone: false}),
https = require("https"),
fs = require("fs"),
dayjs = require("dayjs"),
path = require("path"),
config = require(path.join(__dirname, "/config/config.json"))

Mantis.login(config.token)
Mantis.on("ready", () => {
	console.log(`Logged in!`)

	//Direct call
	loop()

	//Main interval
	setInterval(loop, config.interval)

})

const cached = {}

const pagesDirPath = path.join(__dirname, "/pages")

//Create main pages dir
if (!fs.existsSync(pagesDirPath))
	fs.mkdirSync(pagesDirPath)

//Create all subdirs
config.urls.forEach(url => {
	const dir = path.join(pagesDirPath, config.urls.indexOf(url).toString())
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir)
	}
})

function loop() {

	config.urls.forEach(url => {
		https.get(`https://${url}`, (res) => {
			
			let response = ""
			res.on('data', data => {
				response += data
			})

			res.on("end", () => {
				
				//Fix for view and follower counter
				response = response.replace(/Views: \d*/, "Views: x").replace(/Followers: \d*/, "Views: x")

				//Running first time
				if (!cached[url]) {
					cached[url] = response
				}

				else if (cached[url] != response) {

					const timestamp = dayjs()
					let filename = timestamp.toISOString()

					if (response.includes("<!DOCTYPE html>"))
						filename += ".html"

					let filepath = path.join(pagesDirPath, config.urls.indexOf(url).toString(), filename)

					console.log(`[${timestamp.format("D-M HH-mm-ss")}] Change detected at ${url}`)
					fs.writeFileSync(filepath, `<!-- ${url} -->\r\n` + response, err => {
						if (err) console.log(err)
					})
	
					const DiscordMessage = `${config.everyone ? "@everyone\n" : ""}\`${url}\` has changed!`
	
					for (let channelID of config.channels) {
						const channel = Mantis.channels.get(channelID)
						if (!channel) {
							console.error(`Channel ${channel} not found!`)
						} else {
							channel.send(DiscordMessage, {
								files: [{
									attachment: filepath,
									name: filename
								}]
							}).catch(console.error)
						}
					}

				}

			})

		})
	})
}
