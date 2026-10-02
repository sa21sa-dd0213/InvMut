import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - kill mutant m647242dd (missing supportsToken modifier)", function () {
  it("should revert when called from an EOA without the supportsToken modifier, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();
    
    // Deploy Bank contract for later comparison
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Test: Call airDrop from EOA (addr1) - should revert on original, succeed on mutant
    // The supportsToken modifier requires msg.sender to be a Bank contract returning the correct hash
    // An EOA will fail this check, so the original contract reverts
    // The mutant removes this modifier, so it will not revert
    await expect(
      modEntrancy.connect(addr1).airDrop()
    ).to.be.reverted;
    
    // Verify the balance was NOT updated (original behavior)
    expect(await modEntrancy.tokenBalance(addr1.address)).to.equal(0);
  });
});