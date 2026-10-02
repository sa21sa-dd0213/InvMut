import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection test", function () {
  it("should kill mutant m366e8d53 by verifying setOwner updates owner to the correct address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with addr1's address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify owner is set to addr1, not address(0) (which the mutant would do)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});