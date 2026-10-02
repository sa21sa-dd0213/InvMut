import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb1449ed7 by triggering out-of-bounds access on single-element array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a single-element array of addresses
    const recipients = [addr2.address];

    // Attempt to transfer with a single recipient
    // The original contract loops i < _tos.length (0 < 1) -> one iteration, passes
    // The mutant loops i <= _tos.length (0 <= 1, then 1 <= 1) -> two iterations
    // Second iteration tries _tos[1] which is out of bounds, causing revert
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});