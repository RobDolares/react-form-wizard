import { useEffect, useState } from 'react'
import YAML from 'yaml'

const color = {
    background: 'rgb(21, 21, 21)',
    divider: 'rgb(212, 212, 212)',
    colon: 'rgb(212, 212, 212)',
    variable: 'rgb(115, 188, 247)',
    value: 'rgb(240, 171, 0)',
}

export function YamlHighlighter(props: { yaml: string; setData?: (data: any) => void }) {
    const [hasFocus, setHasFocus] = useState(false)
    const [yaml, setYaml] = useState(props.yaml)
    useEffect(() => {
        if (!hasFocus) {
            setYaml(props.yaml)
        }
    }, [props.yaml, hasFocus])
    return (
        <pre
            style={{ position: 'relative', height: '100%', width: '100%', padding: 24, backgroundColor: color.background }}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
        >
            <small>
                {yaml.split('\n').map((line, index) => {
                    if (line === '---') {
                        return (
                            <div key={index} style={{ color: color.divider }}>
                                {line}
                            </div>
                        )
                    }
                    const parts = line.split(':')
                    if (parts[0] === '') return <div key={index}>&nbsp;</div>
                    if (parts.length === 1) {
                        return (
                            <div key={index} style={{ color: color.variable }}>
                                {parts[0]}
                            </div>
                        )
                    }
                    return (
                        <div key={index} style={{ color: color.variable }}>
                            {parts[0]}
                            <span style={{ color: color.colon }}>:</span>
                            <span style={{ color: color.value }}>{parts[1]}</span>
                        </div>
                    )
                })}
                <textarea
                    id="yaml-editor"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: '100%',
                        opacity: 0.5,
                        margin: '0 -34 -24 0',
                        padding: 24,
                        border: 0,
                        backgroundColor: 'transparent',
                        whiteSpace: 'pre',
                        overflowWrap: 'normal',
                        overflowX: 'hidden',
                        color: 'transparent',
                        caretColor: 'white',
                        resize: 'none',
                    }}
                    value={yaml}
                    onChange={(e) => {
                        try {
                            if (!e.target.value) {
                                setYaml('')
                                props.setData?.({})
                            } else {
                                setYaml(e.target.value)
                                const data = YAML.parse(e.target.value)
                                props.setData?.(data)
                            }
                        } catch {
                            // DO NOTHING
                        }
                    }}
                />
            </small>
        </pre>
    )
}