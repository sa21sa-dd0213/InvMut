import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - DrugDealer access control test", function () {
  it("should prevent unauthorized users from changing ceoAddress via DrugDealer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for EtherCartel)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original ceoAddress
    const originalCeo = await instance.ceoAddress();
    
    // Attempt to call DrugDealer from an unauthorized address (addr1)
    // This should revert in the original contract but succeed in the mutant
    await expect(
      instance.connect(addr1).DrugDealer()
    ).to.be.revertedWith("Only CEO can set new address");
    
    // Verify ceoAddress remains unchanged
    const ceoAfterAttempt = await instance.ceoAddress();
    expect(ceoAfterAttempt).to.equal(originalCeo);
    
    // Verify that the owner (CEO) can still call it successfully
    await instance.connect(owner).DrugDealer();
    const ceoAfterOwnerCall = await instance.ceoAddress();
    expect(ceoAfterOwnerCall).to.equal(owner.address);
  });
});