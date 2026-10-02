import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - kill mutant m574c1c9d (sha256 instead of keccak256)", function () {
  it("should revert when calling airDrop because sha256 hash does not match keccak256 from Bank", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Bank contract first
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Call airDrop from the Bank contract address (msg.sender = Bank)
    // The Bank contract returns keccak256("Nu Token") but the mutant uses sha256
    // This should revert due to hash mismatch
    await expect(
      instance.connect(bank).airDrop()
    ).to.be.reverted;
  });
});