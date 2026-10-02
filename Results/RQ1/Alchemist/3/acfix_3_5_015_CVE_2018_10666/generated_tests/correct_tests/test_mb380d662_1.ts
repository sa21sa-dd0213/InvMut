import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill mb380d662", function () {
  it("should detect mutant that sets owner to address(this) instead of _owner argument", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a specific address different from the contract itself
    const newOwner = addr1.address;
    const tx = await instance.connect(owner).setOwner(newOwner);
    await tx.wait();

    // Check that owner is set to the provided address, not the contract address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner);
    
    // Additional verification: ensure owner is NOT the contract address
    const contractAddress = await instance.getAddress();
    expect(currentOwner).to.not.equal(contractAddress);
  });
});