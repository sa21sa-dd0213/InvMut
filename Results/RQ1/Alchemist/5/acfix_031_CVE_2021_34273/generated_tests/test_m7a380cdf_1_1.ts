import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill m7a380cdf", function () {
  it("should update owner to the new address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy(); // Owned has no constructor arguments
    await instance.waitForDeployment();

    // Initially owner should be the deployer (msg.sender)
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with a non-zero address
    const newOwner = addr1.address;
    await instance.connect(owner).transferOwnership(newOwner);

    // In the original, owner becomes newOwner; in mutant, it becomes address(0)
    expect(await instance.owner()).to.equal(newOwner);
  });
});