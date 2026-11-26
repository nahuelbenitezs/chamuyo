// Palabras secretas del Impostor, por categoría. El impostor solo ve la categoría.
import { Secreta } from '../juego/motor';

function armar(categorias: Record<string, string>): Secreta[] {
  return Object.entries(categorias).flatMap(([categoria, lista]) =>
    lista
      .split(',')
      .map((palabra) => palabra.trim())
      .filter(Boolean)
      .map((palabra) => ({ categoria, palabra })),
  );
}

export const secretasEs = armar({
  Comidas:
    'Empanada, Asado, Milanesa, Pizza, Sushi, Choripán, Dulce de leche, Alfajor, Helado, Hamburguesa, Tacos, Arepa, Fideos, Ñoquis, Panqueques, Medialunas, Chivito, Torta frita, Churros, Papas fritas, Ensalada, Sopa, Guacamole, Pochoclo, Chocolate, Flan, Lasaña, Pancho, Locro, Provoleta',
  Lugares:
    'Playa, Hospital, Escuela, Aeropuerto, Cine, Supermercado, Gimnasio, Cancha de fútbol, Biblioteca, Zoológico, Boliche, Peluquería, Cárcel, Museo, Estación de servicio, Parque de diversiones, Banco, Farmacia, Camping, Casamiento, Hotel, Restaurante, Ascensor, Submarino, Estación espacial, Shopping, Plaza, Velorio, Crucero, Circo',
  Animales:
    'Carpincho, Perro, Gato, Pingüino, Jirafa, Elefante, León, Tiburón, Mosquito, Vaca, Caballo, Mono, Delfín, Pulpo, Cocodrilo, Oveja, Gallina, Tortuga, Murciélago, Canguro, Llama, Oso panda, Serpiente, Hormiga, Búho, Camello, Ballena, Abeja, Hornero, Yaguareté',
  Objetos:
    'Celular, Paraguas, Cepillo de dientes, Control remoto, Termo, Bombilla, Heladera, Microondas, Almohada, Espejo, Llaves, Anteojos, Mochila, Bicicleta, Guitarra, Reloj, Vela, Sartén, Inodoro, Lavarropas, Auriculares, Ventilador, Tijera, Escoba, Silla, Pelota, Linterna, Mate, Parrilla, Colchón',
  Profesiones:
    'Médico, Bombero, Policía, Maestra, Cocinero, Astronauta, Peluquero, Dentista, Piloto, Payaso, Plomero, Abogado, Periodista, Veterinario, Mago, Albañil, Cantante, Programador, Mozo, Taxista, Detective, Árbitro, Electricista, Panadero, Influencer',
  'Deportes y juegos':
    'Fútbol, Tenis, Básquet, Natación, Ajedrez, Truco, Boxeo, Golf, Rugby, Vóley, Ciclismo, Surf, Ping pong, Esquí, Patinaje, Pádel, Karate, Bowling, Escondida, Dominó, Metegol, Carrera de embolsados, Bolos, Paintball',
  Futbolistas:
    'Messi, Cristiano Ronaldo, Neymar, Mbappé, Haaland, Luis Suárez, Maradona, Pelé, Di María, Dibu Martínez, Cavani, Forlán, Fede Valverde, Darwin Núñez, Julián Álvarez, Ronaldinho, Zidane, Lewandowski, Modric, Vinícius, Lamine Yamal, Riquelme, Batistuta, Falcao, James Rodríguez',
  Personajes:
    'Batman, Superman, Spider-Man, Harry Potter, Pikachu, Mario Bros, Shrek, Homero Simpson, Bob Esponja, Mickey Mouse, Darth Vader, Barbie, Goku, Papá Noel, Drácula, Cenicienta, El Chavo, Mafalda, Sherlock Holmes, Pinocho, Hulk, Elsa, Buzz Lightyear, Gandalf, El Zorro',
  'En una fiesta':
    'Torta de cumpleaños, Globos, Piñata, Karaoke, Brindis, Parlante, Hielo, Guitarreada, DJ, Velitas, Disfraz, Picada, Vaso de plástico, Confeti, Pista de baile, Regalo, Gaseosa, Fotógrafo, Sorpresa, Vecino enojado, Lluvia de papelitos, Mesa dulce',
});

export const secretasEn = armar({
  Food: 'Empanada, Barbecue, Pizza, Sushi, Hot dog, Ice cream, Hamburger, Tacos, Pancakes, Croissant, Popcorn, Chocolate, French fries, Spaghetti, Soup, Salad, Guacamole, Donut, Burrito, Cupcake, Sandwich, Cereal, Lasagna, Churros, Cheesecake, Waffles, Fried chicken, Nachos, Omelette, Pie',
  Places:
    'Beach, Hospital, School, Airport, Cinema, Supermarket, Gym, Football stadium, Library, Zoo, Nightclub, Barbershop, Prison, Museum, Gas station, Theme park, Bank, Pharmacy, Campsite, Wedding, Hotel, Restaurant, Elevator, Submarine, Space station, Shopping mall, Park, Cruise ship, Circus, Haunted house',
  Animals:
    'Capybara, Dog, Cat, Penguin, Giraffe, Elephant, Lion, Shark, Mosquito, Cow, Horse, Monkey, Dolphin, Octopus, Crocodile, Sheep, Chicken, Turtle, Bat, Kangaroo, Llama, Panda, Snake, Ant, Owl, Camel, Whale, Bee, Sloth, Jaguar',
  Objects:
    'Phone, Umbrella, Toothbrush, Remote control, Thermos, Fridge, Microwave, Pillow, Mirror, Keys, Glasses, Backpack, Bicycle, Guitar, Clock, Candle, Frying pan, Toilet, Washing machine, Headphones, Fan, Scissors, Broom, Chair, Ball, Flashlight, Mattress, Toaster, Camera, Sunglasses',
  Jobs: 'Doctor, Firefighter, Police officer, Teacher, Chef, Astronaut, Hairdresser, Dentist, Pilot, Clown, Plumber, Lawyer, Journalist, Vet, Magician, Builder, Singer, Programmer, Waiter, Taxi driver, Detective, Referee, Electrician, Baker, Influencer',
  'Sports and games':
    'Football, Tennis, Basketball, Swimming, Chess, Boxing, Golf, Rugby, Volleyball, Cycling, Surfing, Ping pong, Skiing, Skating, Padel, Karate, Bowling, Hide and seek, Dominoes, Table football, Sack race, Paintball, Baseball, Darts',
  Footballers:
    'Messi, Cristiano Ronaldo, Neymar, Mbappé, Haaland, Luis Suárez, Maradona, Pelé, Di María, Dibu Martínez, Cavani, Forlán, Fede Valverde, Darwin Núñez, Julián Álvarez, Ronaldinho, Zidane, Lewandowski, Modric, Vinícius, Lamine Yamal, Beckham, Salah, Kane, Bellingham',
  Characters:
    'Batman, Superman, Spider-Man, Harry Potter, Pikachu, Mario, Shrek, Homer Simpson, SpongeBob, Mickey Mouse, Darth Vader, Barbie, Goku, Santa Claus, Dracula, Cinderella, Sherlock Holmes, Pinocchio, Hulk, Elsa, Buzz Lightyear, Gandalf, Zorro, Yoda, Wonder Woman',
  'At a party':
    'Birthday cake, Balloons, Piñata, Karaoke, Toast, Speaker, Ice, DJ, Candles, Costume, Snacks, Plastic cup, Confetti, Dance floor, Present, Soda, Photographer, Surprise, Angry neighbor, Party hat, Dessert table, Playlist',
});
