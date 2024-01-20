import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CreateEventDto } from './dto/createEvent.dto';
import { Event, EventStatus } from '../entities/event.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const newEvent = this.eventRepository.create({
      title: createEventDto.title,
      description: createEventDto.description,
      status: createEventDto.status,
      startTime: new Date(createEventDto.startTime),
      endTime: new Date(createEventDto.endTime),
      invitees: [], // Initialize the invitees collection
    });

    // If invitees are provided, fetch them and add to the new event's invitees
    if (createEventDto.invitees && createEventDto.invitees.length > 0) {
      if (createEventDto.invitees && createEventDto.invitees.length > 0) {
        newEvent.invitees = await this.userRepository.find({
          where: { id: In(createEventDto.invitees) },
        });
      }
    }
    return await this.eventRepository.save(newEvent);
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['invitees'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async delete(
    id: number,
    transactionalManager?: EntityManager,
  ): Promise<void> {
    const manager = transactionalManager || this.eventRepository.manager;

    await manager.transaction(async (transactionManager) => {
      const event = await transactionManager.findOne(Event, {
        where: { id },
        relations: ['invitees'],
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      // Remove the event from each user's list of events
      for (const user of event.invitees) {
        if (user.events) {
          user.events = user.events.filter((e) => e.id !== id);
          await transactionManager.save(User, user);
        }
      }

      await transactionManager.remove(Event, event);
    });
  }

  private getMergeEventIdGroups(events: Event[]): number[][] {
    // Sort events by start time to easily find overlaps
    events.sort((a, b) => {
      return a.startTime.getTime() - b.startTime.getTime()
    });

    const mergedSet = new Set<number>(); // Keeps track of events that have been merged
    const mergeEventIdGroups: number[][] = []; // Stores groups of event id for merging

    for (let i = 0; i < events.length; i++) {
      // Skip if the event is already merged
      if (mergedSet.has(i)) {
        continue;
      }

      let currStartTime = events[i].startTime;
      let currEndTime = events[i].endTime;
      // console.log(events[i].invitees);
      if (events[i].invitees.length === 0) {
        continue;
      }
      const currUserList = new Set(events[i].invitees.map((user) => user.id));
      const currEventIdList = [events[i].id]; // Start with the current event's index

      for (let j = i + 1; j < events.length; j++) {
        // Skip if the event is already merged
        if (mergedSet.has(j)) {
          continue;
        }

        const eventStartTime = events[j].startTime;
        const eventEndTime = events[j].endTime;
        const eventUserIds = events[j].invitees.map((user) => user.id);

        // Check if the current event overlaps in time and users with the event at pointer j
        if (
          eventStartTime < currEndTime &&
          eventUserIds.some((id) => currUserList.has(id))
        ) {
          // Update the current time range and user list with the overlapping event
          currStartTime = new Date(
            Math.min(currStartTime.getTime(), eventStartTime.getTime()),
          );
          currEndTime = new Date(
            Math.max(currEndTime.getTime(), eventEndTime.getTime()),
          );
          eventUserIds.forEach((id) => currUserList.add(id));
          currEventIdList.push(events[j].id);

          // Mark this event as merged
          mergedSet.add(j);

          // Reset pointer j to go back to the next of the first pointer (i)
          j = i;
        } else if (eventStartTime >= currEndTime) {
          break;
        }
      }

      // If there's more than one event in the current group, add it to the groups for merging
      if (currEventIdList.length > 1) {
        mergeEventIdGroups.push(currEventIdList);
      }
    }
    // console.log(mergeEventIdGroups);
    return mergeEventIdGroups;
  }
  async mergeAll(): Promise<void> {
    // Assume we have a method to get all events that could potentially be merged
    const events = await this.eventRepository.find({ relations: ['invitees'] });
    // Use your method to get groups of event IDs to merge
    const mergeEventIdGroups = this.getMergeEventIdGroups(events);

    // Start a database transaction
    await this.eventRepository.manager.transaction(
      async (transactionalEntityManager) => {
        for (const groupIdList of mergeEventIdGroups) {
          // Fetch full event entities for the IDs in groupIdList
          const eventsToMerge: Event[] = [];
          for (const eventId of groupIdList) {
            const event = await this.findOne(eventId);
            if (event) {
              eventsToMerge.push(event);
            }
          }
          // Create a merged event based on the eventsToMerge
          const startTime = getEarliestStartTime(eventsToMerge); // Earliest start time
          const endTime = getLatestEndTime(eventsToMerge); // Latest end time
          const title = eventsToMerge.map((e) => e.title).join(' / '); // Merged title
          const description = eventsToMerge
            .map((e) => e.description)
            .join(' / '); // Merged description
          const status = mergeStatus(eventsToMerge); // Merged status

          // Create a set to hold all unique user IDs from the overlapping events
          const allUserIds = new Set<number>();
          eventsToMerge.forEach((event) => {
            event.invitees.forEach((user) => allUserIds.add(user.id));
          });

          const invitees = await this.userRepository.findBy({
            id: In([...allUserIds]),
          });
          // Create a new event entity with the merged properties
          const mergedEvent = new Event();
          mergedEvent.startTime = startTime;
          mergedEvent.endTime = endTime;
          mergedEvent.title = title;
          mergedEvent.description = description;
          mergedEvent.status = status;
          mergedEvent.invitees = invitees;

          // Persist the new merged event
          await transactionalEntityManager.save(Event, mergedEvent);

          for (const event of eventsToMerge) {
            // delete event
            await this.delete(event.id, transactionalEntityManager);
          }
        }
      },
    );

    // helper functions
    function getEarliestStartTime(overlapGroup: Event[]) {
      return new Date(
        Math.min(
          ...overlapGroup.map((event) => new Date(event.startTime).getTime()),
        ),
      );
    }
    function getLatestEndTime(overlapGroup: Event[]) {
      return new Date(
        Math.max(
          ...overlapGroup.map((event) => new Date(event.endTime).getTime()),
        ),
      );
    }
    function mergeStatus(events: Event[]) {
      if (events.some((event) => event.status === 'IN_PROGRESS')) {
        return EventStatus.IN_PROGRESS;
      } else if (events.some((event) => event.status === 'TODO')) {
        return EventStatus.TODO;
      } else {
        return EventStatus.COMPLETED;
      }
    }
  }
}
