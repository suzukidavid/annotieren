import React from 'react'
import Route from 'react-route'

import AppBar from 'material-ui/lib/app-bar'
import IconButton from 'material-ui/lib/icon-button'
import ActionHome from 'material-ui/lib/svg-icons/action/home'
import Avatar from 'material-ui/lib/avatar'
import Card from 'material-ui/lib/card/card'
import CardHeader from 'material-ui/lib/card/card-header'
import CardText from 'material-ui/lib/card/card-text'
import CardActions from 'material-ui/lib/card/card-actions'
import RaisedButton from 'material-ui/lib/raised-button'

import PaperAvatar from './paper_avatar'

export default class PaperView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      paper: {
        id: this.props.params.id
      }
    }
  }

  componentDidMount() {
    fetch(`/api/oparl/paper/${encodeURIComponent(this.state.paper.id)}`)
      .then(res => res.json())
      .then(paper => {
        this.setState({ paper: paper })
      })
  }

  render() {
    let paper = this.state.paper
    let fileCards = []
    function pushFileCards(file, role) {
      if (Array.isArray(file)) {
        file.forEach(f => pushFileCards(f, role))
      } else if (typeof file == 'string') {
        fileCards.push(<FileCard key={file} file={{ id: file }} role={role} paper={paper}/>)
      }
    }
    pushFileCards(paper.mainFile, "Hauptdatei")
    pushFileCards(paper.auxiliaryFile)

    return (
      <div>
        <AppBar
            title={
              <div>
                <PaperAvatar paper={paper} size={32}/>

                {paper.name}
              </div>
            }
            iconElementLeft={
              <IconButton title="Zurück zur Suche"
                  onClick={ev => Route.go("/")}>
                <ActionHome/>
              </IconButton>
            }
            iconElementRight={
              <p style={{ margin: "16px 0 0", fontSize: "80%", color: 'white' }}>
                {iso8601ToDate(paper.publishedDate)}
              </p>
            }
            />

        {fileCards}
      </div>
    )
  }
}

class FileCard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
    }
  }

  componentDidMount() {
    if (!this.props.file || !this.props.file.name) {
      fetch(`/api/oparl/file/${encodeURIComponent(this.props.file.id)}`)
        .then(res => res.json())
        .then(result => {
          this.setState({ file: result })
        })
    }
  }

  render() {
    let file = this.state.file || this.props.file

    return (
      <Card style={{ margin: "1em auto", maxWidth: "60em" }}
          >
        <CardHeader
          title={file.name}
          titleStyle={{ textAlign: 'center', fontWeight: 'bold' }}
          subtitle={this.props.role}
          subtitleStyle={{ textAlign: 'center' }}
          actAsExpander={true}
          showExpandableButton={true}
          />
        <CardText expandable={true}>
          <FileDetails file={file} paper={this.props.paper}/>
        </CardText>
        <CardActions expandable={true} style={{ textAlign: 'right' }}>
          <RaisedButton label="Text Annotieren" primary={true}
              style={{ verticalAlign: 'top' }}
              onClick={ev => Route.go(`/file/${encodeURIComponent(file.id)}`)}
              />
          <RaisedButton label="Original-PDF" secondary={true}
              linkButton={true} href={file.downloadUrl}
              />
        </CardActions>
      </Card>
    )
  }
}

// TODO: no paper filter for files that belong to this paper/agendaItem only
class FileDetails extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      annotations: []
    }
  }

  componentDidMount() {
    return fetch(`/api/file/${this.props.file.id}/annotations`)
      .then(res => res.json())
      .then(annotations =>
        this.setState({
          annotations: this._processAnnotations(annotations)
        })
      )
  }

  _processAnnotations(annotations) {
    console.log("_processAnnotations", annotations.sort((a, b) =>
      (a.begin !== b.begin) ?
      (a.begin - b.begin) :
      (a.end - b.end)
    ))
    let inPaperChapter = false
    return annotations.sort((a, b) =>
      (a.begin !== b.begin) ?
      (a.begin - b.begin) :
      (a.end - b.end)
    ).reduce((results, annotation) => {
      if (/^chapter\./.test(annotation.type)) {
        if (annotation.type === 'chapter.reference') {
          inPaperChapter = annotation.text === this.props.paper.reference
        }
      } else if (inPaperChapter) {
        results.push(annotation)
      }
      return results
    }, [])
  }

  render() {
    let file = this.state.file || this.props.file
    let annotations = this.state.annotations

    return (
      <article>
        {annotations.map(annotation => {
          if (annotation.type === 'record.speaker') {
            return (
              <p style={{ fontWeight: 'bold', backgroundColor: 'black', color: 'white' }} title="Sprecher">
                {annotation.text}
              </p>
            )
          } else if (annotation.type === 'record.transcript') {
            return (
              <p title="Niederschrift" style={{ fontStyle: 'italic' }}>
                {annotation.text}
              </p>
            )
          } else if (annotation.type === 'proposition') {
            return (
              <div>
                <h2 style={{ fontSize: "80%", fontWeight: 'bold', color: '#888' }}>
                  Beschlussvorschlag
                </h2>
                <p>
                  {annotation.text}
                </p>
              </div>
            )
          } else if (annotation.type === 'proposition.reason') {
            return (
              <div>
                <h2 style={{ fontSize: "80%", fontWeight: 'bold', color: '#888' }}>
                  Begründung
                </h2>
                <p>
                  {annotation.text}
                </p>
              </div>
            )
          } else {
            return ""
          }
        })}
      </article>
    )
  }
}

function iso8601ToDate(iso8601) {
  let m
  if (iso8601 && (m = iso8601.match(/(\d{4})-(\d\d)-(\d\d)/))) {
    return `${m[3]}.${m[2]}.${m[1]}`
  } else {
    return "?"
  }
}