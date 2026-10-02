import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m366e8d53: setOwner must set owner to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a non-zero address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Assert that owner is set to the provided address, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});