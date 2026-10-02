import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - me03b7e21", function () {
  it("should kill the mutant by calling stakeFor with a positive amount and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Give addr1 some staking tokens
    const amount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, amount);

    // Approve the staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), amount);

    // Call stakeFor with a positive amount - should succeed in original, revert in mutant
    await expect(
      instance.connect(addr1).stakeFor(addr1.address, amount)
    ).to.not.be.reverted;
  });
});