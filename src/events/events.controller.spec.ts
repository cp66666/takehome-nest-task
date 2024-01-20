import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/createEvent.dto';
import { Event, EventStatus } from '../entities/event.entity';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;

  beforeEach(async () => {
    // Create a mock EventsService
    const mockEventsService = {
      create: jest.fn((dto) => {
        return {
          id: Date.now(), // Mock some unique id
          ...dto,
        };
      }),
      // other methods as necessary
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an event', async () => {
    const createEventDto: CreateEventDto = {
      title: 'New Year Party',
      description: 'Party to celebrate the new year',
      status: EventStatus.TODO,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      invitees: [1, 2],
    };

    jest
      .spyOn(service, 'create')
      .mockImplementation(async (dto: CreateEventDto) => {
        return {
          id: expect.any(Number),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...dto,
        } as unknown as Event; // Use 'unknown' as intermediary cast
      });

    const result = await controller.create(createEventDto);

    expect(result).toEqual({
      id: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      ...createEventDto,
    });
    expect(service.create).toHaveBeenCalledWith(createEventDto);
  });
});
