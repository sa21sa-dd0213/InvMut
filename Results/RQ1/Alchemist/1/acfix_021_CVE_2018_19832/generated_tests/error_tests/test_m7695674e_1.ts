import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - mutant m7695674e test", function () {
  it("should transfer ownership to a non-zero address in the original contract, but fail to do so in the mutant where condition is inverted", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial owner
    const initialOwner = await instance.owner();
    expect(initialOwner).to.equal(owner.address);

    // Transfer ownership to a non-zero address (addr1)
    await instance.connect(owner).transferOwnership(addr1.address);

    // Check if ownership changed to addr1
    const newOwner = await instance.owner();
    
    // In the original contract, ownership should be transferred to addr1
    // In the mutant, the condition `if (newOwner == address(0))` will be false
    // for non-zero addr1, so ownership will NOT be transferred and will remain with owner
    expect(newOwner).to.equal(addr1.address);
  });
});