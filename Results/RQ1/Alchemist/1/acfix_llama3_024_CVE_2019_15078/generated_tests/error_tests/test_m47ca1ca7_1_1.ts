import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m47ca1ca7 by calling approve with non-zero value for spender with zero existing allowance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 approves addr2 with a non-zero value when addr2 has no existing allowance
    // In the original contract, this should return true because the condition
    // _value != 0 && allowed[msg.sender][_spender] != 0 evaluates to false
    // (existing allowance is 0), so it proceeds to set allowance and return true.
    // In the mutant, it always returns false, killing the test.
    const approveAmount = ethers.parseEther("100");
    const result = await instance.connect(addr1).approve(addr2.address, approveAmount);
    
    // Wait for the transaction to be mined
    await result.wait();
    
    // Verify the allowance was actually set (original behavior)
    const allowance = await instance.allowance(addr1.address, addr2.address);
    expect(allowance).to.equal(approveAmount);
  });
});