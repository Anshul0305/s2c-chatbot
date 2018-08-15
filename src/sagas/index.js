import fetch from 'unfetch'
import axios from 'axios'
import moment from 'moment'
import { call, takeEvery, fork, select, put, all } from 'redux-saga/effects'
import { getChatService } from '../reducers/app'
import {
	newMessage,
	newCard,
} from '../actions/chatActions'
import * as actionTypes from '../constants/chatActionTypes'
const store = require('store')

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
			storyId: process.env.REACT_APP_BOTENGINE_STORY_ID,
		}),
	}).then(response => response.json())

 async function getDialogflowToken() {
	try {
		if((store.get('auth') == null) || (moment().unix() - store.get('auth').created)>3600){
			const googleAuthUrl = 'https://axlewebtech.com/scripts/googleauth/?apikey=1FfmbHfnpaZjKFvyi1okTjJJusN455paPH'
			const authToken = await axios.get(googleAuthUrl)
			store.set('auth', { token: authToken.data.access_token, created: authToken.data.created })
		}
		return store.get('auth').token
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

function* handleSendMessage(sdk, { payload }) {
	const chatService = yield select(getChatService)
	if (chatService === 'botEngine') {
		try {
			const botEngineResponse = yield call(sendQueryToBotEngine, payload.text)
			if (
				!botEngineResponse.result ||
				!botEngineResponse.result.fulfillment ||
				!botEngineResponse.result.fulfillment.length
			) {
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
		} catch (error) {
			console.log('>> BOTENGINEERROR', error)
		}
	}
	if (chatService === 'dialogflow') {
		try {
			const dialogflowClientToken = yield call(getDialogflowToken)
			const dialogflowResponse = yield call(sendQueryToDialogflow, payload.text, dialogflowClientToken)
			
			const messagesToAdd = dialogflowResponse.queryResult.fulfillmentMessages.map(fulfillmentItem => {
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
			if(dialogflowResponse.queryResult.webhookPayload){
				const cardsToAdd = dialogflowResponse.queryResult.webhookPayload.facebook.attachment.payload.elements.map(element => {
					const card = {
						id: Math.random(),
						authorId: 'bot',
						timestamp: moment().format(),
					}
					card.cardTitle = element.title
					card.cardImageUrl = element.image_url
					card.cardButtons = element.buttons
					return newCard(card)
				})
				yield all(cardsToAdd.map(card => put(card)))
			}
		} catch (error) {
			console.log('>> DIALOGFLOW', error)
		}
	}	
}

function* handleCallbacks(store) {
	yield takeEvery(actionTypes.SEND_MESSAGE, handleSendMessage, null)
}

export default function*(store) {
	yield fork(handleCallbacks, store)
}