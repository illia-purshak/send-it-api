import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { DRAFT_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { buildUnpaginatedResponse } from '../../../utils/pagination.util.js';
import {
  SaveDraftSchema,
  UpdateDraftSchema,
  type SaveDraftDto,
  type UpdateDraftDto,
} from '../../../validation/shipments/draft.schema.js';
import { ShipmentDraftsService } from '../shipments/shipment-drafts.service.js';

@ApiTags('Drafts')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class DraftsController {
  constructor(private readonly draftsService: ShipmentDraftsService) {}

  @Get(DRAFT_ROUTES.BASE)
  @ApiOperation({ summary: 'List all drafts for the current user' })
  @ApiOkResponse({ description: 'List of drafts' })
  @ApiUnauthorizedResponse()
  async getDrafts(@CurrentUser() user: JwtUser) {
    const items = await this.draftsService.getDrafts(user.id);
    return buildUnpaginatedResponse(items);
  }

  @Get(DRAFT_ROUTES.BY_ID)
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

  @Post(DRAFT_ROUTES.BASE)
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

  @Put(DRAFT_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update an existing draft (auto-save or manual save)' })
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

  @Delete(DRAFT_ROUTES.BY_ID)
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
}
