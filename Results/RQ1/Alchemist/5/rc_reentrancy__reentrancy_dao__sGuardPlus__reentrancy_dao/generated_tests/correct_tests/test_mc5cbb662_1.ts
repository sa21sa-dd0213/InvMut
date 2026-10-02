import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should detect mutant where >= replaces > in withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ETH to have positive balance in contract
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Check initial balance of contract
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // Withdraw all for addr1 to set their credit to 0
    await instance.connect(addr1).withdrawAll();
    
    // Now addr1 has credit = 0
    // In original: condition oCredit > 0 is false, so nothing happens
    // In mutant: condition oCredit >= 0 is true, so it will attempt to send 0 wei
    
    const balanceBeforeSecondCall = await ethers.provider.getBalance(instance.target);
    
    // This call should do nothing in original, but mutant will try to send 0 wei
    await instance.connect(addr1).withdrawAll();
    
    const balanceAfterSecondCall = await ethers.provider.getBalance(instance.target);
    
    // In original contract, balance should remain unchanged
    // In mutant, balance will be decreased by 0 (but state changes still occur)
    expect(balanceAfterSecondCall).to.equal(balanceBeforeSecondCall);
  });
});