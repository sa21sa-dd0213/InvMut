import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - mb1449ed7", function () {
  it("should revert when _tos has exactly one element due to off-by-one error in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: mint tokens to owner and approve the airPort contract to spend them
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.approve(await instance.getAddress(), amount);

    // Create array with exactly one recipient
    const recipients = [owner.address];

    // The original contract should succeed with one recipient
    // The mutant will try to access _tos[1] and revert
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});