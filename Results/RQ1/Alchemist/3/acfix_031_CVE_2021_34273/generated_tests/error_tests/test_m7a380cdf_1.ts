import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m7a380cdf by verifying transferOwnership sets owner to newOwner, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // In the original contract, owner becomes addr1.address
    // In the mutant, owner becomes address(0)
    // So asserting owner equals addr1.address will fail on the mutant
    expect(await instance.owner()).to.equal(addr1.address);
  });
});