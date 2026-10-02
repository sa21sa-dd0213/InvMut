import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb380d662 by verifying owner is set to passed address, not contract address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be deployer (msg.sender)
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a specific address different from contract address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // If mutant is killed, owner should be the passed address, not address(this)
    // Mutant sets owner = address(this), so this assertion will fail on mutant
    expect(await instance.owner()).to.equal(newOwner);
    
    // Also verify it's NOT the contract address (which mutant would set)
    expect(await instance.owner()).to.not.equal(await instance.getAddress());
  });
});