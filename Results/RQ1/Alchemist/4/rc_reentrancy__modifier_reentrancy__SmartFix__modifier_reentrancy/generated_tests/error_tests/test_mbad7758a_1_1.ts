import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should revert when non-Bank contract calls airDrop", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // addr1 is a regular EOA, not a Bank contract
    // Calling airDrop from addr1 should revert because supportsToken modifier checks msg.sender is a Bank
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});