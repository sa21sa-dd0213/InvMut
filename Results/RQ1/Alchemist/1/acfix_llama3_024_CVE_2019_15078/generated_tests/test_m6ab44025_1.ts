import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - approve function", function () {
  it("should allow setting non-zero allowance when current allowance is zero (detects && vs || mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial allowance is zero
    const initialAllowance = await instance.allowance(owner.address, addr1.address);
    expect(initialAllowance).to.equal(0);

    // Attempt to approve a non-zero amount when current allowance is zero
    // Original contract: _value != 0 (true) && allowed[msg.sender][_spender] != 0 (false) => false, so it proceeds
    // Mutant contract: _value != 0 (true) || allowed[msg.sender][_spender] != 0 (false) => true, so it returns false (reverts)
    const approveAmount = ethers.parseEther("100");
    const tx = instance.connect(owner).approve(addr1.address, approveAmount);
    
    // On the original contract, this should succeed
    // On the mutant, this should revert because the OR condition evaluates to true
    await expect(tx).to.not.be.reverted;
    
    // Verify allowance was set correctly
    const finalAllowance = await instance.allowance(owner.address, addr1.address);
    expect(finalAllowance).to.equal(approveAmount);
  });
});