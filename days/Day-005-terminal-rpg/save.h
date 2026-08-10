#ifndef SAVE_H
#define SAVE_H

#include "player.h"

#define SAVE_FILE "save.dat"

/*
 * Step 1 scaffolding only. Real file I/O (fopen/fwrite/fread)
 * gets built in a later step.
 */
void save_game(const Player *p);
int  load_game(Player *p);

#endif