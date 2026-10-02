import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test", function () {
  it("should revert when calling sendTo with a non-zero receiver address (mutant changes != to == for address(0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");

    // In the original, this call would succeed (receiver != address(0)).
    // In the mutant, this call reverts because the condition now requires receiver == address(0).
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});