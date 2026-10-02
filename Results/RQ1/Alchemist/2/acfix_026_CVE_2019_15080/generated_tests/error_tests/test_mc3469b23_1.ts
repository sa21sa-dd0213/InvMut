import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (detect mutant removing onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Non-owner attempts to transfer ownership
    // In original contract this should revert due to onlyOwner modifier
    // In mutant it will succeed, which we detect by checking owner changed
    const tx = instance.connect(addr1).transferOwnership(addr2.address);
    
    // If the mutant is live, the transaction will NOT revert, and owner will change
    // If the original is live, the transaction WILL revert
    // We expect revert for the original; the mutant will pass this transaction
    await expect(tx).to.be.revertedWith("");

    // Additionally, verify owner has not changed (only relevant if original)
    expect(await instance.owner()).to.equal(owner.address);
  });
});