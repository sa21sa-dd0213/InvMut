import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m5be1318d test", function () {
  it("should revert when withdrawing with amount > 0 due to mutant changing > to <", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Mint tokens to addr1 and approve the staking contract
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);

    // Stake tokens first
    await instance.connect(addr1).stake(stakeAmount);

    // Try to withdraw with a positive amount - should revert in mutant because amount < 0 is impossible
    // In the original contract, amount > 0 allows withdrawal
    // In the mutant, amount < 0 is required which can never be true for uint256
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("1"), false)
    ).to.be.reverted;
  });
});