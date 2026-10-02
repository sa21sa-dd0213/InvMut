import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mb380d662", function () {
  it("should kill mutant by verifying setOwner assigns the provided address, not contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract's own address
    const contractAddress = await instance.getAddress();

    // Call setOwner with a different address (addr1)
    await instance.connect(owner).setOwner(addr1.address);

    // Check the owner was set to addr1, not the contract address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
    expect(currentOwner).to.not.equal(contractAddress);
  });
});