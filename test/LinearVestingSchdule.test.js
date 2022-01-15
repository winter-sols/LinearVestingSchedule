const { expect } = require("chai");
const { ethers } = require("hardhat");
const { advanceTime } = require('./lib');

describe("LinearVestingSchedule", function () {
  before(async () => {
    const users = await ethers.getSigners()
    const [tokenOwner, user1, user2, user3] = users
    this.tokenOwner = tokenOwner
    this.user1 = user1
    this.user2 = user2
    this.user3 = user3
    this.allowance = 1000

    // Deploy LinearVestingSchedule
    const LinearVestingSchedule = await ethers.getContractFactory("LinearVestingSchedule")
    this.lvSchedule = await LinearVestingSchedule.deploy()

    // Deploy MockERC20Token
    const MockERC20Token = await ethers.getContractFactory("MockERC20Token")
    this.erc20Token = await MockERC20Token.deploy(
      'MockERC20Token',
      'MockERC20Token',
      [tokenOwner.address],
      [1000]
    )
  })

  it('mint fails: invalid token address', async () => {
    const amount = 100
    const time = 50 * 24 * 3600 // 40 days

    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      ethers.constants.AddressZero,
      this.user1.address,
      amount,
      time
    )).to.revertedWith("LVS: invalid token address")

  })

  it('mint fails: invalid to address', async () => {
    const amount = 100
    const time = 50 * 24 * 3600 //40 days

    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      this.erc20Token.address,
      ethers.constants.AddressZero,
      amount,
      time
    )).to.revertedWith("LVS: invalid to address")
  })

  it('mint fails: invalid amount', async () => {
    const amount = 100
    const time = 50 * 24 * 3600 //40 days

    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      this.erc20Token.address,
      this.user1.address,
      0,
      time
    )).to.revertedWith("LVS: invalid amount")
  })
  
  it('mint fails: invalid time', async () => {
    const amount = 100
    const time = 50 * 24 * 3600 //40 days

    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      this.erc20Token.address,
      this.user1.address,
      amount,
      0
    )).to.revertedWith("LVS: invalid time")
  })

  it('mint succeeds: 100 amount of token is available within 50 days for user1', async () => {
    const amount = 100
    const time1 = 50 * 24 * 3600 // 50 days
    await this.erc20Token.connect(this.tokenOwner).approve(this.lvSchedule.address, this.allowance)
    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      this.erc20Token.address,
      this.user1.address,
      amount,
      time1
    )).emit(this.lvSchedule, 'Minted')
      .withArgs(this.erc20Token.address, this.user1.address, amount, time1)
  })
  
  it('mint succeeds: 100 amount of token is available within 40 days for user2', async () => {
    const amount = 100
    const time2 = 40 * 24 * 3600 // 40 days
    await this.erc20Token.connect(this.tokenOwner).approve(this.lvSchedule.address, this.allowance)
    await expect(this.lvSchedule.connect(this.tokenOwner).mint(
      this.erc20Token.address,
      this.user2.address,
      amount,
      time2
    )).emit(this.lvSchedule, 'Minted')
      .withArgs(this.erc20Token.address, this.user2.address, amount, time2)
  })

  it('redeem fails: no scheduleId', async () => {
    await expect(this.lvSchedule.connect(this.user1).redeem(5))
      .to.revertedWith("LVS: no scheduleId")

    await expect(this.lvSchedule.connect(this.user2).redeem(5))
      .to.revertedWith("LVS: no scheduleId")
  })

  it('redeem fails: invalid scheduleId for a specific user', async () => {
    const scheduleId1 = 0
    const scheduleId2 = 1

    await expect(this.lvSchedule.connect(this.user1).redeem(scheduleId2))
      .to.revertedWith("LVS: invalid scheduleId for user")

    await expect(this.lvSchedule.connect(this.user2).redeem(scheduleId1))
      .to.revertedWith("LVS: invalid scheduleId for user")
    
    await expect(this.lvSchedule.connect(this.user3).redeem(scheduleId1))
      .to.revertedWith("LVS: invalid scheduleId for user")

    await expect(this.lvSchedule.connect(this.user3).redeem(scheduleId2))
      .to.revertedWith("LVS: invalid scheduleId for user")
  })
  
  it('redeem succeeds: user1 is allowed to redeem 20 tokens after 10 days', async () => {
    const scheduleId = 0

    await advanceTime(10 * 24 * 3600); // pass 10 days
    await expect(this.lvSchedule.connect(this.user1).redeem(scheduleId))
      .emit(this.lvSchedule, 'Redeemed')
      .withArgs(scheduleId, this.user1.address, 20)
  })

  it('redeem succeeds: user2 is allowed to redeem 25 tokens after 10 days', async () => {
    const scheduleId = 1

    await expect(this.lvSchedule.connect(this.user2).redeem(scheduleId))
      .emit(this.lvSchedule, 'Redeemed')
      .withArgs(scheduleId, this.user2.address, 25)
  })
  
  it('redeem succeeds: user1 is also allowed to redeem another 40 tokens after 20 days', async () => {
    const scheduleId = 0
  
    await advanceTime(20 * 24 * 3600) // pass 20 days
    await expect(this.lvSchedule.connect(this.user1).redeem(scheduleId))
      .emit(this.lvSchedule, 'Redeemed')
      .withArgs(scheduleId, this.user1.address, 40)
  })

  it('redeem succeeds: user2 is also allowed to redeem another 50 tokens after 20 days', async () => {
    const scheduleId = 1

    await expect(this.lvSchedule.connect(this.user2).redeem(scheduleId))
      .emit(this.lvSchedule, 'Redeemed')
      .withArgs(scheduleId, this.user2.address, 50)
  })
});
