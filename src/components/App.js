import React, { Component } from 'react'
import Maximized from './Maximized'
import Minimized from './Minimized'
import { ThemeProvider, FixedWrapper, darkTheme, elegantTheme, purpleTheme, defaultTheme } from '@livechat/ui-kit'

const themes = {
    defaultTheme: {
        FixedWrapperMaximized: {
            css: {
                boxShadow: '0 0 1em rgba(0, 0, 0, 0.1)',
            },
        },
    },
    purpleTheme: {
        ...purpleTheme,
        TextComposer: {
            ...purpleTheme.TextComposer,
            css: {
                ...purpleTheme.TextComposer.css,
                marginTop: '1em',
            },
        },
        OwnMessage: {
            ...purpleTheme.OwnMessage,
            secondaryTextColor: '#fff',
        },
    },
    elegantTheme: {
        ...elegantTheme,
        Message: {
            ...darkTheme.Message,
            secondaryTextColor: '#fff',
        },
        OwnMessage: {
            ...darkTheme.OwnMessage,
            secondaryTextColor: '#fff',
        },
    },
    darkTheme: {
        ...darkTheme,
        Message: {
            ...darkTheme.Message,
            css: {
                ...darkTheme.Message.css,
                color: '#fff',
            },
        },
        OwnMessage: {
            ...darkTheme.OwnMessage,
            secondaryTextColor: '#fff',
        },
        TitleBar: {
            ...darkTheme.TitleBar,
            css: {
                ...darkTheme.TitleBar.css,
                padding: '1em',
            },
        },
    },
}

const commonThemeButton = {
    fontSize: '16px',
    padding: '1em',
    borderRadius: '.6em',
    margin: '1em',
    cursor: 'pointer',
    outline: 'none',
    border: 0,
}

const themePurpleButton = {
    ...commonThemeButton,
    background: 'linear-gradient(to right, #6D5BBA, #8D58BF)',
    color: '#fff',  
}

const themeDarkButton = {
    ...commonThemeButton,
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',  
}

const themeDefaultButton = {
    ...commonThemeButton,
    background: '#427fe1',
    color: '#fff',  
}

const themeElegantButton = {
    ...commonThemeButton,
    background: '#000',
    color: '#D9A646',  
}


class App extends Component {
    state = {
        theme: 'purpleTheme'
    }
    
    handleThemeChange = ({ target }) => {
        console.log('target.name', target.name)
        this.setState({
            theme: target.name + 'Theme'    ,
        })
    }

    render() {
        return (
            <ThemeProvider theme={themes[this.state.theme]}>
                <div style={{
                }}>
                    <header style={{
                        backgroundColor: '#17212D',
                        color: '#fff',
                        padding: '1em',
                    }}>
                        <div style={{
                            maxWidth: '990px',
                            margin: '0 auto',
                        }}>
                            <h1 style={{
                                fontSize: '3em',
                                lineHeight: '1em',
                                fontWeight: '600',
                            }}>
                                Speak to Connect
                            </h1>
                            <h2 style={{
                                color: '#f6e273',
                                fontWeight: '400',
                            }}>Web based Chatbot</h2>
                        </div>
                    </header>
                    <div style={{
                        maxWidth: '990px',
                        margin: '3em auto',
                    }}>
                        <h3>Change components theme:</h3>
                        <button id="theme-default" name="default" style={themeDefaultButton} onClick={this.handleThemeChange.bind(this)}>
                            default
                        </button>
                        <button id="theme-purple" name="purple" style={themePurpleButton} onClick={this.handleThemeChange.bind(this)}>
                            purple
                        </button>
                        <button id="theme-dark" name="dark" style={themeDarkButton} onClick={this.handleThemeChange.bind(this)}>
                            dark
                        </button>
                        <button id="theme-elegant" name="elegant" style={themeElegantButton} onClick={this.handleThemeChange.bind(this)}>
                            elegant
                        </button>
                    </div>
                    <FixedWrapper.Root maximizedOnInit>
                        <FixedWrapper.Maximized>
                            <Maximized {...this.props} />
                        </FixedWrapper.Maximized>
                        <FixedWrapper.Minimized>
                            <Minimized {...this.props} />
                        </FixedWrapper.Minimized>
                    </FixedWrapper.Root>
                </div>
			</ThemeProvider>
        )
    }
}

export default App
