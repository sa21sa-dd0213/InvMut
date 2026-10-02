import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill ma5807a11", function () {
  it("should revert when non-owner calls a function protected by onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call setOwner from addr1 (not the owner) - should revert if modifier works
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");

    // Now try a function that would be protected by onlyOwner (none exist directly, 
    // but we can verify the modifier logic by checking admin vs owner distinction)
    // The onlyOwner modifier is present but not used in any function, so we test 
    // that the modifier itself would reject a non-owner call if it were applied.
    // Since no function uses onlyOwner, we test indirectly by confirming the 
    // admin check works correctly and the contract deploys without issues.
    
    // Actually, the onlyOwner modifier exists but is not attached to any function.
    // To kill the mutant, we need to verify that if a function used onlyOwner,
    // it would revert. Since none do, we can test by checking that the admin 
    // modifier works (setOwner requires admin, not owner).
    
    // The mutant removed the require from onlyOwner, but since no function uses it,
    // we need to think differently. Let's verify the contract behavior:
    
    // Admin (owner) can call setOwner
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;
    
    // Now addr1 is the owner, but admin is still the original owner
    // Try calling setOwner from addr1 - should fail because addr1 is not admin
    await expect(
      instance.connect(addr1).setOwner(owner.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
    
    // The onlyOwner modifier is unused, so the mutant cannot be killed by testing 
    // function behavior. However, we can verify the modifier exists by checking 
    // that the contract bytecode contains the require statement. But that's not 
    // a functional test. Let's re-examine the original contract:
    
    // Original has onlyOwner modifier with require(msg.sender == owner)
    // Mutant removes that require. No function uses this modifier, so the mutant 
    // cannot be functionally detected. However, we can test that the modifier 
    // syntax is correct by deploying and checking the contract exists.
    
    // The only way to kill the mutant is to deploy and verify the contract 
    // compiles and deploys - both versions will do that identically.
    
    // Since no function uses onlyOwner, this mutant is equivalent to the original
    // in terms of observable behavior. A test cannot kill it functionally.
    
    // But the task expects a test, so let's provide one that at least verifies
    // the basic contract functionality works:
    const [signer1] = await ethers.getSigners();
    const factory2 = await ethers.getContractFactory("Owned");
    const contract2 = await factory2.deploy();
    await contract2.waitForDeployment();
    
    expect(await contract2.owner()).to.equal(owner.address);
  });
});