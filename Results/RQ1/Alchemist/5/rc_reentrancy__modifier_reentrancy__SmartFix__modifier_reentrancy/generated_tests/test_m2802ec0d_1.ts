import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - m2802ec0d", function () {
  it("should revert on second airdrop call due to arithmetic mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Bank contract to satisfy the supportsToken modifier
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // First airdrop call from addr1 - should succeed on original
    await instance.connect(addr1).airDrop();
    
    // Verify balance is now 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
    
    // Second airdrop call - should revert on mutant due to (tokenBalance[msg.sender] - 20) >= tokenBalance[msg.sender]
    // being false (0 >= 20 is false), but pass on original
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});