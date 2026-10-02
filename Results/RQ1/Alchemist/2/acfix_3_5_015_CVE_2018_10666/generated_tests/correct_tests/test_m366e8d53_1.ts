import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - m366e8d53", function () {
  it("should kill mutant by verifying owner is set to the passed address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a non-zero address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // Verify owner was set to the passed address (mutant would set it to address(0))
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner);
  });
});