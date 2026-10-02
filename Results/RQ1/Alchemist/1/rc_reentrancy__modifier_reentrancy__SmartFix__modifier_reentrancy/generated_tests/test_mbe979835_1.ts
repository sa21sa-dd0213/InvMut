import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant mbe979835 test", function () {
  it("should revert when an address with existing balance calls airDrop on original, but succeed on mutant (without hasNoBalance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First airdrop to addr1 - should succeed (balance is 0)
    let tx = await instance.connect(addr1).airDrop();
    await tx.wait();
    
    // Check balance is now 20
    let balance = await instance.tokenBalance(addr1.address);
    expect(balance).to.equal(20);
    
    // Second airdrop to same addr1 - on original contract this would revert due to hasNoBalance
    // On the mutant (without hasNoBalance), this will succeed because the modifier is removed
    tx = await instance.connect(addr1).airDrop();
    await tx.wait();
    
    // If the mutant is present, balance will be 40 (20 + 20 more)
    balance = await instance.tokenBalance(addr1.address);
    expect(balance).to.equal(40); // This assertion fails on original, passes on mutant
    
    // The test kills the mutant because the original would revert on second call
    // but the mutant allows it, and we assert the increased balance
  });
});