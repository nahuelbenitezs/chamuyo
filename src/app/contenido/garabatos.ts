// Cosas para dibujar en Garabatos: dibujables con el dedo y con lugar para títulos chamuyados.
function lista(texto: string): string[] {
  return texto
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

export const dibujosEs = lista(`
  Un carpincho en la playa
  Un mate con anteojos de sol
  Una vaca en el espacio
  Un perro manejando un auto
  Una pizza triste
  Un fantasma tomando mate
  Un pulpo tocando la batería
  Un dinosaurio en el supermercado
  Un abuelo bailando cumbia
  Un robot cocinando un asado
  Una nube enojada
  Un gato astronauta
  Una empanada en la cama
  Un tiburón en una pileta de lona
  Un caracol con turbo
  Una banana haciendo surf
  Un pingüino en el desierto
  Una jirafa en un ascensor
  Un helado derritiéndose al sol
  Un vampiro en el dentista
  Una gallina con zapatillas
  Un elefante en monopatín
  Un sol con bufanda
  Un oso panda en el gimnasio
  Una tortuga ganando una carrera
  Un choripán con capa de superhéroe
  Un mosquito gigante
  Un perro paseando a su dueño
  Un árbol con auriculares
  Un zombi haciendo yoga
  Un pez en una pecera dentro de otra pecera
  Una llama en la cima de una montaña
  Un alfajor enamorado
  Un cocodrilo con cepillo de dientes
  Una torta de cumpleaños gigante
  Un mago sacando un conejo del sombrero
  Un payaso triste
  Un camello con valijas
  Una abeja trabajando en una oficina
  Un hornero construyendo una casa
  Un tren con alas
  Una sirena en la bañera
  Un rey sin corona
  Un búho leyendo un libro
  Un extraterrestre comiendo pochoclo
  Un futbolista atajando un penal
  Un paraguas en un día de sol
  Un volcán estornudando
  Una medialuna con cara de sueño
  Un caballo en patines
  Un gato persiguiendo un láser
  Un pirata con un loro
  Una ballena en una bañadera
  Un murciélago colgado de una lámpara
  Una abuela haciendo skate
  Un dragón asando malvaviscos
  Un muñeco de nieve en verano
  Un mono comiendo una banana gigante
  Un taxi en la luna
  Una oveja contando personas
  Un cohete despegando de una terraza
  Un unicornio en el tránsito
  Un esqueleto tomando sol
  Un canguro con la cartera llena
  Un lobo disfrazado de oveja
  Una hormiga levantando una pesa
  Un pájaro sin alas en un avión
  Una sandía con anteojos
  Un sapo con corona
  Un chef persiguiendo un pollo
  Un perro con un hueso enorme
  Una bicicleta de una sola rueda
  Un bombero rescatando un gato
  Una araña tejiendo una bufanda
  Un tero gritando
  Un yaguareté en la selva
  Una guitarra en llamas
  Un fantasma con miedo
  Un reloj derritiéndose
  Una papa en el sillón
  Un hámster en una rueda gigante
  Una casa en un árbol
  Un caballero sin caballo
  Una mariposa con anteojos
  Un ratón asustando a un elefante
  Una princesa jugando al fútbol
  Un pato con paraguas
  Un león en la peluquería
  Una heladera llena de helado
  Un castillo de arena
  Un huevo frito sonriendo
  Un perezoso corriendo
  Una calavera con sombrero
  Un barco en una botella
  Un tomate avergonzado
  Un detective con lupa
  Un globo escapándose
  Una piñata rota
  Un DJ en una fiesta
  Un vecino enojado con escoba
  Un camión de helados
  Un faro en la tormenta
  Un cactus abrazando a alguien
  Una ola gigante
  Una cama voladora
  Un trofeo de oro
  Un ojo con pestañas larguísimas
  Una abuela con un celular
`);

export const dibujosEn = lista(`
  A capybara at the beach
  A cup of mate wearing sunglasses
  A cow in outer space
  A dog driving a car
  A sad pizza
  A ghost drinking tea
  An octopus playing the drums
  A dinosaur at the supermarket
  Grandpa dancing
  A robot grilling a barbecue
  An angry cloud
  An astronaut cat
  An empanada in bed
  A shark in a kiddie pool
  A turbo-powered snail
  A banana surfing
  A penguin in the desert
  A giraffe in an elevator
  An ice cream melting in the sun
  A vampire at the dentist
  A chicken wearing sneakers
  An elephant on a scooter
  The sun wearing a scarf
  A panda at the gym
  A turtle winning a race
  A hot dog with a superhero cape
  A giant mosquito
  A dog walking its owner
  A tree wearing headphones
  A zombie doing yoga
  A fish tank inside a fish tank
  A llama on top of a mountain
  A cookie in love
  A crocodile brushing its teeth
  A giant birthday cake
  A magician pulling a rabbit out of a hat
  A sad clown
  A camel with suitcases
  A bee working in an office
  A bird building a house
  A train with wings
  A mermaid in a bathtub
  A king without a crown
  An owl reading a book
  An alien eating popcorn
  A goalkeeper saving a penalty
  An umbrella on a sunny day
  A volcano sneezing
  A sleepy croissant
  A horse on roller skates
  A cat chasing a laser
  A pirate with a parrot
  A whale in a bathtub
  A bat hanging from a lamp
  Grandma skateboarding
  A dragon roasting marshmallows
  A snowman in summer
  A monkey eating a giant banana
  A taxi on the moon
  A sheep counting people
  A rocket taking off from a rooftop
  A unicorn stuck in traffic
  A skeleton sunbathing
  A kangaroo with a full pouch
  A wolf dressed as a sheep
  An ant lifting weights
  A bird flying on a plane
  A watermelon wearing glasses
  A frog wearing a crown
  A chef chasing a chicken
  A dog with a huge bone
  A unicycle
  A firefighter rescuing a cat
  A spider knitting a scarf
  A jaguar in the jungle
  A guitar on fire
  A scared ghost
  A melting clock
  A couch potato
  A hamster in a giant wheel
  A treehouse
  A knight without a horse
  A butterfly wearing glasses
  A mouse scaring an elephant
  A princess playing football
  A duck with an umbrella
  A lion at the hair salon
  A fridge full of ice cream
  A sandcastle
  A smiling fried egg
  A sloth running
  A skull wearing a hat
  A ship in a bottle
  An embarrassed tomato
  A detective with a magnifying glass
  A balloon floating away
  A broken piñata
  A DJ at a party
  An angry neighbor with a broom
  An ice cream truck
  A lighthouse in a storm
  A cactus giving a hug
  A giant wave
  A flying bed
  A golden trophy
  An eye with super long lashes
  Grandma with a smartphone
  A snail in a hurry
`);
