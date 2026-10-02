import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendTo is called from an unauthorized address (mutant removal of owner check)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = unauthorized.address;
    const amount = ethers.parseEther("0.1");

    // Unauthorized address tries to call sendTo - should revert in original, but mutant removes the check
    await expect(
      instance.connect(unauthorized).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});