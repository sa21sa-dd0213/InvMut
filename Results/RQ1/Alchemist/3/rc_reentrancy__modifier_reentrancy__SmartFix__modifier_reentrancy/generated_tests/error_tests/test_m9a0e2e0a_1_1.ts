import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m9a0e2e0a test", function () {
  it("should detect removal of overflow check by causing arithmetic overflow", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Set attacker's token balance to max uint256 - 19
    // We need to directly manipulate storage since there's no setter function
    // Storage slot for mapping tokenBalance is slot 0 (first storage variable)
    // For mapping, the slot is keccak256(abi.encode(key, slot))
    const slot = ethers.toBeHex(0, 32);
    const key = ethers.toBeHex(attacker.address, 32);
    const storageSlot = ethers.keccak256(ethers.concat([key, slot]));
    
    // Set balance to type(uint256).max - 19 = 2^256 - 20
    const maxUint256 = ethers.MaxUint256;
    const targetBalance = maxUint256 - 19n;
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      storageSlot,
      ethers.toBeHex(targetBalance, 32)
    ]);
    
    // Verify the balance was set correctly
    expect(await instance.tokenBalance(attacker.address)).to.equal(targetBalance);
    
    // Now call airDrop from attacker - this should revert in original due to overflow check
    // In mutant, the require is removed, so it would proceed and overflow
    await expect(
      instance.connect(attacker).airDrop()
    ).to.be.reverted;
    
    // Verify balance did not change (transaction reverted)
    expect(await instance.tokenBalance(attacker.address)).to.equal(targetBalance);
  });
});