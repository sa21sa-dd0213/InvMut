import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - hasNoBalance modifier removal", function () {
  it("should revert on second airdrop call when user already has balance, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract first (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First airdrop call should succeed for addr1
    await instance.connect(addr1).airDrop();
    
    // Check that addr1 now has 20 tokens
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
    
    // Second airdrop call should revert in original (hasNoBalance check)
    // but will succeed in mutant (no balance check)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});