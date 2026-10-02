import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m574c1c9d", function () {
  it("should revert when calling airDrop through Bank due to sha256 vs keccak256 mismatch", async function () {
    // Deploy the Bank contract first
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Get the Bank contract as a signer to call airDrop
    const [bankSigner] = await ethers.getSigners();
    
    // Call airDrop through the Bank contract address
    // The supportsToken modifier will call Bank(msg.sender).supportsToken()
    // which returns keccak256("Nu Token"), but the mutant compares with sha256("Nu Token")
    // This should always revert
    await expect(
      modifierEntrancy.connect(bankSigner).airDrop()
    ).to.be.reverted;
  });
});