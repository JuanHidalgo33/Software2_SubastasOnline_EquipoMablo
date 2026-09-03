import { Response } from 'express';
import { PublishAuctionUseCase } from '../../../application/use-cases/PublishAuctionUseCase';
import { ListAuctionsUseCase } from '../../../application/use-cases/ListAuctionsUseCase';
import { GetAuctionDetailUseCase } from '../../../application/use-cases/GetAuctionDetailUseCase';
import { CancelAuctionUseCase } from '../../../application/use-cases/CancelAuctionUseCase';
import { PlaceBidUseCase } from '../../../application/use-cases/PlaceBidUseCase';
import { AuctionStatus } from '../../../domain/entities/Auction';
import { toAuctionResponse, toBidResponse } from '../mappers';
import { AuthenticatedRequest } from '../middlewares/authentication';

export function publishAuction(useCase: PublishAuctionUseCase) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const auction = await useCase.execute({
            sellerId: req.userId!,
            categoryId: req.body.categoryId,
            item: req.body.item,
            basePrice: req.body.basePrice,
            minIncrement: req.body.minIncrement,
            closesAt: new Date(req.body.closesAt),
        });
        res.status(201).json(toAuctionResponse(auction));
    };
}

export function listAuctions(useCase: ListAuctionsUseCase) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = await useCase.execute({
            categoryId: req.query.categoryId as string | undefined,
            status: req.query.status as AuctionStatus | undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        });
        res.status(200).json({
            items: page.items.map(toAuctionResponse),
            page: page.page,
            pageSize: page.pageSize,
            totalItems: page.totalItems,
            totalPages: page.totalPages,
        });
    };
}

export function getAuctionDetail(useCase: GetAuctionDetailUseCase) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const auction = await useCase.execute(req.params.id as string);
        res.status(200).json(toAuctionResponse(auction));
    };
}

export function cancelAuction(useCase: CancelAuctionUseCase) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        await useCase.execute({ auctionId: req.params.id as string, requesterId: req.userId! });
        res.status(204).send();
    };
}

export function placeBid(useCase: PlaceBidUseCase) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const bid = await useCase.execute({
            auctionId: req.params.id as string,
            userId: req.userId!,
            amount: req.body.amount,
        });
        res.status(201).json(toBidResponse(bid));
    };
}