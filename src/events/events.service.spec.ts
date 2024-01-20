import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { CreateEventDto } from './dto/createEvent.dto';
import { User } from '../entities/user.entity';
import { NotFoundException } from '@nestjs/common';

const mockTransactionCallback = jest.fn();

const mockManager = {
  transaction: jest.fn((transactionCallback) => {
    mockTransactionCallback.mockImplementation(transactionCallback);
    return transactionCallback(mockManager);
  }),
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockEventRepository = {
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest
    .fn()
    .mockImplementation((event) => Promise.resolve({ ...event, id: 1 })),
  findOne: jest.fn(),
  find: jest.fn(),
  sort: jest.fn(),
  manager: mockManager,
};

const mockUserRepository = {
  // Mock the `findOne` method if used by your service
  findOne: jest.fn().mockResolvedValue({
    id: 1,
    name: 'John Doe',
    // Include other properties that your User entity might have
  }),

  findBy: jest.fn().mockReturnValue({
    id: 1,
    name: 'user1',
  }),
  // Mock the `find` method if you're retrieving multiple users
  find: jest.fn().mockResolvedValue([
    // Return an array of user entities
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' },
    // ... more user entities
  ]),
  // Mock the `save` method if your service updates or creates users
  save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
};

describe('EventsService', () => {
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
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        // Add any other providers your service depends on
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create a new event', async () => {
    // Arrange
    const createEventDto: CreateEventDto = {
      title: 'Test Event',
      description: 'This is a test event',
      status: EventStatus.TODO,
      startTime: '2024-01-14T13:00:00.000Z',
      endTime: '2024-01-14T15:00:00.000Z',
      invitees: [1, 2],
    };

    // Mock
    const expectedEvent = new Event();
    Object.assign(expectedEvent, createEventDto, { id: 1 });
    eventRepository.create.mockReturnValue(expectedEvent);
    eventRepository.save.mockResolvedValue(expectedEvent);
    eventRepository.findOne.mockResolvedValue(expectedEvent);

    // Act
    const result = await service.create(createEventDto);

    // Assert
    expect(result).toEqual(expectedEvent);
  });

  it('should handle errors when creating an event fails', async () => {
    // Arrange
    const createEventDto: CreateEventDto = {
      title: 'Test Event',
      description: 'This is a test event',
      status: EventStatus.TODO,
      startTime: '2024-01:00:00.000Z', //invalid date
      endTime: '2024-01-14T15:00:00.000Z',
      invitees: [1, 2],
    };

    // Simulate a failure in the repository's save method
    eventRepository.save.mockRejectedValue(new Error('Failed to save event'));

    // Act & Assert
    await expect(service.create(createEventDto)).rejects.toThrow(
      'Failed to save event',
    );
  });

  it('should return an event if found', async () => {
    // Arrange
    const eventId = 1;
    const expectedEvent = new Event();
    expectedEvent.id = eventId;
    expectedEvent.invitees = []; // Populate as needed

    eventRepository.findOne.mockResolvedValue(expectedEvent);

    // Act
    const result = await service.findOne(eventId);

    // Assert
    expect(result).toEqual(expectedEvent);
    expect(eventRepository.findOne).toHaveBeenCalledWith({
      where: { id: eventId },
      relations: ['invitees'],
    });
  });

  it('should throw a NotFoundException if no event is found', async () => {
    // Arrange
    const eventId = 1;
    eventRepository.findOne.mockResolvedValue(null);

    // Assert
    await expect(service.findOne(eventId)).rejects.toThrow(NotFoundException);
  });

  it('should delete an event if it exists', async () => {
    const eventId = 1;
    const mockEvent = { id: eventId, invitees: [] }; // Assuming this is the shape of your Event entity

    // Set up the mocks
    mockManager.findOne.mockResolvedValueOnce(mockEvent);

    // Perform the operation
    await service.delete(eventId);

    // Assertions
    expect(mockManager.remove).toHaveBeenCalledWith(Event, {
      id: 1,
      invitees: [],
    });
  });

  it('should throw NotFoundException if event does not exist', async () => {
    const eventId = 1;
    // Make sure to clear any previous mock implementations
    mockManager.findOne.mockClear();
    mockManager.remove.mockClear();

    // Simulate that no event is found by returning null
    mockManager.findOne.mockResolvedValue(null);

    await expect(service.delete(eventId)).rejects.toThrow(NotFoundException);
    expect(mockManager.transaction).toHaveBeenCalled();
    expect(mockManager.findOne).toHaveBeenCalledWith(Event, {
      where: { id: eventId },
      relations: ['invitees'],
    });
    expect(mockManager.remove).not.toHaveBeenCalled();
  });

  /*
     it('should merge events correctly', async () => {
       // Mock data
       const createEventDto1: CreateEventDto = {
         title: 'event1',
         description: 'This is event1',
         status: EventStatus.IN_PROGRESS,
         startTime: '2024-01-14T14:00:00.000Z',
         endTime: '2024-01-14T16:00:00.000Z',
         invitees: [1],
       };

       const createEventDto2: CreateEventDto = {
         title: 'event2',
         description: 'This is event2',
         status: EventStatus.TODO,
         startTime: '2024-01-14T13:00:00.000Z',
         endTime: '2024-01-14T15:00:00.000Z',
         invitees: [1, 2],
       };

       const createEventDto_merged: CreateEventDto = {
         title: 'event1 / event2',
         description: 'This is event1 / This is event2',
         status: EventStatus.IN_PROGRESS,
         startTime: '2024-01-14T13:00:00.000Z',
         endTime: '2024-01-14T16:00:00.000Z',
         invitees: [1, 2],
       }; //


       // Mock
       // eventRepository.create.mockReturnValue(event1);
       // eventRepository.save.mockResolvedValue(event1);
       const event1 = await service.create(Object.assign(new Event(), createEventDto1, { id: 1 }));

       // eventRepository.create.mockReturnValue(event2);
       // eventRepository.save.mockResolvedValue(event2);
       const event2 = await service.create(Object.assign(new Event(), createEventDto2, { id: 2 }));

       // Act
       const mergedEvent = new Event();
       Object.assign(mergedEvent, createEventDto_merged, { id: 3 });
       // eventRepository.create.mockReturnValue(mergedEvent);
       // eventRepository.save.mockResolvedValue(mergedEvent);
       eventRepository.find.mockResolvedValue([event1, event2]);
       mockManager.findOne.mockReturnValue(event1);
         eventRepository.findOne.mockResolvedValue(event1);
       let test3 = await service.mergeAll();
       const result = await service.findOne(3);

       // Assert
       expect(result).toEqual(mergedEvent);
     });
  */
});
