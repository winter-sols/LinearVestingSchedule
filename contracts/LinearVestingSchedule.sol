//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

contract LinearVestingSchedule is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev keep vesting schedule
    struct VestingSchedule {
      address erc20Token;
      address to;
      uint256 amount;
      uint256 time;
      uint256 createdAt;
      uint256 lastRedeemTime;
    }

    /// @dev schedule id => VestingSchedule
    mapping(uint256 => VestingSchedule) public vestingSchedules;

    /// @dev schedule id tracker
    uint256 internal scheduleIdTracker;

    event Minted(address erc20Token, address to, uint256 amount, uint256 time);
    event Redeemed(uint256 scheduleId, address to, uint256 amount);

    constructor() ReentrancyGuard() { }

    /**
     * @dev schedule vesting
     * @param _erc20Token ERC20 token address 
     * @param _to receipient address
     * @param _amount amount
     * @param _time vesting period
     */
    function mint(
        address _erc20Token,
        address _to,
        uint256 _amount,
        uint256 _time
    ) external nonReentrant {
        require(_erc20Token != address(0), 'LVS: invalid token address');
        require(_to != address(0), 'LVS: invalid to address');
        require(_amount > 0, 'LVS: invalid amount');
        require(_time > 0, 'LVS: invalid time');
        
        IERC20(_erc20Token).safeTransferFrom(msg.sender, address(this), _amount);
        vestingSchedules[scheduleIdTracker] = VestingSchedule(
            _erc20Token,
            _to,
            _amount,
            _time, // time
            block.timestamp, // createdAt
            block.timestamp // lastRedeemTime
        );
        scheduleIdTracker += 1;
        emit Minted(_erc20Token, _to, _amount, _time);
    }

    /**
     * @dev redeem token according to schedule id
     * @param scheduleId vesting schedule id
     */
    function redeem(uint256 scheduleId) external nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[scheduleId];
        uint256 elapsedTime = block.timestamp - vestingSchedule.lastRedeemTime;

        uint256 remainingTimeTillExpiration = vestingSchedule.createdAt + vestingSchedule.time - vestingSchedule.lastRedeemTime; 
        uint256 actualElapsedTime = Math.min(remainingTimeTillExpiration, elapsedTime);

        require(vestingSchedule.to != address(0), 'LVS: no scheduleId');
        require(msg.sender == vestingSchedule.to, 'LVS: invalid scheduleId for user');

        uint256 redeemAmount = vestingSchedule.amount * actualElapsedTime / vestingSchedule.time;

        if (redeemAmount > 0) {
            vestingSchedule.lastRedeemTime = block.timestamp;

            IERC20(vestingSchedule.erc20Token).safeTransfer(vestingSchedule.to, redeemAmount);
            emit Redeemed(scheduleId, vestingSchedule.to, redeemAmount);
        }
    }
}
