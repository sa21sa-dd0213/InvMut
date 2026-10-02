import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill m78d256b5", function () {
  it("should kill mutant that replaces _newOwner with address(this)", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to newOwner
    await instance.transferOwnership(newOwner.address);

    // After transfer, owner should be newOwner, NOT the contract itself
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner.address);
    expect(currentOwner).to.not.equal(await instance.getAddress());
  });
});