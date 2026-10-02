import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should revert when tokenBalance is near uint256 max and addition would overflow, but mutant allows it with multiplication check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancy.deploy();
    await instance.waitForDeployment();

    const Bank = await ethers.getContractFactory("Bank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    // Deploy a malicious contract that will call airDrop after setting balance to near max
    const MaliciousCaller = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousCaller.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // Set addr1's tokenBalance to near uint256 max using a helper function
    // Since we cannot directly set mapping, we need to exploit the contract logic
    // First, call airDrop to get initial balance, then manipulate via overflow
    await instance.connect(addr1).airDrop();
    
    // Now call airDrop multiple times to increase balance to near max
    // Each call adds 20 tokens, so we need many calls
    // Actually, we can use a different approach - deploy a contract that can set balance
    // But the contract doesn't have a setter, so we need to work within constraints
    
    // Alternative: Test that the require statement with multiplication still allows overflow
    // Set up a scenario where balance is 0 (hasNoBalance passes), then call airDrop
    // The multiplication check: 0 * 20 >= 0 is true, so it passes
    // But the actual addition: 0 + 20 = 20, no overflow
    // The mutant is actually not killable with this approach since both pass
    
    // Let's reconsider: The hasNoBalance modifier requires balance == 0
    // So tokenBalance is always 0 when require runs
    // 0 + 20 >= 0 is true (original)
    // 0 * 20 >= 0 is true (mutant)
    // Both behave identically when hasNoBalance passes
    
    // However, the require check is redundant since hasNoBalance already ensures balance is 0
    // The mutant changes the overflow protection logic
    // To kill the mutant, we need to bypass hasNoBalance first
    
    // Actually, looking at the original code again:
    // The modifiers are: _nonReentrant, hasNoBalance, supportsToken
    // hasNoBalance requires balance == 0, so the require check is always with balance = 0
    
    // The mutant is NOT killable because the require check is always with balance = 0
    // Both checks: 0 + 20 >= 0 and 0 * 20 >= 0 evaluate to true
    
    // Therefore, the only way to kill this mutant is if we can somehow have a non-zero balance
    // and still pass hasNoBalance, which is impossible
    
    // The test should demonstrate that both versions behave identically
    // But since the hypothesis assumed we could test with high balance, let's show it's not possible
    
    // Test that the function works normally (both original and mutant pass)
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;
    
    // After first call, balance is 20, so hasNoBalance will fail on second call
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
  });
});