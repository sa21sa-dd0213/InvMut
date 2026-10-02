import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m36bf21ba by verifying transferOwnership correctly sets new owner, not contract itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Initially owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify owner is now addr1, NOT the contract itself
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
    expect(currentOwner).to.not.equal(contractAddress);
  });
});