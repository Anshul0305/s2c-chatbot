import React, { Component } from 'react'
import Maximized from './Maximized'
import Minimized from './Minimized'
import { ThemeProvider, FixedWrapper } from '@livechat/ui-kit'

const themes = {
    defaultTheme: {
        TitleBar: {
            css: {
                padding: '1em',
                background: 'red'
            },
        },
        FixedWrapperMaximized: {
            css: {
                boxShadow: '0 0 1em rgba(0, 0, 0, 0.1)',
            },
        },
    }
}


class App extends Component {
    state = {
        theme: 'defaultTheme'
    }

    render() {
        return (
            <ThemeProvider theme={themes[this.state.theme]}>
                <div style={{
                }}>
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
