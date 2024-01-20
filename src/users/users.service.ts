import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { Event } from '../entities/event.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.usersRepository.create({
      name: createUserDto.name,
    });
    if (createUserDto.events) {
      newUser.events = await this.eventsRepository.findBy({
        id: In(createUserDto.events),
      });
    } else {
      newUser.events = [];
    }
    await this.usersRepository.save(newUser);
    return newUser;
  }
}
