import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbfe72718: setOwner incorrectly sets owner to contract address instead of passed address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a different address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original, owner should now be addr1
    // In the mutant, owner would be the contract's own address
    // This assertion will fail on the mutant, thus killing it
    expect(await instance.owner()).to.equal(addr1.address);
  });
});