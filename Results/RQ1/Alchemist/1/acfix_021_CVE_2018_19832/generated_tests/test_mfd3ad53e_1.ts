import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant mfd3ad53e (transferOwnership)", function () {
  it("should transfer ownership to a new non-zero address, but mutant fails to update owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial owner
    const initialOwner = await instance.owner();

    // Call transferOwnership with a valid non-zero address
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Get the owner after the transfer
    const newOwner = await instance.owner();

    // In the original contract, ownership should transfer to addr1
    // In the mutant (if false), ownership remains the same (initialOwner)
    expect(newOwner).to.equal(addr1.address);
    expect(newOwner).to.not.equal(initialOwner);
  });
});