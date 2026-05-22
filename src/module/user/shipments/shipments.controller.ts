import {
  Body,
  Controller,
  Delete,
  Get,
  NotImplementedException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
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
  CreateNovaPostShipmentSchema,
  type CreateNovaPostShipmentDto,
} from '../../../validation/shipments/nova-post-shipment.schema.js';
import {
  CreateUkrposhtaShipmentSchema,
  type CreateUkrposhtaShipmentDto,
} from '../../../validation/shipments/ukrposhta-shipment.schema.js';
import {
  CreateMeestShipmentSchema,
  type CreateMeestShipmentDto,
} from '../../../validation/shipments/meest-shipment.schema.js';
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
  @ApiOperation({ summary: 'Fetch unified shipments list across operators and drafts' })
  @ApiOkResponse({ description: 'Unified shipments list' })
  @ApiUnauthorizedResponse()
  getUnifiedShipments(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListShipmentsQuerySchema))
    query: ListShipmentsQueryDto,
  ) {
    return this.shipmentReadService.getUnifiedShipments(user.id, query);
  }

  @Get(SHIPMENT_ROUTES.NOVA_POSHTA)
  @ApiOperation({ summary: 'Fetch Nova Poshta shipments only' })
  @ApiOkResponse({ description: 'Nova Poshta shipments list' })
  @ApiUnauthorizedResponse()
  getNovaPoshtaShipments(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getNovaPostShipments(user.id);
  }

  @Post(SHIPMENT_ROUTES.NOVA_POSHTA)
  @ApiOperation({ summary: 'Create a shipment via Nova Poshta API' })
  @ApiCreatedResponse({ description: 'Shipment created - returns TTN and metadata' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Validation error or CONNECTION_INVALID' })
  createNovaPoshtaShipment(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateNovaPostShipmentSchema))
    dto: CreateNovaPostShipmentDto,
  ) {
    return this.novaPostService.createShipment(user.id, dto);
  }

  @Get(SHIPMENT_ROUTES.OPERATORS)
  @ApiOperation({ summary: 'List postal operators the user has connections for' })
  @ApiOkResponse({ description: 'Operator list for the shipment filter select' })
  @ApiUnauthorizedResponse()
  getShipmentOperators(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getOperatorsForUser(user.id);
  }

  @Get(SHIPMENT_ROUTES.DETAIL_BY_OPERATOR_REF)
  @ApiOperation({ summary: 'Fetch shipment detail by operator and reference' })
  @ApiOkResponse({ description: 'Shipment detail payload' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getShipmentDetail(
    @CurrentUser() user: JwtUser,
    @Param('operator') operator: string,
    @Param('ref') ref: string,
  ) {
    return this.shipmentReadService.getShipmentDetail(user.id, operator, ref);
  }

  @Delete(SHIPMENT_ROUTES.NOVA_POSHTA_DETAIL)
  @ApiOperation({ summary: 'Delete a Nova Post shipment by TTN' })
  @ApiOkResponse({ description: 'Shipment deleted - returns deletedAt timestamp' })
  @ApiNotFoundResponse({ description: 'Shipment not found or service unavailable' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'CONNECTION_INVALID' })
  deleteNovaPoshtaShipment(
    @CurrentUser() user: JwtUser,
    @Param('ref') ref: string,
  ) {
    return this.novaPostService.deleteShipment(user.id, ref);
  }

  @Get(SHIPMENT_ROUTES.UKRPOSHTA)
  @ApiOperation({ summary: 'Fetch Ukrposhta shipments only' })
  @ApiOkResponse({ description: 'Ukrposhta shipments list' })
  @ApiUnauthorizedResponse()
  getUkrposhtaShipments(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getUkrposhtaShipments(user.id);
  }

  @Post(SHIPMENT_ROUTES.UKRPOSHTA)
  @ApiOperation({ summary: 'Create a mock Ukrposhta shipment' })
  @ApiCreatedResponse({ description: 'Shipment created — returns TTN and metadata' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Validation error' })
  createUkrposhtaShipment(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateUkrposhtaShipmentSchema))
    dto: CreateUkrposhtaShipmentDto,
  ) {
    return this.ukrposhtaService.createShipment(user.id, dto);
  }

  @Delete(SHIPMENT_ROUTES.UKRPOSHTA_DETAIL)
  @ApiOperation({ summary: 'Delete a mock Ukrposhta shipment by TTN' })
  @ApiOkResponse({ description: 'Shipment deleted — returns deletedAt timestamp' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiUnauthorizedResponse()
  deleteUkrposhtaShipment(
    @CurrentUser() user: JwtUser,
    @Param('ref') ref: string,
  ) {
    return this.ukrposhtaService.deleteShipment(user.id, ref);
  }

  @Get(SHIPMENT_ROUTES.MEEST)
  @ApiOperation({ summary: 'Fetch Meest Express shipments only' })
  @ApiOkResponse({ description: 'Meest Express shipments list' })
  @ApiUnauthorizedResponse()
  getMeestShipments(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getMeestShipments(user.id);
  }

  @Post(SHIPMENT_ROUTES.MEEST)
  @ApiOperation({ summary: 'Create a mock Meest Express shipment' })
  @ApiCreatedResponse({ description: 'Shipment created — returns TTN and metadata' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Validation error' })
  createMeestShipment(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateMeestShipmentSchema))
    dto: CreateMeestShipmentDto,
  ) {
    return this.meestService.createShipment(user.id, dto);
  }

  @Delete(SHIPMENT_ROUTES.MEEST_DETAIL)
  @ApiOperation({ summary: 'Delete a mock Meest Express shipment by TTN' })
  @ApiOkResponse({ description: 'Shipment deleted — returns deletedAt timestamp' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiUnauthorizedResponse()
  deleteMeestShipment(
    @CurrentUser() user: JwtUser,
    @Param('ref') ref: string,
  ) {
    return this.meestService.deleteShipment(user.id, ref);
  }

  @Post(SHIPMENT_ROUTES.MIST)
  @ApiOperation({ summary: 'Placeholder endpoint for future Mist shipment creation' })
  @ApiUnauthorizedResponse()
  createMistShipment() {
    throw new NotImplementedException(
      'Mist shipment integration is not implemented yet.',
    );
  }
}
