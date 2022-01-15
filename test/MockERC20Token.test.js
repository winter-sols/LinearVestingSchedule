const { expect } = require('chai')
const { ethers } = require("hardhat")

describe('Mock ERC20 Token', () => {
  before(async () => {
    const users = await ethers.getSigners()
    const [owner] = users

    this.users = users.slice(2)
    this.owner = owner

    const MockERC20Token = await ethers.getContractFactory('MockERC20Token')
    this.MockERC20Token = await MockERC20Token.deploy(
      'RT',
      'RT',
      [this.users[0].address, this.users[1].address],
      [1000, 2000]
    )
  })

  it('check deploy requrements', async () => {
    const MockERC20Token = await ethers.getContractFactory('MockERC20Token')
    await expect(MockERC20Token.deploy(
      'RT',
      'RT',
      [this.users[0].address, this.users[1].address],
      [1000]
    )).to.revertedWith('MockERC20Token: must have same number of mint addresses and amounts')

    await expect(MockERC20Token.deploy(
      'RT',
      'RT',
      [this.users[0].address, ethers.constants.AddressZero],
      [1000, 2000]
    )).to.revertedWith('MockERC20Token: cannot have a non-address as reserve.')
  })

  it('check balance after deployment', async () => {
    // check tokens are distributed to initial holders
    expect(
      (await this.MockERC20Token.balanceOf(this.users[0].address)).toString()
    ).to.equal('1000')

    expect(
      (await this.MockERC20Token.balanceOf(this.users[1].address)).toString()
    ).to.equal('2000')
  })

  it('check decimals', async () => {
    expect(
      await this.MockERC20Token.decimals()
    ).to.equal(18)
  })

  it('burn', async () => {
    const [, bob] = this.users
    await expect(this.MockERC20Token.connect(bob).burn(1500))
      .to.emit(this.MockERC20Token, 'Transfer')
      .withArgs(bob.address, ethers.constants.AddressZero, 1500)
    
    expect(await this.MockERC20Token.balanceOf(bob.address))
      .to.equal(500)
  })
})
