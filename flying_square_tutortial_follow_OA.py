# Import the modules needed
import pygame
from pygame.locals import(
    K_ESCAPE,
    KEYDOWN,
    QUIT,
)
from gdx import gdx
gdx = gdx.gdx()
import random as rand
from vpython import *
import time

# Define a player object by extending pygame.sprite.Sprite
# The surface drawn on the screen is now an attribute of 'player'
class Player(pygame.sprite.Sprite):
    def __init__(self): #this is ran by default when the class is called
        super().__init__()
        self.surf = pygame.Surface((50, 50)) #creates size of surface
        self.surf.fill((255, 255, 0)) #fills in color yellow
        self.rect = self.surf.get_rect() #makes a rect in the shape of the surf
    def update(self, data): #controls movement of sprite
        self.rect.center = (sprite_x, 600-data*12)
        if self.rect.top <= 0: #if top of rect is < 0 (above top of screen)
            self.rect.top = 0 #teleport back to 0
        if self.rect.bottom >= py_height: #if bottom of rect is > py_height (below bottom of screen)
            self.rect.bottom = py_height #teleport back to bottom of screen

class Wall(pygame.sprite.Sprite): #this class is used for both top and bottom walls
    def __init__(self, wall_y, wall_speed):
        super().__init__()
        self.surf = pygame.Surface((100, 600)) #dimensions of walls are 100x600
        self.surf.fill((0, 255, 0)) #color in green
        self.rect = self.surf.get_rect(center = (900, wall_y)) #spawn wall in off the screen
    def update(self): #controls movement of walls
        self.rect.move_ip(-wall_speed, 0)
        if self.rect.right < 0: #if rect is off the screen to the left
            self.kill() #remove the rect

#Prepare the pygame modules to be used. This initializes each pygame module that needs it
pygame.init()

#gdx.open_ble("GDX-HD 151000A5")
gdx.open_usb()
gdx.select_sensors([1])
gdx.start(100)

to_graph = [] #store data points to be graphed at end
t0 = time.time() #stores when program began

sprite_x = 100
player = Player()

walls = pygame.sprite.Group()
all_sprites = pygame.sprite.Group()
all_sprites.add(player)

wall_timer = 4000
wall_speed = 10

#Define constants to be used for screen's width and height
py_width = 800
py_height = 600

#Create the screen with the py_Width and py_height variables
screen = pygame.display.set_mode((py_width, py_height))
pygame.display.set_caption("Flying Square")
time.sleep(10)

#Create custom events ADDWALL and SPEEDUP
ADDWALL = pygame.USEREVENT + 0
pygame.time.set_timer(ADDWALL, 100, True)

SPEEDUP = pygame.USEREVENT + 1
pygame.time.set_timer(SPEEDUP, 5000) #10000

#Main loop
running = True
while running:
    for event in pygame.event.get(): #iterate through events in event queue
        if event.type == QUIT:
            running = False
        elif event.type == KEYDOWN:
            if event.key == K_ESCAPE:
                running = False
        elif event.type == ADDWALL:
            pygame.time.set_timer(ADDWALL, wall_timer, True)
            top_y = rand.randint(-300, 150)
            bot_y = top_y + rand.randint(700, 850)
            new_top = Wall(top_y, wall_speed)
            new_bot = Wall(bot_y, wall_speed)
            walls.add(new_top, new_bot)
            all_sprites.add(new_top, new_bot)
        elif event.type == SPEEDUP:
            if (wall_timer-167) >= 1500:
                wall_timer -= 167
            else:
                wall_timer = 1500
            if (wall_speed+1) <= 25:
                wall_speed += 1
            else:
                wall_speed = 25
                
    data_list = gdx.read()
    if data_list == None:
        break
    else:
        data = data_list[0]
        to_graph.append([time.time()-t0, data])
        player.update(data)
    walls.update()
        
    screen.fill((0, 158, 255)) #Changes the background color to blue
    for entity in all_sprites: #Draw each entity on the screen
        screen.blit(entity.surf, entity.rect)

    #If the player collides with a wall, kill the player and end the game
    if pygame.sprite.spritecollideany(player,walls):
        player.kill()
        running = False
    
    pygame.display.flip()
data_graph = graph(width = 800, height = 500, title = "Newtons vs time")
data_curve = gcurve(data = to_graph)
pygame.quit()

