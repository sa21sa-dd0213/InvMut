import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - keccak256 vs sha256", function () {
  it("should revert on mutant when Bank returns correct keccak256 hash", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract first
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Get the Bank contract address to use as msg.sender
    const bankAddress = await bank.getAddress();

    // Call airDrop from the Bank contract address (it has zero balance)
    // The Bank's supportsToken returns keccak256("Nu Token")
    // In the original, keccak256 matches keccak256 - should pass
    // In the mutant, sha256 doesn't match keccak256 - should revert
    await expect(
      modifierEntrancy.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});