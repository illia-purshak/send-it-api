import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { SHIPMENT_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  ListShipmentsQuerySchema,
  type ListShipmentsQueryDto,
} from '../../../validation/shipments/list-shipments.schema.js';
import {
  CreateShipmentSchema,
  type CreateShipmentDto,
} from '../../../validation/shipments/create-shipment.schema.js';
import type { CreateNovaPostShipmentDto } from '../../../validation/shipments/nova-post-shipment.schema.js';
import type { CreateUkrposhtaShipmentDto } from '../../../validation/shipments/ukrposhta-shipment.schema.js';
import type { CreateMeestShipmentDto } from '../../../validation/shipments/meest-shipment.schema.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import { UkrposhtaShipmentsService } from './ukrposhta-shipments.service.js';
import { MeestShipmentsService } from './meest-shipments.service.js';
import { ShipmentReadService } from './shipment-read.service.js';

@ApiTags('Shipments')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class ShipmentsController {
  constructor(
    private readonly novaPostService: NovaPostShipmentsService,
    private readonly ukrposhtaService: UkrposhtaShipmentsService,
    private readonly meestService: MeestShipmentsService,
    private readonly shipmentReadService: ShipmentReadService,
  ) {}

  @Get(SHIPMENT_ROUTES.BASE)
  @ApiOperation({
    summary: 'Fetch unified shipments list across all connected operators and drafts',
  })
  @ApiQuery({ name: 'operator', required: false, type: 'string', description: 'Filter by operator slug (e.g. nova-post, ukrposhta, meest, draft)' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'CREATED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED', 'UNKNOWN'], description: 'Filter by normalized shipment status' })
  @ApiQuery({ name: 'ttn', required: false, type: 'string', description: 'Filter by TTN / tracking number (partial match)' })
  @ApiQuery({ name: 'recipient', required: false, type: 'string', description: 'Filter by recipient name (partial match)' })
  @ApiQuery({ name: 'createdFrom', required: false, type: 'string', format: 'date', description: 'Filter by creation date (ISO 8601, inclusive)' })
  @ApiQuery({ name: 'createdTo', required: false, type: 'string', format: 'date', description: 'Filter by creation date (ISO 8601, inclusive)' })
  @ApiQuery({ name: 'valueFrom', required: false, type: 'number', description: 'Filter by declared value — minimum' })
  @ApiQuery({ name: 'valueTo', required: false, type: 'number', description: 'Filter by declared value — maximum' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'declaredValue', 'recipient'], description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'], description: 'Sort direction (default: desc)' })
  @ApiQuery({ name: 'page', required: false, type: 'integer', description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: 'integer', description: 'Items per page, max 100 (default: 20)' })
  @ApiOkResponse({ description: 'Paginated unified shipments list' })
  @ApiUnauthorizedResponse()
  getUnifiedShipments(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListShipmentsQuerySchema))
    query: ListShipmentsQueryDto,
  ) {
    return this.shipmentReadService.getUnifiedShipments(user.id, query);
  }

  @Get(SHIPMENT_ROUTES.OPERATORS)
  @ApiOperation({ summary: 'List postal operators the user has connections for' })
  @ApiOkResponse({ description: 'Operator list for the shipment filter select' })
  @ApiUnauthorizedResponse()
  getShipmentOperators(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getOperatorsForUser(user.id);
  }

  @Get(SHIPMENT_ROUTES.DETAIL_BY_OPERATOR_REF)
  @ApiOperation({ summary: 'Fetch shipment detail by operator slug and reference (TTN)' })
  @ApiParam({ name: 'operator', type: 'string', example: 'nova-post', description: 'Operator slug' })
  @ApiParam({ name: 'ref', type: 'string', example: 'SHPL6145344878', description: 'Shipment TTN / reference number' })
  @ApiOkResponse({ description: 'Full shipment detail with tracking history' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  getShipmentDetail(
    @CurrentUser() user: JwtUser,
    @Param('operator') operator: string,
    @Param('ref') ref: string,
  ) {
    return this.shipmentReadService.getShipmentDetail(user.id, operator, ref);
  }

  @Post(SHIPMENT_ROUTES.BASE)
  @ApiOperation({
    summary: 'Create a shipment via the specified operator',
    description:
      'Pass `operator` in the request body to route to the correct postal provider. ' +
      'Each operator has its own payload shape — the schema is a discriminated union on the `operator` field.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          title: 'nova-post',
          description: 'Nova Post shipment',
          properties: { operator: { type: 'string', enum: ['nova-post'] } },
          required: ['operator'],
        },
        {
          title: 'ukrposhta',
          description: 'Ukrposhta shipment',
          properties: { operator: { type: 'string', enum: ['ukrposhta'] } },
          required: ['operator'],
        },
        {
          title: 'meest',
          description: 'Міст shipment',
          properties: { operator: { type: 'string', enum: ['meest'] } },
          required: ['operator'],
        },
      ],
    },
  })
  @ApiCreatedResponse({ description: 'Shipment created — returns TTN and metadata' })
  @ApiBadRequestResponse({ description: 'Validation error or CONNECTION_INVALID' })
  @ApiUnprocessableEntityResponse({ description: 'CONNECTION_INVALID — API key no longer valid' })
  @ApiServiceUnavailableResponse({ description: 'OPERATOR_UNAVAILABLE or OPERATOR_ERROR' })
  @ApiUnauthorizedResponse()
  createShipment(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateShipmentSchema)) dto: CreateShipmentDto,
  ) {
    if (dto.operator === 'nova-post') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { operator, ...payload } = dto;
      return this.novaPostService.createShipment(user.id, payload as CreateNovaPostShipmentDto);
    }
    if (dto.operator === 'ukrposhta') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { operator, ...payload } = dto;
      return this.ukrposhtaService.createShipment(user.id, payload as CreateUkrposhtaShipmentDto);
    }
    if (dto.operator === 'meest') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { operator, ...payload } = dto;
      return this.meestService.createShipment(user.id, payload as CreateMeestShipmentDto);
    }
    throw new NotFoundException('Operator not found');
  }

  @Delete(SHIPMENT_ROUTES.DETAIL_BY_OPERATOR_REF)
  @ApiOperation({ summary: 'Delete / cancel a shipment by operator slug and reference (TTN)' })
  @ApiParam({ name: 'operator', type: 'string', example: 'nova-post', description: 'Operator slug' })
  @ApiParam({ name: 'ref', type: 'string', example: 'SHPL6145344878', description: 'Shipment TTN / reference number' })
  @ApiOkResponse({ description: 'Shipment deleted — returns deletedAt timestamp' })
  @ApiNotFoundResponse({ description: 'Shipment not found or operator not supported' })
  @ApiUnprocessableEntityResponse({ description: 'CONNECTION_INVALID' })
  @ApiUnauthorizedResponse()
  deleteShipment(
    @CurrentUser() user: JwtUser,
    @Param('operator') operator: string,
    @Param('ref') ref: string,
  ) {
    if (operator === 'nova-post') {
      return this.novaPostService.deleteShipment(user.id, ref);
    }
    if (operator === 'ukrposhta') {
      return this.ukrposhtaService.deleteShipment(user.id, ref);
    }
    if (operator === 'meest') {
      return this.meestService.deleteShipment(user.id, ref);
    }
    throw new NotFoundException(`Operator '${operator}' is not supported for shipment deletion.`);
  }
}
