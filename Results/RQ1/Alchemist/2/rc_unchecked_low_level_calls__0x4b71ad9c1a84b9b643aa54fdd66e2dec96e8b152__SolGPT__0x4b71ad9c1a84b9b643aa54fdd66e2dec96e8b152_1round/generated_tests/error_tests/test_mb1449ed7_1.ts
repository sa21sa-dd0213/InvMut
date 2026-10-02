import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb1449ed7: test that a single recipient reverts when using <= in loop", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use for the transferFrom test
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);

    // Set up: single recipient in array
    const recipients = [addr1.address];
    const value = ethers.parseEther("10");

    // Call transfer with single recipient - should fail on mutant (out-of-bounds)
    await expect(
      instance.connect(owner).transfer(owner.address, await token.getAddress(), recipients, value)
    ).to.be.reverted;
  });
});