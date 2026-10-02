import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb380d662 by verifying setOwner sets the correct address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner from admin (owner) to set addr1 as new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify owner is set to addr1, not the contract address
    const contractAddress = await instance.getAddress();
    expect(await instance.owner()).to.equal(addr1.address);
    expect(await instance.owner()).to.not.equal(contractAddress);
  });
});