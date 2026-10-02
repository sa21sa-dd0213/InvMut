import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - supportsToken hash mismatch", function () {
  it("should revert when calling airDrop() with a legitimate Bank contract because sha256 is used instead of keccak256", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract (no constructor arguments needed)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero token balance, so hasNoBalance modifier passes
    // addr1 calls airDrop() via the Bank contract address (msg.sender will be bank)
    // The supportsToken modifier will compare sha256("Nu Token") with Bank's keccak256("Nu Token")
    // These will never match, so the transaction should revert
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});