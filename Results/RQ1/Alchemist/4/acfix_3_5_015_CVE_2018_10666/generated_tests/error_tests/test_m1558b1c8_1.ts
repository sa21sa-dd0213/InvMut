import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant detection - onlyAdmin modifier", function () {
  it("should allow admin to call setOwner and revert on mutant where != replaces ==", async function () {
    const [admin, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin should be able to set owner successfully in original
    await expect(instance.connect(admin).setOwner(addr1.address)).to.not.be.reverted;
    
    // Verify the owner was actually changed
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});