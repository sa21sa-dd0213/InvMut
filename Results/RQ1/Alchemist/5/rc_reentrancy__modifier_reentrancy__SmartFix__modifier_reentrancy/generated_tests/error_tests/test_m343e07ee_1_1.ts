import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - supportsToken modifier", function () {
  it("should kill mutant m343e07ee by calling airDrop from a Bank contract that returns the correct supportsToken hash", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract first (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Get the bank's address as a signer to call airDrop
    const bankSigner = await ethers.getSigner(await bank.getAddress());

    // On the original contract, this should succeed because Bank(msg.sender).supportsToken() matches
    // On the mutant (where == is changed to !=), this should revert because the hash matches (failing the != check)
    await expect(
      modifierEntrancy.connect(bankSigner).airDrop()
    ).to.be.reverted;
  });
});