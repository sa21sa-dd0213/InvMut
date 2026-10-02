import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mf51ce9e7", function () {
  it("should detect mutant by verifying loop execution when array has elements", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the from address matches the deployer (owner)
    expect(await instance.from()).to.equal(owner.address);
    
    // Create test addresses and values
    const tos = [addr1.address, addr2.address];
    const values = [1, 2];
    
    // Call transfer function - it should succeed and make internal calls
    const tx = await instance.connect(owner).transfer(tos, values);
    const receipt = await tx.wait();
    
    // The original contract should execute the loop and make internal calls
    // The mutant with i > _tos.length would skip the loop entirely
    // We verify this by checking that the transaction used gas (mutant would use less gas)
    expect(receipt.gasUsed).to.be.gt(0);
    
    // For the mutant, the loop condition i > _tos.length is false when i=0 and _tos.length=2
    // So no internal calls happen - we can verify this by checking no events were emitted
    // (the contract doesn't emit events, so we check that the from address still matches)
    // A more direct test: call transfer again with empty array to compare gas usage patterns
    const emptyTos = [];
    const emptyValues = [];
    const txEmpty = await instance.connect(owner).transfer(emptyTos, emptyValues);
    const receiptEmpty = await txEmpty.wait();
    
    // With the mutant, both calls would use similar gas (both skip loop)
    // With original, the non-empty call uses more gas (loop executes)
    // We can detect the mutant by checking that the non-empty call used more gas than empty call
    expect(receipt.gasUsed).to.be.gt(receiptEmpty.gasUsed);
  });
});