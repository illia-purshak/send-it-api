import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotImplementedException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { SHIPMENT_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  SaveDraftSchema,
  UpdateDraftSchema,
  type SaveDraftDto,
  type UpdateDraftDto,
} from '../../../validation/shipments/draft.schema.js';
import {
  ListShipmentsQuerySchema,
  type ListShipmentsQueryDto,
} from '../../../validation/shipments/list-shipments.schema.js';
import {
  CreateNovaPostShipmentSchema,
  type CreateNovaPostShipmentDto,
} from '../../../validation/shipments/nova-post-shipment.schema.js';
import {
  SaveTemplateSchema,
  type SaveTemplateDto,
} from '../../../validation/shipments/template.schema.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import { ShipmentDraftsService } from './shipment-drafts.service.js';
import { ShipmentReadService } from './shipment-read.service.js';
import { ShipmentTemplatesService } from './shipment-templates.service.js';

@ApiTags('Shipments')
@ApiBearerAuth('bearer')
@Controller(SHIPMENT_ROUTES.BASE)
export class ShipmentsController {
  constructor(
    private readonly draftsService: ShipmentDraftsService,
    private readonly templatesService: ShipmentTemplatesService,
    private readonly novaPostService: NovaPostShipmentsService,
    private readonly shipmentReadService: ShipmentReadService,
  ) {}

  @Get()
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

  @Get(SHIPMENT_ROUTES.DRAFTS)
  @ApiOperation({ summary: 'List all drafts for the current user' })
  @ApiOkResponse({ description: 'List of drafts' })
  @ApiUnauthorizedResponse()
  getDrafts(@CurrentUser() user: JwtUser) {
    return this.draftsService.getDrafts(user.id);
  }

  @Get(SHIPMENT_ROUTES.DRAFT_DUPLICATE)
  @ApiOperation({ summary: 'Get draft data formatted for form prefilling' })
  @ApiOkResponse({ description: 'Draft data for duplication' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getDraftDuplicateData(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.draftsService.getDraftDuplicateData(user.id, id);
  }

  @Get(SHIPMENT_ROUTES.DRAFT_BY_ID)
  @ApiOperation({ summary: 'Get a single draft by ID' })
  @ApiOkResponse({ description: 'Draft record' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getDraftById(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.draftsService.getDraftById(user.id, id);
  }

  @Post(SHIPMENT_ROUTES.DRAFTS)
  @ApiOperation({ summary: 'Save a new draft' })
  @ApiCreatedResponse({ description: 'Draft created' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  saveDraft(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(SaveDraftSchema)) dto: SaveDraftDto,
  ) {
    return this.draftsService.saveDraft(user.id, dto);
  }

  @Put(SHIPMENT_ROUTES.DRAFT_BY_ID)
  @ApiOperation({ summary: 'Update an existing draft' })
  @ApiOkResponse({ description: 'Draft updated' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  updateDraft(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateDraftSchema)) dto: UpdateDraftDto,
  ) {
    return this.draftsService.updateDraft(user.id, id, dto);
  }

  @Delete(SHIPMENT_ROUTES.DRAFT_BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a draft' })
  @ApiOkResponse({ description: 'Draft deleted' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  deleteDraft(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.draftsService.deleteDraft(user.id, id);
  }

  @Get(SHIPMENT_ROUTES.TEMPLATES)
  @ApiOperation({ summary: 'List all saved templates for the current user' })
  @ApiOkResponse({ description: 'List of templates' })
  @ApiUnauthorizedResponse()
  getTemplates(@CurrentUser() user: JwtUser) {
    return this.templatesService.getTemplates(user.id);
  }

  @Post(SHIPMENT_ROUTES.TEMPLATES)
  @ApiOperation({ summary: 'Save current form state as a reusable template' })
  @ApiCreatedResponse({ description: 'Template saved' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  saveTemplate(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(SaveTemplateSchema)) dto: SaveTemplateDto,
  ) {
    return this.templatesService.saveTemplate(user.id, dto);
  }

  @Delete(SHIPMENT_ROUTES.TEMPLATE_BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a saved template' })
  @ApiOkResponse({ description: 'Template deleted' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  deleteTemplate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templatesService.deleteTemplate(user.id, id);
  }

  @Get(SHIPMENT_ROUTES.NOVA_POST)
  @ApiOperation({ summary: 'Fetch Nova Post shipments only' })
  @ApiOkResponse({ description: 'Nova Post shipments list' })
  @ApiUnauthorizedResponse()
  getNovaPostShipments(@CurrentUser() user: JwtUser) {
    return this.shipmentReadService.getNovaPostShipments(user.id);
  }

  @Post(SHIPMENT_ROUTES.NOVA_POST)
  @ApiOperation({ summary: 'Create a shipment via Nova Post API' })
  @ApiCreatedResponse({ description: 'Shipment created - returns TTN and metadata' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Validation error or CONNECTION_INVALID' })
  createNovaPostShipment(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateNovaPostShipmentSchema))
    dto: CreateNovaPostShipmentDto,
  ) {
    return this.novaPostService.createShipment(user.id, dto);
  }

  @Get(SHIPMENT_ROUTES.NOVA_POST_DUPLICATE)
  @ApiOperation({
    summary: 'Get Nova Post shipment data for form prefilling',
  })
  @ApiOkResponse({ description: 'Form-relevant fields from shipment' })
  @ApiUnauthorizedResponse()
  getNovaPostDuplicateData(
    @CurrentUser() user: JwtUser,
    @Param('ttn') ttn: string,
  ) {
    return this.novaPostService.getShipmentDuplicateData(user.id, ttn);
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

  @Post(SHIPMENT_ROUTES.UKRPOSHTA)
  @ApiOperation({ summary: 'Placeholder endpoint for future Ukrposhta shipment creation' })
  @ApiUnauthorizedResponse()
  createUkrposhtaShipment() {
    throw new NotImplementedException(
      'Ukrposhta shipment integration is not implemented yet.',
    );
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
