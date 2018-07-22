import fetch from 'unfetch'
import axios from 'axios'
import moment from 'moment'
import { init } from '@livechat/livechat-visitor-sdk'
import { call, takeEvery, fork, select, put, take, all } from 'redux-saga/effects'
import { REHYDRATE, PURGE } from 'redux-persist'
import { getChatService } from '../reducers/app'
import {
	newMessage,
	newUser,
	ownDataReceived,
	chatEnded,
	chatStarted,
	changeChatService,
	sendMessage,
	chatRated,
} from '../actions/chatActions'
import * as actionTypes from '../constants/chatActionTypes'
import { getEvents } from '../reducers/events'
import { getUsers, getOwnId } from '../reducers/users'

const botEngineClientToken = process.env.REACT_APP_BOTENGINE_CLIENT_TOKEN
const sessionId = String(Math.random())

const sendQueryToBotEngine = query =>
	fetch('https://api.botengine.ai/query', {
		headers: {
			authorization: `Bearer ${ botEngineClientToken }`,
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: JSON.stringify({
			sessionId: sessionId,
			query: query,
			storyId: '1520',
		}),
	}).then(response => response.json())

 async function getDialogflowToken() {
	try {
		const token = await axios.get('https://axlewebtech.com/scripts/googleauth/')
		return token.data
	} catch (error) {
		console.error(error)
	}
}

const sendQueryToDialogflow = (query, dialogflowClientToken) =>
	fetch('https://dialogflow.googleapis.com/v2/projects/speak2connect-ed605/agent/sessions/50db51b6-14a9-5760-a73a-3d1be26f29a5:detectIntent', {
		headers: {
			authorization: `Bearer ${dialogflowClientToken}`,
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: JSON.stringify({
			queryInput: {
				text: {
					text: query,
					languageCode: "en"
				}
			}
		}),
	}).then(response => response.json())
	

function* transferToLiveChat() {
	const events = yield select(getEvents)
	const users = yield select(getUsers)
	const ownId = yield select(getOwnId)
	const parsedEvents = events
		.map(event => {
			const userName = (users[event.authorId] && users[event.authorId].name) || users[ownId].name
			const text = event.text || event.title
			return `${ userName }: ${ text }`
		})
		.join(' \n')
	yield put(
		changeChatService({
			chatService: 'LiveChat',
		}),
	)
	yield put(
		sendMessage({
			customId: 'VISITOR_CHAT_HISTORY',
			text: parsedEvents,
		}),
	)
}

function* handleSendMessage(sdk, { payload }) {
	const chatService = yield select(getChatService)
	console.log(chatService)
	if (chatService === 'LiveChat') {
		try {
			yield call(sdk.sendMessage, {
				customId: payload.customId,
				text: payload.text,
			})
		} catch (error) {
			console.log('> ERROR', error)
		}
		return
	}
	if (chatService === 'botEngine') {
		try {
			const botEngineResponse = yield call(sendQueryToBotEngine, payload.text)
			if (
				!botEngineResponse.result ||
				!botEngineResponse.result.fulfillment ||
				!botEngineResponse.result.fulfillment.length
			) {
				yield call(transferToLiveChat)
				return
			}
			const messagesToAdd = botEngineResponse.result.fulfillment.map(fulfillmentItem => {
				const message = {
					id: Math.random(),
					authorId: 'bot',
				}
				if (fulfillmentItem.message) {
					message.text = fulfillmentItem.message
				}
				if (fulfillmentItem.buttons) {
					message.buttons = fulfillmentItem.buttons
				}
				if (fulfillmentItem.title) {
					message.title = fulfillmentItem.title
				}
				if (fulfillmentItem.imageUrl) {
					message.imageUrl = fulfillmentItem.imageUrl
				}
				if (fulfillmentItem.replies) {
					message.buttons = fulfillmentItem.replies.map(reply => ({
						title: reply,
					}))
				}
				if (botEngineResponse.timestamp) {
					message.timestamp = botEngineResponse.timestamp
				}
				return newMessage(message)
			})
			yield all(messagesToAdd.map(action => put(action)))
			if (botEngineResponse.result.interaction.action === 'livechat.transfer') {
				yield call(transferToLiveChat)
			}
		} catch (error) {
			console.log('>> BOTENGINEERROR', error)
			yield call(transferToLiveChat)
		}
	}
	if (chatService === 'dialogflow') {
		try {
			const dialogflowClientToken = yield call(getDialogflowToken)
			const dilogflowResponse = yield call(sendQueryToDialogflow, payload.text, dialogflowClientToken)
			console.log(dilogflowResponse)
			console.log(payload.text)
			
			const messagesToAdd = dilogflowResponse.queryResult.fulfillmentMessages.map(fulfillmentItem => {
				const message = {
					id: Math.random(),
					authorId: 'bot',
					timestamp: moment().format(),
				}
				if (fulfillmentItem.text) {
					message.text = fulfillmentItem.text.text[0]
				}
				if (fulfillmentItem.quickReplies) {
					message.text = fulfillmentItem.quickReplies.title
					if (fulfillmentItem.quickReplies.quickReplies) {
						message.buttons = fulfillmentItem.quickReplies.quickReplies.map(reply => ({
							type: "postback",
							title: reply,
							value: reply
						}))
					}
				}
				return newMessage(message)
			})
			yield all(messagesToAdd.map(action => put(action)))
		} catch (error) {
			console.log('>> DIALOGFLOW', error)
		}
	}	
}

function* handleRateGood(sdk) {
	yield call(sdk.rateChat, {
		rate: 'good',
	})
}

function* handleRateBad(sdk) {
	yield call(sdk.rateChat, {
		rate: 'bad',
	})
}

function* handleCallbacks(store) {
	const sdk = init({
		license: process.env.REACT_APP_LIVECHAT_LICENSE,
	})
	sdk.on('new_message', data => {
		store.dispatch(newMessage(data))
	})
	sdk.on('agent_changed', data => {
		store.dispatch(newUser(data))
	})
	sdk.on('visitor_data', data => {
		store.dispatch(ownDataReceived(data))
	})
	sdk.on('chat_ended', () => {
		console.log('>chat_ended')
		store.dispatch(chatEnded())
	})
	sdk.on('chat_started', data => {
		store.dispatch(chatStarted(data))
	})
	// sdk.on('status_changed', data => {
	// 	console.log('> status_changed', data)
	// })
	sdk.on('visitor_queued', data => {
		console.log('> visitor_queued', data)
	})
	sdk.on('typing_indicator', data => {
		console.log('> typing_indicator', data)
	})
	// sdk.on('connection_status_changed', data => {
	// 	console.log('> connection_status_changed', data)
	// })
	sdk.on('chat_rated', data => {
		store.dispatch(chatRated({
			rate: data.rate,
		}))
	})

	yield takeEvery(actionTypes.SEND_MESSAGE, handleSendMessage, sdk)
	yield takeEvery(actionTypes.RATE_GOOD, handleRateGood, sdk)
	yield takeEvery(actionTypes.RATE_BAD, handleRateBad, sdk)
}

const getPersistSelector = state => state._persist && state._persist.rehydrated

export default function*(store) {
	// if (!getPersistSelector) {
	// 	yield take(REHYDRATE)
	// }
	yield fork(handleCallbacks, store)
}