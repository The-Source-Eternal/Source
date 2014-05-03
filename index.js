var Engine = require('./lib/engine.js')
var setupPointerlock = require('./lib/setupPointerlock.js')
var ComponentClass = require('./lib/components.js').ComponentClass

var controls

var boxSize = 5
var allObjects = []
var currentHover
var gravityRay

var projector, raycaster


start()

function start() {

  engine = new Engine()

  setupControls()
  defineComponents()
  buildLevel()
  engine.start()

}

function setupControls() {

  // camera controls
  setupPointerlock( pointerLockUpdate )
  engine.on('mainLoop',function(){
    updatePlayerControls()
  })

  engine.on('hoverChanged',function(currentHover){
    var reticleElement = document.getElementById('reticle')
    reticleElement.classList.remove('activate')
    var activateFound = false

    if (!currentHover) return
    // check for activate method
    engine.compManager.componentsForObject(currentHover).map(function(comp) {
      if (comp.instance.activate) activateFound = true
    })

    if (activateFound) reticleElement.classList.add('activate')
  })

  window.addEventListener( 'click', onClick, false )

}

function buildLevel() {

  var geometry, material, mesh

  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 )
  engine.currentCamera = camera

  scene = engine.primaryScene
  scene.fog = new THREE.Fog( 0xffffff, 0, 750 )

  var light = new THREE.DirectionalLight( 0xffffff, 1.5 )
  light.position.set( 1, 1, 1 )
  scene.add( light )

  var light = new THREE.DirectionalLight( 0xffffff, 0.75 )
  light.position.set( -1, - 0.5, -1 )
  scene.add( light )

  //

  controls = new THREE.PointerLockControls( camera )
  scene.add( controls.getObject() )

  gravityRay = new THREE.Raycaster()
  gravityRay.ray.direction.set( 0, -1, 0 )

  // floor

  geometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 )
  geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) )

  for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {

    var vertex = geometry.vertices[ i ]
    vertex.x += Math.random() * 20 - 10
    vertex.y += Math.random() * 2
    vertex.z += Math.random() * 20 - 10

  }

  for ( var i = 0, l = geometry.faces.length; i < l; i ++ ) {

    var face = geometry.faces[ i ]
    face.vertexColors[ 0 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )
    face.vertexColors[ 1 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )
    face.vertexColors[ 2 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )

  }

  material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } )

  mesh = new THREE.Mesh( geometry, material )
  scene.add( mesh )

  // objects

  geometry = new THREE.BoxGeometry( boxSize, boxSize, boxSize )

  // randomly colorize faces
  for ( var i = 0, l = geometry.faces.length; i < l; i ++ ) {

    var face = geometry.faces[ i ]
    face.vertexColors[ 0 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )
    face.vertexColors[ 1 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )
    face.vertexColors[ 2 ] = new THREE.Color().setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )

  }

  // randomly create boxes
  for ( var i = 0; i < 500; i ++ ) {

    material = new THREE.MeshPhongMaterial( { specular: 0xffffff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors } )

    var mesh = new THREE.Mesh( geometry, material )
    mesh.position.x = Math.floor( Math.random() * 50 - boxSize/2 ) * boxSize
    mesh.position.y = Math.floor( Math.random() * 20 ) * boxSize + boxSize/2
    mesh.position.z = Math.floor( Math.random() * 50 - boxSize/2 ) * boxSize
    scene.add( mesh )

    material.color.setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 )

    // add components
    engine.compManager.instantiateComponent( hoverComponent, mesh )
    var spinner = engine.compManager.instantiateComponent( spinnerComponent, mesh )
    spinner.instance.updateDisabled = true

    allObjects.push( mesh )

  }

}

function defineComponents() {

  spinnerComponent = new ComponentClass({
    name: 'spinner',
    src: [
      '// spinner',
      'this.activate = '+function () {
        this.updateDisabled = !this.updateDisabled
      },
      'this.update = '+function () {
        target.rotateY(0.1)
      },
      ].join('\n')
  })

  engine.compManager.registerComponentClass( spinnerComponent )

  hoverComponent = new ComponentClass({
    name: 'hover',
    src: [
      '// hover',
      'var oldColor',
      'this.mouseEnter = '+function () {
        oldColor = target.material.color.getHex()
        target.material.color.setHex( 0xff0000 )
      },
      'this.mouseExit = '+function () {
        target.material.color.setHex( oldColor )
      },
      ].join('\n')
  })

  engine.compManager.registerComponentClass( hoverComponent )

}

function pointerLockUpdate(err, isLocked) {
  controls.enabled = isLocked
}

function drawLine(start, end) {
    
    console.log('drawing line...',start.toArray(), end.toArray())

    var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    })

    var geometry = new THREE.Geometry()
    geometry.vertices.push(start)
    geometry.vertices.push(end)

    var line = new THREE.Line(geometry, material)
    scene.add(line)

    return line
}

function onClick() {

  if (!engine.currentIntersects.length) return

  var target = engine.currentIntersects[0].object

  if (controls.enabled && target) {
    activateObject( target )
  }

}

function activateObject(target) {
  engine.compManager.componentsForObject(target).map(function(comp) {
    comp.run('activate')
  })
}

function updatePlayerControls() {

  // check floor

  controls.isOnObject( false )

  gravityRay.ray.origin.copy( controls.getObject().position )
  gravityRay.ray.origin.y -= 10

  var intersections = gravityRay.intersectObjects( allObjects )

  if ( intersections.length > 0 ) {

    var distance = intersections[ 0 ].distance

    if ( distance > 0 && distance < 10 ) {

      controls.isOnObject( true )

    }

  }

  controls.update()
}