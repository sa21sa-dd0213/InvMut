import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb1449ed7 by calling transfer with a single-element _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a single-element array of addresses to trigger the off-by-one bug
    const singleRecipient = [addr1.address];
    const value = ethers.parseEther("1.0");

    // This call should succeed on the original contract (loop: i=0, i < 1)
    // On the mutant (i <= 1), the second iteration accesses _tos[1] which is out of bounds, causing a revert
    await expect(
      instance.transfer(owner.address, addr2.address, singleRecipient, value)
    ).to.be.reverted;
  });
});