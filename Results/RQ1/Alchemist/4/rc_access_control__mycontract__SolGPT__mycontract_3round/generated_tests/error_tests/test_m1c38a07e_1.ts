import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant m1c38a07e", function () {
  it("should succeed when owner sends a positive amount to a valid receiver (kills mutant that requires amount < 0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send a small positive amount (1 wei) from owner to addr1
    // Original contract: require(amount > 0) passes
    // Mutant: require(amount < 0) fails, so this transaction would revert
    await expect(
      instance.connect(owner).sendTo(addr1.address, 1)
    ).to.not.be.reverted;
  });
});