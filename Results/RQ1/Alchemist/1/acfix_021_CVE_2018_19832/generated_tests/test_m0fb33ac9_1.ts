import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test", function () {
  it("should detect the mutant by checking allowance after partial transfer with non-multiple values", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribute tokens to owner so they can approve
    await instance.connect(owner).NETM();
    
    // Owner approves spender to spend 10 tokens
    const approveAmount = ethers.parseEther("10");
    await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Check initial allowance
    const initialAllowance = await instance.allowance(owner.address, spender.address);
    expect(initialAllowance).to.equal(approveAmount);
    
    // Spender transfers 3 tokens from owner to recipient
    const transferAmount = ethers.parseEther("3");
    await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);
    
    // Check remaining allowance
    // Original: 10 - 3 = 7
    // Mutant: 10 / 3 = 3 (integer division)
    const remainingAllowance = await instance.allowance(owner.address, spender.address);
    expect(remainingAllowance).to.equal(ethers.parseEther("7"));
    
    // Verify the spender can still transfer the correct remaining amount
    // In the mutant, remaining would be 3 instead of 7, so this would fail
    const secondTransferAmount = ethers.parseEther("4");
    await instance.connect(spender).transferFrom(owner.address, recipient.address, secondTransferAmount);
    
    // After second transfer in original: 7 - 4 = 3
    // In mutant: 3 / 4 = 0 (integer division truncates)
    const finalAllowance = await instance.allowance(owner.address, spender.address);
    expect(finalAllowance).to.equal(ethers.parseEther("3"));
  });
});