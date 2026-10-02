import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb380d662 by verifying owner is set to the passed address, not the contract itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be the deployer (msg.sender)
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a different address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original contract, owner becomes addr1
    // In the mutant, owner becomes the contract's own address
    // Assert that owner is addr1 (not the contract address) to kill the mutant
    expect(await instance.owner()).to.equal(addr1.address);
    expect(await instance.owner()).to.not.equal(await instance.getAddress());
  });
});