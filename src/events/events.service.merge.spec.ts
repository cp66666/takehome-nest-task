import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { User } from '../entities/user.entity';

describe('EventsService - mergeAll', () => {
  let service: EventsService;
  let eventRepository: jest.Mocked<Repository<Event>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn(),
            manager: {
              transaction: jest.fn().mockImplementation((transactionalFn) => transactionalFn({
                  save: jest.fn(),
                  remove: jest.fn(),
                }),
              ),
            },
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should merge events correctly', async () => {
    // Setup mock data for the test
    const mockEvents = [
      // ... populate with Event entities including invitees
    ];
    eventRepository.find.mockResolvedValue(mockEvents);

    // userRepository.findBy.mockImplementation((ids) => Promise.resolve(
    //     ids.id.map(id => ({ id, name: `user${id}` })),
    // ));

    // Call the method to test
    await service.mergeAll();

    // Assertions to confirm that the method behaves as expected
    expect(eventRepository.manager.transaction).toHaveBeenCalled();
    expect(eventRepository.find).toHaveBeenCalledWith({ relations: ['invitees'] });

    expect(eventRepository.manager.transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
