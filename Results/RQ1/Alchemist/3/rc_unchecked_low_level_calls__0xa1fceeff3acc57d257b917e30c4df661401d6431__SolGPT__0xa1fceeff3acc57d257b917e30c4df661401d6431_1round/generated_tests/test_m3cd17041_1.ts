import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when tos array is empty, killing the mutant that changed > to >=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that has transferFrom for the call
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    const amount = ethers.parseEther("10");
    await token.approve(await instance.getAddress(), amount);

    // Call transfer with empty arrays - should revert in original, but not in mutant
    await expect(
      instance.transfer(await token.getAddress(), [], [])
    ).to.be.reverted;
  });
});