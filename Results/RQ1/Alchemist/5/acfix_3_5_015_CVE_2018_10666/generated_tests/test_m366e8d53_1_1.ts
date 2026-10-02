import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - m366e8d53", function () {
  it("should set owner to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a valid non-zero address
    await instance.connect(owner).setOwner(addr1.address);

    // Verify owner is set to addr1, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});