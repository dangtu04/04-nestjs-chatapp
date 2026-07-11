import { UsersService } from './users.service';

describe('UsersService.getUserForAccessToken', () => {
  it('should select role for access token payload', async () => {
    const select = jest.fn().mockReturnValue({ _id: '1', role: 'user' });
    const findById = jest.fn().mockReturnValue({ select });
    const userModel = { findById } as any;

    const service = new UsersService(userModel, {} as any, {} as any);

    const result = await service.getUserForAccessToken('507f1f77bcf86cd799439011');

    expect(findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(select).toHaveBeenCalledWith('_id name email isActive role');
    expect(result).toEqual({ _id: '1', role: 'user' });
  });
});
