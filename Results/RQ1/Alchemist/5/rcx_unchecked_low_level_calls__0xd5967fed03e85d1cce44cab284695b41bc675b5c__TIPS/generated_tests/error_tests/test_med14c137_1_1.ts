import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant med14c137 test", function () {
  it("should kill mutant by verifying revert when external call succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock token contract that implements transferFrom
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy();
    await token.waitForDeployment();

    // Deploy the demo contract
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: owner gives allowance to addr1 for tokens
    const amount = ethers.parseEther("100");
    await token.approve(addr1.address, amount);
    await token.mint(owner.address, amount);

    // addr1 calls transferFrom via demo contract - this should succeed in original
    const recipients = [addr2.address];

    // In original: call succeeds, returns true
    // In mutant: call always reverts due to if(true) condition
    await expect(
      instance.connect(addr1).transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});